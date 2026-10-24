const path = require('path');
const { ROOT } = require('./env');

const env = process.env.NODE_ENV || 'development';
const port = Number(process.env.PORT) || 5000;

const config = {
  env,
  isProd: env === 'production',
  port,
  appUrl: (process.env.APP_URL || `http://localhost:${port}`).replace(/\/$/, ''),
  // The React app is served from the same origin, so CORS is only needed for
  // other clients (mobile app, another site). Comma-separated, or * for any.
  corsOrigins: (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-to-a-long-random-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    rememberExpiresIn: process.env.JWT_REMEMBER_EXPIRES_IN || '30d',
  },
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 10,
  uploads: {
    root: path.join(ROOT, 'backend', 'uploads'),
    profileDir: 'profile',
    maxFileSize: 2 * 1024 * 1024, // 2 MB
  },
  frontend: {
    root: path.join(ROOT, 'frontend'),
    dist: path.join(ROOT, 'frontend', 'dist'),
    viteConfig: path.join(ROOT, 'frontend', 'vite.config.mjs'),
  },
  defaultRoleSlug: 'manager', // role given to self-registered users
};

if (config.isProd && config.jwt.secret === 'change-me-to-a-long-random-secret') {
  // Fail fast rather than run production with a known secret
  throw new Error('JWT_SECRET must be set in production (see .env).');
}

module.exports = config;
