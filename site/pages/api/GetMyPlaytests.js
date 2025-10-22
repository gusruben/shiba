import { safeEscapeFormulaString } from './utils/security.js';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appg245A41MWc6Rej';
const AIRTABLE_USERS_TABLE = process.env.AIRTABLE_USERS_TABLE || 'Users';
const AIRTABLE_PLAYTESTS_TABLE = process.env.AIRTABLE_PLAYTESTS_TABLE || 'PlaytestTickets';
const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';

export default async function handler(req, res) {
  // Add cache-busting headers
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  if (!AIRTABLE_API_KEY) {
    return res.status(500).json({ message: 'Server configuration error' });
  }

  const { token } = req.body || {};
  if (!token) {
    return res.status(400).json({ message: 'Missing required field: token' });
  }

  try {
    // Find user by token
    const user = await findUserByToken(token);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // console.log('Found user:', user.id);

    // Get playtests for this user
    const playtests = await getPlaytestsForUser(user.id);
    
    // console.log('Found playtests:', playtests);
    
    return res.status(200).json({ 
      ok: true, 
      playtests,
      timestamp: Date.now() // Cache-busting timestamp
    });
  } catch (error) {
    console.error('GetMyPlaytests error:', error);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
}

async function airtableRequest(path, options = {}) {
  const url = `${AIRTABLE_API_BASE}/${AIRTABLE_BASE_ID}/${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Airtable error ${response.status}: ${text}`);
  }
  
  return response.json();
}

async function findUserByToken(token) {
  const tokenEscaped = safeEscapeFormulaString(token);
  const params = new URLSearchParams({
    filterByFormula: `{token} = "${tokenEscaped}"`,
    pageSize: '1',
  });
  
  const data = await airtableRequest(`${encodeURIComponent(AIRTABLE_USERS_TABLE)}?${params.toString()}`, {
    method: 'GET',
  });
  
  return (data.records && data.records[0]) || null;
}

async function getAllRecordsWithPagination(tableName, filterFormula = null) {
  let allRecords = [];
  let offset = null;
  
  do {
    const params = new URLSearchParams();
    if (filterFormula) {
      params.set('filterByFormula', filterFormula);
    }
    if (offset) {
      params.set('offset', offset);
    }
    
    const data = await airtableRequest(`${encodeURIComponent(tableName)}?${params.toString()}`, {
      method: 'GET',
    });
    
    if (data.records) {
      allRecords = allRecords.concat(data.records);
    }
    
    offset = data.offset;
    // console.log(`Fetched ${data.records?.length || 0} records, total so far: ${allRecords.length}, has more: ${!!offset}`);
  } while (offset);
  
  return allRecords;
}

async function getPlaytestsForUser(userId) {
  const userEscaped = safeEscapeFormulaString(userId);
  let records = [];
  
  // Try Method 1: FIND with ARRAYJOIN (most reliable for linked records)
  try {
    const filterFormula = `FIND("${userEscaped}", ARRAYJOIN({Player}))`;
    records = await getAllRecordsWithPagination(AIRTABLE_PLAYTESTS_TABLE, filterFormula);
    if (records.length > 0) {
      return await formatPlaytestRecords(records);
    }
  } catch (error) {
    console.error('GetMyPlaytests Method 1 failed:', error.message);
  }
  
  // Try Method 2: Direct comparison (works if Player field is single value)
  try {
    const filterFormula = `{Player} = "${userEscaped}"`;
    records = await getAllRecordsWithPagination(AIRTABLE_PLAYTESTS_TABLE, filterFormula);
    if (records.length > 0) {
      return await formatPlaytestRecords(records);
    }
  } catch (error) {
    console.error('GetMyPlaytests Method 2 failed:', error.message);
  }
  
  // Method 3: Fetch all and filter client-side (fallback)
  try {
    const allRecords = await getAllRecordsWithPagination(AIRTABLE_PLAYTESTS_TABLE);
    records = allRecords.filter(record => {
      const player = record.fields.Player;
      if (Array.isArray(player)) {
        return player.includes(userId);
      } else if (typeof player === 'string') {
        return player === userId;
      }
      return false;
    });
    
    if (records.length > 0) {
      return await formatPlaytestRecords(records);
    }
  } catch (error) {
    console.error('GetMyPlaytests Method 3 failed:', error.message);
  }
  
  return [];
}

async function formatPlaytestRecords(records) {
  if (!records || records.length === 0) {
    return [];
  }
  
  // Map playtest records directly - no more nested lookups!
  return records.map((playtest) => {
    const fields = playtest.fields;
    
    // GameToTest is a linked record field (array of record IDs)
    const gameToTestId = Array.isArray(fields.GameToTest) ? fields.GameToTest[0] : fields.GameToTest;
    
    // All these fields are now direct fields in PlaytestTickets (not lookups)
    // Handle arrays from computed/lookup fields - take first element if array
    const gameName = Array.isArray(fields['Game Name']) ? fields['Game Name'][0] : (fields['Game Name'] || '');
    const gameLink = Array.isArray(fields.gameLink) ? fields.gameLink[0] : (fields.gameLink || '');
    const gameThumbnail = Array.isArray(fields.gameThumbnail) ? fields.gameThumbnail[0] : (fields.gameThumbnail || '');
    const gameAnimatedBackground = Array.isArray(fields.gameAnimatedBackground) ? fields.gameAnimatedBackground[0] : (fields.gameAnimatedBackground || '');
    const ownerSlackId = Array.isArray(fields.ownerSlackId) ? fields.ownerSlackId[0] : (fields.ownerSlackId || '');
    
    return {
      id: playtest.id,
      playtestId: fields.PlaytestId || '',
      gameToTest: gameToTestId || '',
      status: fields.status || 'Pending',
      createdAt: fields['Created At'] || playtest.createdTime,
      instructions: fields.Instructions || '',
      gameName,
      gameLink,
      gameThumbnail,
      gameAnimatedBackground,
      ownerSlackId,
      HoursSpent: fields.HoursSpent || 0,
      // Rating data for completed playtests
      funScore: fields['Fun Score'] || 0,
      artScore: fields['Art Score'] || 0,
      creativityScore: fields['Creativity Score'] || 0,
      audioScore: fields['Audio Score'] || 0,
      moodScore: fields['Mood Score'] || 0,
      feedback: fields.Feedback || '',
      playtimeSeconds: fields['Playtime Seconds'] || 0,
    };
  });
}
