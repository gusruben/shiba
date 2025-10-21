import { safeEscapeFormulaString } from './utils/security.js';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appg245A41MWc6Rej';
const AIRTABLE_USERS_TABLE = process.env.AIRTABLE_USERS_TABLE || 'Users';
const AIRTABLE_ORDERS_TABLE = process.env.AIRTABLE_ORDERS_TABLE || 'Orders';
const AIRTABLE_SHOP_ITEMS_TABLE = process.env.AIRTABLE_SHOP_ITEMS_TABLE || 'Shop';
const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';

export default async function handler(req, res) {
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

    // Get orders for this user
    const orders = await getOrdersForUser(user.id);
    
    // console.log('Found orders:', orders);
    
    return res.status(200).json({ ok: true, orders });
  } catch (error) {
    console.error('GetMyOrders error:', error);
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

async function getOrdersForUser(userId) {
  const userEscaped = safeEscapeFormulaString(userId);
  // console.log('Looking for orders for user:', userId);
  
  let records = [];
  
  // Method 1: Try direct comparison with the linked record
  try {
    const filterFormula = `{Spent By} = "${userEscaped}"`;
    // console.log('Trying filter formula 1:', filterFormula);
    
    records = await getAllRecordsWithPagination(AIRTABLE_ORDERS_TABLE, filterFormula);
    // console.log('Method 1 results:', records.length);
  } catch (error) {
    // console.log('Method 1 failed:', error.message);
  }
  
  // If that doesn't work, try method 2
  if (records.length === 0) {
    try {
      const filterFormula = `FIND("${userEscaped}", ARRAYJOIN({Spent By}))`;
      // console.log('Trying filter formula 2:', filterFormula);
      
      records = await getAllRecordsWithPagination(AIRTABLE_ORDERS_TABLE, filterFormula);
      // console.log('Method 2 results:', records.length);
    } catch (error) {
      // console.log('Method 2 failed:', error.message);
    }
  }
  
  // If still no results, try method 3 - get all and filter client-side
  if (records.length === 0) {
    try {
      // console.log('Falling back to client-side filtering...');
      const allRecords = await getAllRecordsWithPagination(AIRTABLE_ORDERS_TABLE);
      // console.log('Got all records:', allRecords.length);
      
      records = allRecords.filter(record => {
        const spentBy = record.fields['Spent By'];
        // Handle both array and single value cases
        if (Array.isArray(spentBy)) {
          return spentBy.includes(userId);
        } else if (typeof spentBy === 'string') {
          return spentBy === userId;
        }
        return false;
      });
      
      // console.log('Method 3 (client-side) results:', records.length);
    } catch (error) {
      // console.log('Method 3 failed:', error.message);
    }
  }
  
  if (!records || records.length === 0) {
    // console.log('No orders found for user');
    return [];
  }
  
  // Get shop item details for each order
  const ordersWithDetails = await Promise.all(
    records.map(async (order) => {
      const shopItemId = order.fields['Shop Item']?.[0];
      let shopItemName = 'Unknown Item';
      let shopItemThumbnail = '/comingSoon.png';
      
      // Check if we already have the shop item name from a lookup field
      if (order.fields['ShopItemName'] && Array.isArray(order.fields['ShopItemName'])) {
        shopItemName = order.fields['ShopItemName'][0] || 'Unknown Item';
      }
      
      // Check if we already have the shop item thumbnail from a lookup field
      if (order.fields['ShopItemThumbnail'] && Array.isArray(order.fields['ShopItemThumbnail'])) {
        // It's a lookup field that returns an array of attachment objects
        const thumbnailField = order.fields['ShopItemThumbnail'][0];
        if (thumbnailField?.url) {
          shopItemThumbnail = thumbnailField.url;
        }
      }
      
      // Check if we already have the shop item cost from a lookup field
      let shopItemCost = 0;
      if (order.fields['ShopItemCost'] && Array.isArray(order.fields['ShopItemCost'])) {
        shopItemCost = order.fields['ShopItemCost'][0] || 0;
      }
      
      // console.log('Order fields:', JSON.stringify(order.fields, null, 2));
      
      return {
        id: order.id,
        orderId: order.fields.OrderID || '',
        status: order.fields.Status || 'Unfulfilled',
        shopItemName: shopItemName,
        shopItemThumbnail: shopItemThumbnail,
        amountSpent: shopItemCost || order.fields['Amount Spent'] || 0,
        createdAt: order.fields['Created At'] || order.createdTime,
      };
    })
  );
  
  return ordersWithDetails;
}
