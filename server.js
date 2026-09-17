const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;
const HTTPS_PORT = 5443;

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 30000; // 30 seconds cache

// Rate limiting - simple implementation
const rateLimiter = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 requests per minute per endpoint

function checkRateLimit(endpoint, ip) {
    const key = `${endpoint}-${ip}`;
    const now = Date.now();
    
    if (!rateLimiter.has(key)) {
        rateLimiter.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return true;
    }
    
    const limit = rateLimiter.get(key);
    
    if (now > limit.resetTime) {
        // Reset the counter
        rateLimiter.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return true;
    }
    
    if (limit.count >= MAX_REQUESTS_PER_WINDOW) {
        return false;
    }
    
    limit.count++;
    return true;
}

function getCachedData(key) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`Cache hit for ${key}`);
        return cached.data;
    }
    return null;
}

function setCachedData(key, data) {
    cache.set(key, { data, timestamp: Date.now() });
    console.log(`Data cached for ${key}`);
}

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url} - ${req.ip}`);
    
    // Log response when it finishes
    const originalSend = res.send;
    res.send = function(data) {
        console.log(`[${timestamp}] ${req.method} ${req.url} - ${res.statusCode} - Response sent`);
        originalSend.call(this, data);
    };
    
    next();
});

app.use(cors());
app.use(express.static('.'));

const TAOSTATS_AUTH = 'tao-20fddd35-30ac-4494-9b8e-dc741419b197:2c429125';


app.get('/api/tao-price', async (req, res) => {
    console.log('Fetching TAO price from TaoStats API...');
    
    // Check rate limit
    if (!checkRateLimit('tao-price', req.ip)) {
        console.log('Rate limit exceeded for TAO price');
        return res.status(429).json({ error: 'Rate limit exceeded. Please wait before making another request.' });
    }
    
    // Check cache first
    const cacheKey = 'tao-price';
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
        return res.json(cachedData);
    }
    
    try {
        const response = await fetch(
            'https://api.taostats.io/api/price/latest/v1?asset=tao',
            {
                headers: {
                    'Authorization': TAOSTATS_AUTH
                }
            }
        );

        if (!response.ok) {
            if (response.status === 429) {
                console.log('TaoStats API rate limit hit for TAO price');
                return res.status(429).json({ error: 'API rate limit exceeded. Please try again later.' });
            }
            throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();
        console.log('TAO price fetched successfully');
        setCachedData(cacheKey, data);
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
        // Normalize to match TaoStats response shape: { data: [{ price }] }
        const normalized = { data: [{ price: String(price), change_24h: change, source: 'coingecko' }] };
        console.log('TAO price fetched from CoinGecko fallback');
        setCachedData(cacheKey, normalized);
        return res.json(normalized);
    } catch (fallbackError) {
        console.error('CoinGecko fallback also failed:', fallbackError.message);
        res.status(500).json({ error: 'All price sources unavailable. Please try again later.' });
    }
});

app.get('/api/alpha-price/:netuid?', async (req, res) => {
    const { netuid = 70 } = req.params;
    console.log(`Fetching alpha price from TaoStats API for netuid: ${netuid}...`);
    
    // Check rate limit
    if (!checkRateLimit('alpha-price', req.ip)) {
        console.log('Rate limit exceeded for alpha price');
        return res.status(429).json({ error: 'Rate limit exceeded. Please wait before making another request.' });
    }
    
    // Check cache first
    const cacheKey = `alpha-price-${netuid}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
        return res.json(cachedData);
    }
    
    try {
        const response = await fetch(
            `https://api.taostats.io/api/dtao/pool/latest/v1?netuid=${netuid}`,
            {
                headers: {
                    'Authorization': TAOSTATS_AUTH
                }
            }
        );

        if (!response.ok) {
            if (response.status === 429) {
                console.log('TaoStats API rate limit hit for alpha price');
                return res.status(429).json({ error: 'API rate limit exceeded. Please try again later.' });
            }
            throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Alpha price for netuid ${netuid} fetched successfully`);
        
        // Cache the response
        setCachedData(cacheKey, data);
        
        res.json(data);
    } catch (error) {
        console.error('Error fetching alpha price:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/metagraph/:netuid?', async (req, res) => {
    const { netuid = 70 } = req.params;
    console.log(`Fetching metagraph data for netuid: ${netuid}...`);
    
    // Check rate limit
    if (!checkRateLimit('metagraph', req.ip)) {
        console.log('Rate limit exceeded for metagraph');
        return res.status(429).json({ error: 'Rate limit exceeded. Please wait before making another request.' });
    }
    
    // Check cache first
    const cacheKey = `metagraph-${netuid}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
        return res.json(cachedData);
    }
    
    try {
        const response = await fetch(
            `https://api.taostats.io/api/metagraph/latest/v1?netuid=${netuid}`,
            {
                headers: {
                    'Authorization': TAOSTATS_AUTH
                }
            }
        );

        if (!response.ok) {
            if (response.status === 429) {
                console.log('TaoStats API rate limit hit for metagraph');
                return res.status(429).json({ error: 'API rate limit exceeded. Please try again later.' });
            }
            throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Metagraph data for netuid ${netuid} fetched successfully`);
        
        // Cache the response
        setCachedData(cacheKey, data);
        
        res.json(data);
    } catch (error) {
        console.error('Error fetching metagraph data:', error);
        res.status(500).json({ error: error.message });
    }
});

// Try to load SSL certificates
let httpsOptions = null;
try {
    const certPath = path.join(__dirname, 'ssl');
    if (fs.existsSync(path.join(certPath, 'server.key')) && fs.existsSync(path.join(certPath, 'server.crt'))) {
        httpsOptions = {
            key: fs.readFileSync(path.join(certPath, 'server.key')),
            cert: fs.readFileSync(path.join(certPath, 'server.crt'))
        };
        console.log('SSL certificates found, HTTPS will be enabled');
    }
} catch (error) {
    console.log('SSL certificates not found or invalid, running HTTP only');
}

// Start HTTP server
app.listen(PORT, () => {
    console.log(`HTTP Server running at http://localhost:${PORT}`);
    if (!httpsOptions) {
        console.log(`Open http://localhost:${PORT} in your browser`);
    }
});

// Start HTTPS server if certificates are available
if (httpsOptions) {
    https.createServer(httpsOptions, app).listen(HTTPS_PORT, () => {
        console.log(`HTTPS Server running at https://localhost:${HTTPS_PORT}`);
        console.log(`Open https://localhost:${HTTPS_PORT} in your browser`);
    });
}
