const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.warn('Warning: DATABASE_URL environment variable not set. Database operations will fail.');
}

const sql = neon(process.env.DATABASE_URL || '');

module.exports = sql;
