/** Formats API timestamps (SQLite returns "YYYY-MM-DD HH:MM:SS" in UTC; MySQL/PG return ISO). */
export function formatDate(value, { withTime = true } = {}) {
  if (!value) return '—';
  const s = String(value);
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s.replace(' ', 'T')}Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return s;
  return withTime ? d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : d.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

/** ₹1,23,456.00 style amounts. Returns '—' for empty values. */
export function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '—';
  return Number(value).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });
}

/** Formats a YYYY-MM-DD date without timezone shifts. */
export function formatDateOnly(value) {
  if (!value) return '—';
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export const PAYROLL_TYPES = [
  { value: 'monthly_fixed', label: 'Monthly fixed' },
  { value: 'hourly', label: 'Hourly' },
];

export const payrollLabel = (v) => PAYROLL_TYPES.find((p) => p.value === v)?.label || v || '—';

export const ATTENDANCE_STATUSES = [
  { value: 'present', label: 'Present', color: 'primary' }, // blue
  { value: 'absent', label: 'Absent', color: 'error' }, // red
  { value: 'leave', label: 'Leave', color: 'warning' }, // orange
  { value: 'holiday', label: 'Holiday', color: 'purple' }, // purple
  { value: 'off', label: 'Off', color: 'light' }, // gray
];

/**
 * Tailwind classes per attendance status, used by the calendar and the day sheet.
 * chip: bordered event chip · dot: small swatch · pill: filter / select pill
 */
export const STATUS_STYLES = {
  present: {
    chip: 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
    dot: 'bg-brand-500',
    pill: 'border-brand-200 bg-brand-50 text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-400',
  },
  absent: {
    chip: 'border-error-500 bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400',
    dot: 'bg-error-500',
    pill: 'border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-500',
  },
  leave: {
    chip: 'border-warning-500 bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-orange-400',
    dot: 'bg-warning-500',
    pill: 'border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/15 dark:text-orange-400',
  },
  holiday: {
    chip: 'border-theme-purple-500 bg-theme-purple-500/10 text-theme-purple-500 dark:bg-theme-purple-500/20',
    dot: 'bg-theme-purple-500',
    pill: 'border-theme-purple-500/30 bg-theme-purple-500/10 text-theme-purple-500 dark:bg-theme-purple-500/20',
  },
  off: {
    chip: 'border-gray-400 bg-gray-100 text-gray-700 dark:border-gray-500 dark:bg-white/5 dark:text-gray-300',
    dot: 'bg-gray-400',
    pill: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-white/5 dark:text-gray-300',
  },
  not_marked: {
    chip: 'border-gray-300 bg-white text-gray-500 dark:border-gray-700 dark:bg-transparent dark:text-gray-400',
    dot: 'bg-gray-300',
    pill: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-white/5 dark:text-gray-300',
  },
};

export const attendanceStatus = (v) => ATTENDANCE_STATUSES.find((s) => s.value === v) || { value: v, label: 'Not marked', color: 'light' };

/** Shift a YYYY-MM-DD date by n days. */
export function addDays(isoDate, n) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** "Sat, 24 Oct 2026" for a YYYY-MM-DD date. */
export function formatDayLong(isoDate) {
  if (!isoDate) return '—';
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export const formatHours = (h) => (h === null || h === undefined ? '—' : `${Number(h)} h`);

/** ₹ amount with a sign: +₹500.00 for credit, −₹500.00 for debit. */
export const signedMoney = (amount, type) => `${type === 'credit' ? '+' : '−'}${formatMoney(amount)}`;

export const TRANSACTION_TYPES = [
  { value: 'debit', label: 'Debit (money out)' },
  { value: 'credit', label: 'Credit (money in)' },
];
