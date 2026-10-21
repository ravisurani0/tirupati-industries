const { Pool } = require('pg');
require('dotenv').config();

const normalizeEnvValue = (value) => (typeof value === 'string' ? value.trim() : '');

const isPlaceholderValue = (value) => {
  if (!value) return true;

  const normalized = value.toLowerCase();
  const placeholderPatterns = [
    'host',
    'your_host',
    'your-db-host',
    'your-database-host',
    'db',
    'database',
    'username',
    'user',
    'password',
    'your_user',
    'your_password',
    'your_database',
    'changeme',
    'change-me',
    '<host>',
    '<username>',
    '<password>',
    '<database>'
  ];

  return placeholderPatterns.includes(normalized)
    || normalized.includes('your_')
    || normalized.includes('<')
    || normalized.includes('>');
};

const isProduction = process.env.NODE_ENV === 'production';
const connectionString = normalizeEnvValue(process.env.DATABASE_URL);
const pgHost = normalizeEnvValue(process.env.PGHOST);
const pgUser = normalizeEnvValue(process.env.PGUSER);
const pgDatabase = normalizeEnvValue(process.env.PGDATABASE);

let poolConfig = {};

if (connectionString && !isPlaceholderValue(connectionString)) {
  poolConfig.connectionString = connectionString;
  if (isProduction || connectionString.includes('sslmode=require') || connectionString.includes('render.com') || connectionString.includes('neon.tech') || connectionString.includes('supabase.co')) {
    poolConfig.ssl = {
      rejectUnauthorized: false
    };
  }
} else if (pgHost && !isPlaceholderValue(pgHost) && pgUser && !isPlaceholderValue(pgUser) && pgDatabase && !isPlaceholderValue(pgDatabase)) {
  poolConfig = {
    host: pgHost,
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: pgUser,
    password: normalizeEnvValue(process.env.PGPASSWORD),
    database: pgDatabase,
  };
} else {
  const fallbackHost = process.env.PGHOST || 'localhost';
  const fallbackUser = process.env.PGUSER || process.env.USER || 'postgres';
  const fallbackDatabase = process.env.PGDATABASE || 'tirupati_workshop';

  if (connectionString && isPlaceholderValue(connectionString)) {
    console.warn('⚠️ DATABASE_URL is set to a placeholder value. Replace it with your real PostgreSQL connection string.');
  }

  if (pgHost && isPlaceholderValue(pgHost)) {
    console.warn('⚠️ PGHOST is set to a placeholder value. Replace it with your real database host.');
  }

  if (pgUser && isPlaceholderValue(pgUser)) {
    console.warn('⚠️ PGUSER is set to a placeholder value. Replace it with your real database username.');
  }

  if (pgDatabase && isPlaceholderValue(pgDatabase)) {
    console.warn('⚠️ PGDATABASE is set to a placeholder value. Replace it with your real database name.');
  }

  poolConfig = {
    host: fallbackHost,
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: fallbackUser,
    password: normalizeEnvValue(process.env.PGPASSWORD),
    database: fallbackDatabase,
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
