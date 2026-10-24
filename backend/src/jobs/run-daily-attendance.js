#!/usr/bin/env node
/**
 * Run the daily attendance job once from the command line / an external cron.
 *
 *   npm run attendance:daily                      # today (APP_TIMEZONE)
 *   npm run attendance:daily -- --date=2026-10-24  # a specific day
 */
const db = require('../config/db');
const attendanceService = require('../services/attendance.service');
const { today, isIsoDate } = require('../utils/dates');

(async () => {
  const arg = process.argv.find((a) => a.startsWith('--date='));
  const date = arg ? arg.split('=')[1] : today();
  if (!isIsoDate(date)) {
    console.error(`Invalid --date "${date}". Use YYYY-MM-DD.`);
    process.exit(1);
  }
  try {
    const result = await attendanceService.generateDaily({ date });
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
})();
