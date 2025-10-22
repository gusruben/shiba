import { safeEscapeFormulaString } from './utils/security.js';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appg245A41MWc6Rej';
const AIRTABLE_USERS_TABLE = process.env.AIRTABLE_USERS_TABLE || 'Users';
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
  
  // Validate token format
  if (!token || typeof token !== 'string' || token.trim() === '') {
    return res.status(400).json({ message: 'Valid token is required' });
  }

  // Sanitize token length (prevent extremely long tokens)
  if (token.length > 1000) {
    return res.status(400).json({ message: 'Invalid token format' });
  }

  try {
    // Find user by token
    const user = await findUserByToken(token);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const slackId = user.fields?.['slack id'];
    const xpEarned = user.fields?.['XP-Earned'] || 0;
    
    if (!slackId || typeof slackId !== 'string') {
      return res.status(200).json({ 
        slackId: '', 
        image: '', 
        displayName: '',
        xpEarned: xpEarned
      });
    }

    // Validate slackId format before making external request
    if (!/^[A-Za-z0-9_-]{1,50}$/.test(slackId)) {
      return res.status(400).json({ message: 'Invalid Slack ID format' });
    }

    // Fetch Slack profile data using the same pattern as slackProfiles.js
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`https://cachet.dunkirk.sh/users/${encodeURIComponent(slackId)}`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Shiba-Arcade/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const profileData = await response.json().catch(() => ({}));
      
      // Sanitize response data
      const sanitizedImage = typeof profileData.imageUrl === 'string' && profileData.imageUrl.startsWith('http') 
        ? profileData.imageUrl 
        : '';
      const sanitizedDisplayName = typeof profileData.displayName === 'string' 
        ? profileData.displayName.slice(0, 100) // Limit display name length
        : '';
      
      return res.status(200).json({
        slackId: slackId,
        image: sanitizedImage,
        displayName: sanitizedDisplayName,
        xpEarned: xpEarned
      });
    } catch (fetchError) {
      if (fetchError.name === 'AbortError') {
        console.error('Timeout fetching Slack profile for:', slackId);
      } else {
        console.error('Error fetching Slack profile:', fetchError);
      }
      return res.status(200).json({
        slackId: slackId,
        image: '',
        displayName: '',
        xpEarned: xpEarned
      });
    }
  } catch (e) {
    console.error('getMySlackProfile error:', e);
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
    },
  });
  return response;
}

async function findUserByToken(token) {
  if (!token || typeof token !== 'string') return null;
  
  try {
    const escapedToken = safeEscapeFormulaString(token);
    const response = await airtableRequest(
      `${encodeURIComponent(AIRTABLE_USERS_TABLE)}?filterByFormula=${encodeURIComponent(`{Token}="${escapedToken}"`)}`
    );
    
    if (!response.ok) return null;
    const data = await response.json();
    return data.records && data.records.length > 0 ? data.records[0] : null;
  } catch (e) {
    console.error('Error finding user by token:', e);
    return null;
  }
}
