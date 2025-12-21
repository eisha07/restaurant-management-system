const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

(async () => {
  try {
    await client.connect();
    console.log('Connected to DB');
    const res = await client.query('SELECT NOW() as now, current_database() as db');
    console.log('Query result:', res.rows[0]);
  } catch (err) {
    console.error('DB connection error:', err.message);
  } finally {
    await client.end();
  }
})();
