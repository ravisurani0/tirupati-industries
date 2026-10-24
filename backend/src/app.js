const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

/**
 * Express app with the API mounted:
 *   /api/*      -> REST API (JSON 404 for unknown API routes)
 *   /uploads/*  -> uploaded profile logos
 * The React app is attached afterwards by ./frontend.js and handles every other path.
 */
const app = express();

app.disable('x-powered-by');
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'same-site' },
    // Vite's dev server injects inline scripts and a websocket for hot reload, so CSP is production-only
    contentSecurityPolicy: config.isProd
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
            imgSrc: ["'self'", 'data:', 'blob:'],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'self'"],
            upgradeInsecureRequests: null, // allow plain-http deployments (e.g. LAN / localhost)
          },
        }
      : false,
  }),
);

if (config.corsOrigins.length) {
  app.use(
    '/api',
    cors({
      origin: (origin, cb) => cb(null, !origin || config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)),
      credentials: true,
    }),
  );
}

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
if (config.env !== 'test') app.use('/api', morgan(config.isProd ? 'combined' : 'dev'));

app.use('/uploads', express.static(config.uploads.root, { maxAge: '7d', fallthrough: false }));
app.use('/api', routes);
app.use('/api', notFound); // unknown /api/* is always a JSON 404, never the React app

/** Call after the frontend is mounted: final 404 + error handler. */
function finalize() {
  app.use(notFound);
  app.use(errorHandler);
}

module.exports = { app, finalize };
