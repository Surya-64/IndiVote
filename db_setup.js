const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'database.db');

// Delete existing DB for a clean setup (optional, but good for initialization)
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Database connected.');
    initializeTables();
  }
});

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

/**
 * Initializes the SQLite database schema and populates initial data.
 * Sets up 'settings', 'chat_history', and 'election_data' tables.
 */
function initializeTables() {
  db.serialize(() => {
    // Settings Table for securely storing API keys
    db.run(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`);

    // Chat History Table
    db.run(`CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Election Data Table
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

    console.log('Tables created.');

    const insertStmt = db.prepare(`
      INSERT INTO election_data (
        state, current_active, current_title, current_phase, current_next_date,
        previous_year, previous_ruling, previous_seats, previous_turnout
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let i = 0;
    const states = Object.keys(STATE_ELECTION_DATA);
    for (const state of states) {
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
        data.previous?.turnout || null,
        (err) => {
          if (err) console.error("Insert error:", err.message);
          i++;
          if (i === states.length) {
            console.log('Successfully populated election_data table with state information.');
            db.close();
          }
        }
      );
    }
    insertStmt.finalize();
  });
}
