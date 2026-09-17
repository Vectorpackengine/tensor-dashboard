const fetch = require('node-fetch');

const TAOSTATS_AUTH = 'tao-20fddd35-30ac-4494-9b8e-dc741419b197:2c429125';

// Simple in-memory cache (resets on cold start, but helps within warm invocations)
let cache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30000; // 30 seconds

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check cache
  if (cache && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return res.json(cache);
  }

  // Try TaoStats first
  try {
    const response = await fetch(
      'https://api.taostats.io/api/price/latest/v1?asset=tao',
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
    cache = data;
    cacheTimestamp = Date.now();
    return res.json(data);
  } catch (error) {
    console.warn('TaoStats TAO price failed, trying CoinGecko fallback:', error.message);
  }

  // CoinGecko fallback
  try {
    const cgResponse = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bittensor&vs_currencies=usd&include_24hr_change=true'
    );
    if (!cgResponse.ok) throw new Error(`CoinGecko responded with status: ${cgResponse.status}`);
    const cgData = await cgResponse.json();
    const price = cgData.bittensor.usd;
    const change = cgData.bittensor.usd_24h_change;
    const normalized = { data: [{ price: String(price), change_24h: change, source: 'coingecko' }] };
    cache = normalized;
    cacheTimestamp = Date.now();
    return res.json(normalized);
  } catch (fallbackError) {
    console.error('CoinGecko fallback also failed:', fallbackError.message);
    return res.status(500).json({ error: 'All price sources unavailable. Please try again later.' });
  }
};
