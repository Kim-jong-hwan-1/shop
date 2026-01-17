const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './database.sqlite';
const db = new Database(path.resolve(__dirname, '../../', dbPath));

// WAL 모드 활성화 (성능 향상)
db.pragma('journal_mode = WAL');

module.exports = db;
