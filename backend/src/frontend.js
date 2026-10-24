const fs = require('fs');
const path = require('path');
const express = require('express');
const config = require('./config');

/**
 * Serves the React app from the same Express server (and port) as the API.
 *  - development: Vite runs in middleware mode -> hot reload, no separate dev server
 *  - production:  serves the built files in frontend/dist with an SPA fallback
 */
async function mountFrontend(app, httpServer) {
  if (!config.isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      configFile: config.frontend.viteConfig,
      root: config.frontend.root,
      appType: 'spa',
      server: { middlewareMode: true, hmr: { server: httpServer } },
    });
    app.use(vite.middlewares);
    return { mode: 'vite-dev', close: () => vite.close() };
  }

  const indexHtml = path.join(config.frontend.dist, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    throw new Error('frontend/dist is missing. Run "npm run build" (or "npm start", which builds first).');
  }

  // Hashed assets can be cached forever; index.html must always be revalidated
  app.use(
    express.static(config.frontend.dist, {
      index: false,
      setHeaders: (res, file) => {
        if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      },
    }),
  );
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(indexHtml);
  });
  return { mode: 'static', close: async () => {} };
}

module.exports = { mountFrontend };
