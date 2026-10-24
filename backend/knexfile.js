const path = require('path');
require('./src/config/env');

// Return SQL DATE columns as plain 'YYYY-MM-DD' strings (not JS Dates), so an
// attendance day can never shift because of the server's timezone.
try {
  // eslint-disable-next-line global-require
  require('pg').types.setTypeParser(1082, (value) => value);
} catch {
  /* pg not installed - not using Postgres */
}

const shared = {
  migrations: {
    directory: path.join(__dirname, 'database', 'migrations'),
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: path.join(__dirname, 'database', 'seeds'),
  },
};

/**
 * Builds a pg connection from DATABASE_URL (e.g. Neon). The libpq-only query params
 * (sslmode, channel_binding) are removed and SSL is configured explicitly instead,
 * because node-postgres handles them differently from psql.
 */
function pgConnectionFromUrl(url) {
  const parsed = new URL(url);
  const sslmode = parsed.searchParams.get('sslmode');
  ['sslmode', 'channel_binding', 'sslrootcert', 'sslcert', 'sslkey'].forEach((k) => parsed.searchParams.delete(k));
  const useSsl = sslmode ? sslmode !== 'disable' : process.env.DB_SSL !== 'false';
  return {
    connectionString: parsed.toString(),
    ssl: useSsl ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : false,
  };
}

function buildConfig() {
  // 1) A full connection string wins (Neon, Supabase, RDS, ...)
  if (process.env.DATABASE_URL) {
    return {
      client: 'pg',
      connection: pgConnectionFromUrl(process.env.DATABASE_URL),
      pool: { min: 0, max: Number(process.env.DB_POOL_MAX) || 10 },
      ...shared,
    };
  }

  const client = (process.env.DB_CLIENT || 'sqlite').toLowerCase();

  // 2) Local SQLite file (zero setup)
  if (client === 'sqlite' || client === 'sqlite3' || client === 'better-sqlite3') {
    const filename = path.resolve(__dirname, process.env.DB_FILENAME || './database/ems.sqlite');
    return {
      client: 'better-sqlite3',
      connection: { filename },
      useNullAsDefault: true,
      pool: {
        // SQLite ships with foreign keys disabled - turn them on for every connection
        afterCreate: (conn, done) => {
          conn.pragma('foreign_keys = ON');
          done();
        },
      },
      ...shared,
    };
  }

  // 3) MySQL / Postgres from individual DB_* settings
  return {
    client, // 'mysql2' or 'pg'
    connection: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || (client === 'pg' ? 5432 : 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ems',
      ...(client === 'mysql2' ? { charset: 'utf8mb4', dateStrings: ['DATE'] } : {}),
      ...(client === 'pg' && process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
    },
    pool: { min: 2, max: 10 },
    ...shared,
  };
}

const config = buildConfig();

module.exports = {
  development: config,
  test: config,
  production: config,
};
