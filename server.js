/**
 * IndiVote — Indian Election Assistant Backend
 * Express server with SQLite database, security headers, and AI proxy.
 */

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3030;

/**
 * Simple in-memory rate limiter to prevent abuse of AI endpoints.
 * @param {number} windowMs - Time window in milliseconds.
 * @param {number} maxRequests - Maximum number of requests allowed per window.
 * @returns {Function} Express middleware.
 */
const rateLimitMap = new Map();
function rateLimit(windowMs, maxRequests) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const entry = rateLimitMap.get(ip) || { count: 0, start: now };
    if (now - entry.start > windowMs) {
      entry.count = 1;
      entry.start = now;
    } else {
      entry.count++;
    }
    rateLimitMap.set(ip, entry);
    if (entry.count > maxRequests) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    next();
  };
}

let electionDataCache = null;
let electionDataCacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Security middleware to set essential HTTP headers for protection and compliance.
 */
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self' https://*.gstatic.com https://*.google.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.gstatic.com https://*.google.com https://*.googleapis.com; style-src 'self' 'unsafe-inline' https://*.googleapis.com https://*.gstatic.com https://*.google.com; font-src 'self' https://*.gstatic.com https://*.googleapis.com; img-src 'self' data: https://*.gstatic.com https://*.google.com https://*.googleapis.com; connect-src 'self' https://api.rss2json.com https://*.googleapis.com https://*.gstatic.com; frame-src 'self' https://*.google.com;");
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

app.use(cors());
app.use(express.json({ limit: '10kb' }));

/**
 * Serve static files with aggressive caching for assets and no-cache for HTML.
 */
app.use(express.static(path.join(__dirname, ''), {
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    else res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
}));

const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

/**
 * Database utility: Query all rows.
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Promise<Array>}
 */
const queryDB = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); });
});

/**
 * Database utility: Get a single row.
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Promise<Object>}
 */
const getDB = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => { if (err) reject(err); else resolve(row); });
});

/**
 * Database utility: Run a command.
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Promise<Object>}
 */
const runDB = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) { if (err) reject(err); else resolve(this); });
});

/**
 * API Endpoint: Get health status.
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'IndiVote API' });
});

/**
 * API Endpoint: Fetch election data for all states with server-side caching.
 */
app.get('/api/election-data', async (req, res) => {
  try {
    const now = Date.now();
    if (electionDataCache && (now - electionDataCacheTime) < CACHE_TTL_MS) {
      return res.json(electionDataCache);
    }
    const rows = await queryDB('SELECT * FROM election_data');
    const stateData = {};
    rows.forEach(row => {
      stateData[row.state] = {
        current: { 
          active: row.current_active === 1, 
          title: row.current_title, 
          phase: row.current_phase, 
          next_date: row.current_next_date 
        },
        previous: { 
          year: row.previous_year, 
          ruling: row.previous_ruling, 
          seats: row.previous_seats, 
          turnout: row.previous_turnout 
        }
      };
    });
    electionDataCache = stateData;
    electionDataCacheTime = now;
    res.json(stateData);
  } catch (err) {
    console.error('Election data error:', err);
    res.status(500).json({ error: 'Failed to retrieve election data' });
  }
});

/**
 * API Endpoint: Proxy chat requests to Gemini AI.
 * Requires an API key to be set in the database.
 */
app.post('/api/chat', rateLimit(60 * 1000, 20), async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });
  
  try {
    const row = await getDB("SELECT value FROM settings WHERE key = 'GEMINI_API_KEY'");
    if (!row || !row.value) return res.status(401).json({ error: 'Gemini API Key is not configured' });
    
    const apiKey = row.value;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: message }] }] })
    });
    
    const data = await response.json();
    if (!response.ok) {
      console.error('Gemini API Error:', data);
      throw new Error(data.error?.message || 'Gemini API failed');
    }

    if (!data.candidates || data.candidates.length === 0) {
      return res.json({ reply: "I'm sorry, I couldn't generate a response. Please try rephrasing your question." });
    }

    const candidate = data.candidates[0];
    if (candidate.finishReason === 'SAFETY') {
      return res.json({ reply: "I cannot answer that question due to safety filters. Please ask something else about elections or the constitution." });
    }

    const reply = candidate.content?.parts?.[0]?.text;
    if (!reply) {
      return res.json({ reply: "I received an empty response. Please try again." });
    }
    
    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

/**
 * API Endpoint: Save settings (e.g., API Key) to the database.
 */
app.post('/api/settings/apikey', rateLimit(60 * 1000, 10), async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'API Key is required' });
  
  try {
    await runDB("INSERT OR REPLACE INTO settings (key, value) VALUES ('GEMINI_API_KEY', ?)", [apiKey]);
    res.json({ success: true, message: 'API Key updated successfully' });
  } catch (err) {
    console.error('Settings error:', err);
    res.status(500).json({ error: 'Failed to save API Key' });
  }
});

/**
 * API Endpoint: Check if the Gemini API Key is configured.
 */
app.get('/api/settings/apikey/check', async (req, res) => {
  try {
    const row = await getDB("SELECT value FROM settings WHERE key = 'GEMINI_API_KEY'");
    res.json({ configured: !!(row && row.value) });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
}

module.exports = app;
