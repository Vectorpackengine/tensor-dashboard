const fetch = require('node-fetch');

const TAOSTATS_AUTH = 'tao-20fddd35-30ac-4494-9b8e-dc741419b197:2c429125';

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 30000; // 30 seconds

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { netuid = '70' } = req.query;
  const cacheKey = `metagraph-${netuid}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return res.json(cached.data);
  }

  try {
    const response = await fetch(
      `https://api.taostats.io/api/metagraph/latest/v1?netuid=${netuid}`,
      {
        headers: { 'Authorization': TAOSTATS_AUTH }
      }
    );

    if (response.status === 429) {
      return res.status(429).json({ error: 'API rate limit exceeded. Please try again later.' });
    }

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return res.json(data);
  } catch (error) {
    console.error('Error fetching metagraph data:', error);
    return res.status(500).json({ error: error.message });
  }
};
