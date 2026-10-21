const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const connectionString = process.env.DATABASE_URL;

let poolConfig = {};

if (connectionString) {
  poolConfig.connectionString = connectionString;
  // If external host or production, enable SSL with rejectUnauthorized: false
  if (isProduction || connectionString.includes('sslmode=require') || connectionString.includes('render.com') || connectionString.includes('neon.tech') || connectionString.includes('supabase.co')) {
    poolConfig.ssl = {
      rejectUnauthorized: false
    };
  }
} else {
  poolConfig = {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || process.env.USER,
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'tirupati_workshop',
  };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect()
};
