import { safeEscapeFormulaString } from './utils/security.js';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appg245A41MWc6Rej';
const AIRTABLE_USERS_TABLE = process.env.AIRTABLE_USERS_TABLE || 'Users';
const AIRTABLE_CAMP_TABLE = process.env.AIRTABLE_CAMP_TABLE || 'Camp';
const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';

export default async function handler(req, res) {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  if (!AIRTABLE_API_KEY) {
    return res.status(500).json({ message: 'Server configuration error' });
  }

  // Validate request body
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ message: 'Invalid request body' });
  }

  const { token } = req.body;

  // Validate token
  if (!token || typeof token !== 'string' || token.trim() === '') {
    return res.status(400).json({ message: 'Valid token is required' });
  }

  // Sanitize token length
  if (token.length > 1000) {
    return res.status(400).json({ message: 'Invalid token format' });
  }

  try {
    // Find user by token
    const userRecord = await findUserByToken(token);
    if (!userRecord) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const userId = userRecord.id;

    // Get all camps and filter them in JavaScript
    // Airtable formulas with linked records can be tricky, so we'll filter client-side
    const data = await airtableRequest(
      `${encodeURIComponent(AIRTABLE_CAMP_TABLE)}`,
      { method: 'GET' }
    );

    const allCamps = data.records || [];
    
    // Filter camps where user is either organizer or camper
    const camps = allCamps.filter(camp => {
      const organizers = camp.fields?.Organizer || [];
      const campers = camp.fields?.Campers || [];
      return organizers.includes(userId) || campers.includes(userId);
    });

    // Return the first camp found, or null if no camps
    if (camps.length > 0) {
      const camp = camps[0];
      return res.status(200).json({
        ok: true,
        camp: {
          id: camp.id,
          name: camp.fields?.Name || '',
          organizer: camp.fields?.Organizer || [],
          campers: camp.fields?.Campers || [],
        }
      });
    } else {
      return res.status(200).json({
        ok: true,
        camp: null
      });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('getMyCampground error:', error);
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
  if (!token || typeof token !== 'string') return null;

  try {
    const escapedToken = safeEscapeFormulaString(token);
    const formula = `{token} = "${escapedToken}"`;
    const params = new URLSearchParams({
      filterByFormula: formula,
      pageSize: '1',
    });

    const data = await airtableRequest(
      `${encodeURIComponent(AIRTABLE_USERS_TABLE)}?${params.toString()}`,
      { method: 'GET' }
    );

    const record = data.records && data.records[0];
    return record || null;
  } catch (e) {
    console.error('Error finding user by token:', e);
    return null;
  }
}

