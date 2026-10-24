/**
 * Calendar helpers that work in the business timezone (APP_TIMEZONE, default Asia/Kolkata)
 * instead of the server's timezone, so "today" is the same day the office sees.
 */
require('../config/env');

const TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

/** Parts of the current wall-clock time in TIMEZONE. */
function nowParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')),
  };
}

/** Today's date (YYYY-MM-DD) in TIMEZONE. */
const today = () => nowParts().date;

/** Day of week (0 = Sunday) for a YYYY-MM-DD string. */
function weekdayOf(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** True for a real calendar date in YYYY-MM-DD form (rejects 2026-02-30). */
function isIsoDate(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** Normalises DATE values from any driver to YYYY-MM-DD. */
function toDateOnly(v) {
  if (!v) return null;
  if (v instanceof Date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  }
  return String(v).slice(0, 10);
}

module.exports = { TIMEZONE, nowParts, today, weekdayOf, isIsoDate, toDateOnly };
