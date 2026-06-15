// config/db.js
import pg from 'pg';
const { Pool } = pg;
import 'dotenv/config';

const pool = new Pool({
  // Append sslmode=require directly to the connection string
  connectionString: process.env.DATABASE_URL
});

export { pool };