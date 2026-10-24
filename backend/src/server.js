// `node backend/src/server.js --prod` runs in production mode without needing cross-env
if (process.argv.includes('--prod')) process.env.NODE_ENV = 'production';

const http = require('http');
const config = require('./config');
const db = require('./config/db');
const { app, finalize } = require('./app');
const { mountFrontend } = require('./frontend');
const dailyAttendanceJob = require('./jobs/dailyAttendance.job');

async function start() {
  const server = http.createServer(app);
  const frontend = await mountFrontend(app, server);
  finalize();

  server.listen(config.port, () => {
    console.log(`\n  EMS running on ${config.appUrl}  (${config.env}, frontend: ${frontend.mode})`);
    console.log(`  API: ${config.appUrl}/api   Health: ${config.appUrl}/api/health\n`);
    dailyAttendanceJob.start();
  });

  const shutdown = (signal) => {
    console.log(`\n${signal} received, shutting down...`);
    dailyAttendanceJob.stop();
    server.close(async () => {
      await frontend.close().catch(() => {});
      await db.destroy().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
