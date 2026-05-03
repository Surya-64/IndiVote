/**
 * IndiVote — Indian Election Assistant Backend
 * Express server with SQLite database, security headers, and AI proxy.
 */

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const helmet = require('helmet');
const expressRateLimit = require('express-rate-limit');
const hpp = require('hpp');
const xss = require('xss-clean');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3030;

// Global Rate Limiting
const globalLimiter = expressRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use(globalLimiter);
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
 * Security middleware using Helmet.
 */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [
          "'self'",
          'https://*.gstatic.com',
          'https://*.google.com',
          'https://*.firebaseapp.com',
        ],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https://*.gstatic.com',
          'https://*.google.com',
          'https://*.googleapis.com',
          'https://www.googletagmanager.com',
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://*.googleapis.com',
          'https://*.gstatic.com',
          'https://*.google.com',
        ],
        fontSrc: ["'self'", 'https://*.gstatic.com', 'https://*.googleapis.com'],
        imgSrc: [
          "'self'",
          'data:',
          'https://*.gstatic.com',
          'https://*.google.com',
          'https://*.googleapis.com',
          'https://www.google-analytics.com',
        ],
        connectSrc: [
          "'self'",
          'https://api.rss2json.com',
          'https://*.googleapis.com',
          'https://*.gstatic.com',
          'https://*.google-analytics.com',
          'https://*.firebaseapp.com',
        ],
        frameSrc: ["'self'", 'https://*.google.com', 'https://*.firebaseapp.com'],
      },
    },
  }),
);

app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

/**
 * Serve static files with aggressive caching for assets and no-cache for HTML.
 */
app.use(
  express.static(path.join(__dirname, ''), {
    setHeaders: (res, path) => {
      if (path.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
      else res.setHeader('Cache-Control', 'public, max-age=31536000');
    },
  }),
);

const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

// Create tables if they don't exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS election_data (
    state TEXT PRIMARY KEY,
    current_active INTEGER NOT NULL,
    current_title TEXT,
    current_phase TEXT,
    current_next_date TEXT,
    previous_year TEXT,
    previous_ruling TEXT,
    previous_seats TEXT,
    previous_turnout TEXT
  )`);

  // Auto seed state data if it's empty
  db.get("SELECT COUNT(*) as count FROM election_data", (err, row) => {
    if (!err && (!row || row.count === 0)) {
      console.log('Seeding initial election data into database...');
      const STATE_ELECTION_DATA = {
        'West Bengal': {
          current: { active: true, title: '2026 Assembly Elections', phase: 'Phase II Voting underway', next_date: 'Results on May 4, 2026' },
          previous: { year: '2021 Assembly', ruling: 'AITC (Trinamool Congress)', seats: '215/292', turnout: '82.3%' }
        },
        'Tamil Nadu': {
          current: { active: true, title: '2026 Assembly Elections', phase: 'Polling Completed (Phase I & II)', next_date: 'Results on May 4, 2026' },
          previous: { year: '2021 Assembly', ruling: 'DMK Alliance', seats: '159/234', turnout: '73.6%' }
        },
        'Assam': {
          current: { active: true, title: '2026 Assembly Elections', phase: 'Polling Completed', next_date: 'Results on May 4, 2026' },
          previous: { year: '2021 Assembly', ruling: 'NDA (BJP+)', seats: '75/126', turnout: '82.0%' }
        },
        'Kerala': {
          current: { active: true, title: '2026 Assembly Elections', phase: 'Polling Completed', next_date: 'Results on May 4, 2026' },
          previous: { year: '2021 Assembly', ruling: 'LDF (CPI(M)+)', seats: '99/140', turnout: '74.0%' }
        },
        'Puducherry': {
          current: { active: true, title: '2026 Assembly Elections', phase: 'Polling Completed', next_date: 'Results on May 4, 2026' },
          previous: { year: '2021 Assembly', ruling: 'NDA (AINRC+BJP)', seats: '16/30', turnout: '81.6%' }
        },
        'Maharashtra': {
          current: { active: false },
          previous: { year: '2024 Assembly', ruling: 'Mahayuti Alliance', seats: '145+/288', turnout: '61.3%' }
        },
        'Uttar Pradesh': {
          current: { active: false },
          previous: { year: '2022 Assembly', ruling: 'NDA (BJP+)', seats: '273/403', turnout: '60.8%' }
        },
        'Gujarat': {
          current: { active: false },
          previous: { year: '2022 Assembly', ruling: 'BJP', seats: '156/182', turnout: '64.3%' }
        },
        'Karnataka': {
          current: { active: false },
          previous: { year: '2023 Assembly', ruling: 'INC', seats: '135/224', turnout: '73.1%' }
        },
        'Madhya Pradesh': {
          current: { active: false },
          previous: { year: '2023 Assembly', ruling: 'BJP', seats: '163/230', turnout: '77.1%' }
        },
        'Andhra Pradesh': {
          current: { active: false },
          previous: { year: '2024 Assembly', ruling: 'NDA (TDP+JSP+BJP)', seats: '164/175', turnout: '80.6%' }
        },
        'Bihar': {
          current: { active: false },
          previous: { year: '2020 Assembly', ruling: 'NDA', seats: '125/243', turnout: '57.0%' }
        },
        'Rajasthan': {
          current: { active: false },
          previous: { year: '2023 Assembly', ruling: 'BJP', seats: '115/199', turnout: '74.6%' }
        },
        'Telangana': {
          current: { active: false },
          previous: { year: '2023 Assembly', ruling: 'INC (Indian National Congress)', seats: '64/119', turnout: '71.3%' }
        },
        'Odisha': {
          current: { active: false },
          previous: { year: '2024 Assembly', ruling: 'BJP (Bharatiya Janata Party)', seats: '78/147', turnout: '74.4%' }
        },
        'Uttarakhand': {
          current: { active: false },
          previous: { year: '2022 Assembly', ruling: 'BJP', seats: '47/70', turnout: '65.4%' }
        }
      };

      const insertStmt = db.prepare(`
        INSERT INTO election_data (
          state, current_active, current_title, current_phase, current_next_date,
          previous_year, previous_ruling, previous_seats, previous_turnout
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const state of Object.keys(STATE_ELECTION_DATA)) {
        const data = STATE_ELECTION_DATA[state];
        insertStmt.run(
          state,
          data.current.active ? 1 : 0,
          data.current.title || null,
          data.current.phase || null,
          data.current.next_date || null,
          data.previous?.year || null,
          data.previous?.ruling || null,
          data.previous?.seats || null,
          data.previous?.turnout || null
        );
      }
      insertStmt.finalize();
      console.log('Database successfully auto-seeded with initial state data.');
    }
  });
});

/**
 * Database utility: Query all rows.
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<Array>}
 */
const queryDB = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

/**
 * Database utility: Get a single row.
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<Object>}
 */
const getDB = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

/**
 * Database utility: Run a command.
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<Object>}
 */
const runDB = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
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
    if (electionDataCache && now - electionDataCacheTime < CACHE_TTL_MS) {
      return res.json(electionDataCache);
    }
    const rows = await queryDB('SELECT * FROM election_data');
    const stateData = {};
    rows.forEach((row) => {
      stateData[row.state] = {
        current: {
          active: row.current_active === 1,
          title: row.current_title,
          phase: row.current_phase,
          next_date: row.current_next_date,
        },
        previous: {
          year: row.previous_year,
          ruling: row.previous_ruling,
          seats: row.previous_seats,
          turnout: row.previous_turnout,
        },
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

  // Try Gemini API if a key is configured
  const row = await getDB("SELECT value FROM settings WHERE key = 'GEMINI_API_KEY'");

  if (row && row.value) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${row.value}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: message }] }],
          }),
        },
      );

      const data = await response.json();
      if (response.ok && data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        if (candidate.finishReason !== 'SAFETY') {
          const reply = candidate.content?.parts?.[0]?.text;
          if (reply) return res.json({ reply });
        }
      }
    } catch (err) {
      console.error('Gemini API call failed, using local fallback:', err.message);
    }
  }

  // Local intelligent fallback — always works without an API key
  const query = message.toLowerCase();
  let reply;

  if (query.includes('nota') || query.includes('reform')) {
    reply =
      '**NOTA (None of the Above) & Electoral Reforms in India:**\n\n' +
      '• **NOTA** was introduced in 2013 on the Supreme Court direction. It allows voters to reject all candidates in their constituency. While it expresses voter dissatisfaction, the candidate with the highest number of votes wins regardless of NOTA vote share.\n' +
      '• **Electoral Reforms**: Includes EVM usage with VVPAT for audit verification, limit on political donations, and strict tracking of candidate expenditure to prevent corruption.';
  } else if (query.includes('voter') || query.includes('voting') || query.includes('registration') || query.includes('right')) {
    reply =
      '**Voter Registration and Voting Rights in India:**\n\n' +
      '• **Right to Vote**: Guaranteed under **Article 326** to adult citizens 18+. To register, apply via Form 6 on **voters.eci.gov.in** or using the Voter Helpline app.\n' +
      '• **Voter ID Cards**: Provided by ECI as an electoral photo identity card (EPIC). Alternatively, any of the 12 approved ID documents (Aadhaar, PAN, DL, etc.) can be presented at the polling station.';
  } else if (query.includes('article') || query.includes('constitutional') || query.includes('provisions')) {
    reply =
      '**Constitutional Provisions for Elections (Articles 324–329):**\n\n' +
      '• **Article 324**: Vests the superintendence, direction, and control of elections in the **Election Commission of India (ECI)**.\n' +
      '• **Article 325**: Prohibits discrimination in the preparation of electoral rolls on grounds of religion, race, caste, or sex.\n' +
      '• **Article 326**: Establishes **Universal Adult Suffrage**, giving voting rights to all citizens who are at least 18 years old.\n' +
      '• **Article 327-328**: Grants power to Parliament and State Legislatures to make provisions regarding elections.\n' +
      '• **Article 329**: Bars courts from interfering in electoral matters, such as the delimitation of constituencies.';
  } else if (query.includes('mcc') || query.includes('model code') || query.includes('eligibility') || query.includes('rule')) {
    reply =
      '**Model Code of Conduct (MCC) & Candidate Eligibility:**\n\n' +
      '• **MCC Rules**: Operational immediately from the announcement of the election schedule. It prevents the ruling government from announcing ad-hoc welfare schemes, using state resources for campaigning, or inciting communal disharmony.\n' +
      '• **Candidate Eligibility**: A person must be a citizen of India, 25 years or older for Lok Sabha/Assembly, and registered as an elector in any constituency. Under Section 8 of the Representation of the People Act, conviction for certain offenses leads to automatic disqualification.';
  } else if (query.includes('eci') || query.includes('commission')) {
    reply =
      '**The Election Commission of India (ECI):**\n\n' +
      '• **Role**: An autonomous constitutional authority under **Article 324** responsible for administering Union and State election processes in India.\n' +
      '• **Operations**: Manages voter registration, creates and updates electoral rolls, assigns party symbols, monitors election spending, and implements the Model Code of Conduct to ensure free and fair elections.';
  } else if (query.includes('result') || query.includes('may 4') || query.includes('2026')) {
    reply =
      '**2026 Assembly Elections:** Results for Assam, Kerala, Puducherry, Tamil Nadu, and West Bengal are expected on **May 4, 2026**. You can track live results on the ECI Results portal at **results.eci.gov.in**.';
  } else {
    reply =
      "**Welcome to IndiVote AI Assistant!** 🗳️\n\nI'm your guide to Indian elections and democracy. Ask me anything about:\n• **Voter registration** and voting rights\n• **Election Commission** rules\n• **Constitutional provisions** (Articles 324–329)\n• **MCC rules** and candidate eligibility\n• **NOTA** and electoral reforms\n\nWhat would you like to know?";
  }

  res.json({ reply });
});

/**
 * API Endpoint: Save settings (e.g., API Key) to the database.
 */
app.post('/api/settings/apikey', rateLimit(60 * 1000, 10), async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'API Key is required' });

  try {
    await runDB("INSERT OR REPLACE INTO settings (key, value) VALUES ('GEMINI_API_KEY', ?)", [
      apiKey,
    ]);
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
  } catch {
    res.status(500).json({ error: 'Database error' });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
}

module.exports = app;
