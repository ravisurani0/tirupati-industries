/**
 * Daily attendance job (in-process scheduler, no extra dependencies).
 *
 * - Runs once when the server starts (catch-up for today, in case the server
 *   was down at the scheduled time).
 * - Then runs every day at ATTENDANCE_JOB_TIME (HH:MM 24-hour, default 08:30) in
 *   APP_TIMEZONE (default Asia/Kolkata).
 * - Idempotent: the unique (employee_id, attendance_date) key means re-runs or
 *   several server instances never create duplicates.
 *
 * Disable with ATTENDANCE_JOB_ENABLED=false (e.g. if you run
 * `npm run attendance:daily` from an external cron instead).
 */
const attendanceService = require('../services/attendance.service');
const { nowParts, TIMEZONE } = require('../utils/dates');

const ENABLED = process.env.ATTENDANCE_JOB_ENABLED !== 'false';
const DEFAULT_RUN_AT = '08:30';

/** Accepts "8:30", "08:30" or "20:15"; anything invalid falls back to 08:30. */
function parseRunAt(value) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim());
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) {
    if (value) console.warn(`[attendance-job] invalid ATTENDANCE_JOB_TIME "${value}", using ${DEFAULT_RUN_AT}`);
    return DEFAULT_RUN_AT;
  }
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

const RUN_AT = parseRunAt(process.env.ATTENDANCE_JOB_TIME);
const CHECK_EVERY_MS = 30 * 1000;

let lastRunDate = null;
let running = false;
let timer = null;

async function runFor(date, reason) {
  if (running) return null;
  running = true;
  try {
    const result = await attendanceService.generateDaily({ date });
    lastRunDate = date;
    const note = result.weekly_off ? 'weekly off day, nothing created' : `created ${result.created}, already present ${result.skipped_existing}`;
    console.log(`[attendance-job] ${date} (${reason}): ${note}`);
    return result;
  } catch (err) {
    // Usually means migrations have not been run yet - log and retry on the next tick
    console.error(`[attendance-job] ${date} failed: ${err.message}`);
    return null;
  } finally {
    running = false;
  }
}

function tick() {
  const { date, time } = nowParts();
  if (time >= RUN_AT && lastRunDate !== date) runFor(date, 'scheduled');
}

function start() {
  if (!ENABLED) {
    console.log('[attendance-job] disabled (ATTENDANCE_JOB_ENABLED=false)');
    return;
  }
  console.log(`[attendance-job] scheduled daily at ${RUN_AT} ${TIMEZONE}`);
  const { date, time } = nowParts();
  if (time >= RUN_AT) runFor(date, 'startup catch-up');
  timer = setInterval(tick, CHECK_EVERY_MS);
  timer.unref();
}

function stop() {
  if (timer) clearInterval(timer);
}

module.exports = { start, stop, runFor };
