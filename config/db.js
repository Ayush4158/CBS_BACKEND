// config/db.js
import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    // This is the critical line that fixes DEPTH_ZERO_SELF_SIGNED_CERT
    rejectUnauthorized: false 
  }
});

export { pool };