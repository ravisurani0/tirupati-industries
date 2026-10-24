import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { attendanceApi, employeesApi } from '../../api';
import { PageBreadcrumb } from '../../components/common/Common';
import { buttonClass, Spinner } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Feedback';
import { Select } from '../../components/ui/Form';
import ViewSwitch from '../../components/attendance/ViewSwitch';
import { ChevronLeftSmallIcon, ChevronRightIcon, PlusIcon } from '../../components/common/icons';
import { ATTENDANCE_STATUSES, attendanceStatus, formatHours, PAYROLL_TYPES, STATUS_STYLES } from '../../utils/format';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STATUS_ORDER = Object.fromEntries(ATTENDANCE_STATUSES.map((s, i) => [s.value, i]));
const MAX_CHIPS = 3;

const pad = (n) => String(n).padStart(2, '0');

function shiftMonth(month, n) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

function monthTitle(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/** 5-6 week rows of { date, day, inMonth } starting on Sunday. */
function buildWeeks(month) {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells = Math.ceil((first.getUTCDay() + daysInMonth) / 7) * 7;
  const out = [];
  for (let i = 0; i < cells; i += 1) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    out.push({ date: d.toISOString().slice(0, 10), day: d.getUTCDate(), inMonth: d.getUTCMonth() === m - 1 });
  }
  return Array.from({ length: cells / 7 }, (_, w) => out.slice(w * 7, w * 7 + 7));
}

/** Coloured event chip (left border = status colour) */
function Chip({ entry, showName = true, onClick }) {
  const label = attendanceStatus(entry.attendance_status).label;
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${entry.name} · ${label} · ${formatHours(entry.actual_hours)}`}
      className={`text-theme-xs flex w-full items-center gap-1 truncate rounded-md border-l-[3px] px-1.5 py-1 text-left font-medium transition hover:brightness-95 ${STATUS_STYLES[entry.attendance_status].chip}`}
    >
      <span className="truncate">{showName ? entry.name : label}</span>
      {!showName && <span className="ml-auto shrink-0 opacity-75">{formatHours(entry.actual_hours)}</span>}
    </button>
  );
}

export default function AttendanceCalendar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  const [data, setData] = useState(null);
  const monthParam = params.get('month') || ''; // empty = current month (server timezone)
  const month = monthParam || data?.today?.slice(0, 7) || '';
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState('');
  const [status, setStatus] = useState('');
  const [payrollType, setPayrollType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');

  useEffect(() => {
    employeesApi
      .list({ per_page: 100 })
      .then((r) => setEmployees(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    attendanceApi
      .calendar({ month: monthParam || undefined, employee_id: employeeId, status, payroll_type: payrollType })
      .then((r) => alive && setData(r.data))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [monthParam, employeeId, status, payrollType]);

  const shownMonth = data?.month || month;
  const weeks = useMemo(() => (shownMonth ? buildWeeks(shownMonth) : []), [shownMonth]);
  const singleEmployee = Boolean(employeeId);

  const goMonth = (m) => setParams({ view: 'month', month: m });
  const openDay = (date) => navigate(`/attendance?view=day&date=${date}`);
  const openEntry = (e, entry) => {
    e.stopPropagation();
    navigate(`/attendance/${entry.id}/edit`);
  };

  const totals = data?.totals;
  const isCurrentMonth = data && shownMonth === data.today.slice(0, 7);
  const filtering = employeeId || status || payrollType;

  return (
    <>
      <PageBreadcrumb title="Attendance" />

      <div className="space-y-4">
        {notice && (
          <Alert variant="success" onClose={() => setNotice('')}>
            {notice}
          </Alert>
        )}
        {error && (
          <Alert variant="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          {/* Toolbar (calendar.html header) */}
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => shownMonth && goMonth(shiftMonth(shownMonth, -1))} className={buttonClass('outline', 'sm', '!px-3')} aria-label="Previous month">
                <ChevronLeftSmallIcon />
              </button>
              <button type="button" onClick={() => shownMonth && goMonth(shiftMonth(shownMonth, 1))} className={buttonClass('outline', 'sm', '!px-3')} aria-label="Next month">
                <ChevronRightIcon />
              </button>
              {!isCurrentMonth && data && (
                <button type="button" onClick={() => goMonth(data.today.slice(0, 7))} className={buttonClass('ghost')}>
                  Today
                </button>
              )}
              <Link to="/attendance/new" className={buttonClass('primary', 'sm', 'ml-1')}>
                <PlusIcon />
                <span className="hidden sm:inline">Add entry</span>
              </Link>
            </div>
            <h3 className="order-first text-lg font-semibold text-gray-800 lg:order-none dark:text-white/90">{shownMonth ? monthTitle(shownMonth) : ''}</h3>
            <ViewSwitch view="month" onChange={() => navigate(`/attendance?view=day${isCurrentMonth || !shownMonth ? '' : `&date=${shownMonth}-01`}`)} />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 gap-3 border-t border-gray-100 px-4 py-4 sm:grid-cols-3 sm:px-6 dark:border-gray-800">
            <Select
              aria-label="Filter by employee"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="All employees"
              options={employees.map((e) => ({ value: e.id, label: e.full_name }))}
            />
            <Select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="All statuses"
              options={ATTENDANCE_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
            />
            <Select aria-label="Filter by payroll type" value={payrollType} onChange={(e) => setPayrollType(e.target.value)} placeholder="All payroll types" options={PAYROLL_TYPES} />
          </div>

          {/* Legend with month totals; click to filter by status */}
          <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 px-4 py-3 sm:px-6 dark:border-gray-800">
            {ATTENDANCE_STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStatus(status === s.value ? '' : s.value)}
                aria-pressed={status === s.value}
                className={`text-theme-xs inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition ${STATUS_STYLES[s.value].pill} ${
                  status === s.value ? 'ring-brand-500/40 ring-2' : ''
                } ${status && status !== s.value ? 'opacity-50' : ''}`}
              >
                <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[s.value].dot}`} />
                {s.label}
                {totals && <span className="opacity-75">{totals[s.value] || 0}</span>}
              </button>
            ))}
            {filtering && (
              <button
                type="button"
                onClick={() => {
                  setEmployeeId('');
                  setStatus('');
                  setPayrollType('');
                }}
                className="text-theme-xs text-brand-500 hover:text-brand-600 ml-1 font-medium"
              >
                Clear filters
              </button>
            )}
            {loading && <Spinner className="ml-auto h-4 w-4 text-gray-400" />}
          </div>

          {/* Month grid */}
          <div className={`border-t border-gray-100 dark:border-gray-800 ${loading && data ? 'opacity-60 transition-opacity' : ''}`}>
            <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-3 text-center text-xs font-medium tracking-wide text-gray-500 uppercase sm:text-sm dark:text-gray-400">
                  <span className="sm:hidden">{d[0]}</span>
                  <span className="hidden sm:inline">{d}</span>
                </div>
              ))}
            </div>

            {!data && loading ? (
              <div className="flex justify-center py-24 text-gray-400">
                <Spinner className="h-8 w-8" />
              </div>
            ) : (
              weeks.map((week) => (
                <div key={week[0].date} className="grid grid-cols-7 border-b border-gray-100 last:border-b-0 dark:border-gray-800">
                  {week.map((cell) => {
                    const entries = cell.inMonth ? [...(data?.days?.[cell.date] || [])].sort((a, b) => STATUS_ORDER[a.attendance_status] - STATUS_ORDER[b.attendance_status] || a.name.localeCompare(b.name)) : [];
                    const isToday = data && cell.date === data.today;
                    const isFuture = data && cell.date > data.today;
                    const counts = entries.reduce((acc, e) => ({ ...acc, [e.attendance_status]: (acc[e.attendance_status] || 0) + 1 }), {});
                    const extra = entries.length - MAX_CHIPS;
                    return (
                      <div
                        key={cell.date}
                        role={cell.inMonth ? 'button' : undefined}
                        tabIndex={cell.inMonth ? 0 : undefined}
                        onClick={() => cell.inMonth && openDay(cell.date)}
                        onKeyDown={(e) => cell.inMonth && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openDay(cell.date))}
                        aria-label={cell.inMonth ? `${cell.date}: ${entries.length} entries` : undefined}
                        className={`group relative min-h-[64px] border-r border-gray-100 p-1 last:border-r-0 sm:min-h-[120px] sm:p-2 dark:border-gray-800 ${
                          cell.inMonth ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]' : 'bg-gray-50/50 dark:bg-white/[0.01]'
                        } ${isToday ? 'bg-brand-25 dark:bg-brand-500/5' : ''}`}
                      >
                        <div className="mb-1 flex items-start justify-between gap-1">
                          {/* Per-status counts so absences stay visible on busy days (tablet / desktop) */}
                          <div className="hidden flex-wrap gap-1 pt-0.5 sm:flex">
                            {!singleEmployee &&
                              ATTENDANCE_STATUSES.filter((s) => counts[s.value]).map((s) => (
                                <span
                                  key={s.value}
                                  title={`${counts[s.value]} ${s.label.toLowerCase()}`}
                                  className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold text-white ${STATUS_STYLES[s.value].dot}`}
                                >
                                  {counts[s.value]}
                                </span>
                              ))}
                          </div>
                          <span
                            className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs sm:text-sm ${
                              isToday ? 'bg-brand-500 font-semibold text-white' : cell.inMonth ? (isFuture ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300') : 'text-gray-300 dark:text-gray-600'
                            }`}
                          >
                            {cell.day}
                          </span>
                        </div>

                        {entries.length > 0 && (
                          <>
                            {/* Phones: coloured dots with counts */}
                            <div className="flex flex-wrap justify-center gap-0.5 sm:hidden">
                              {ATTENDANCE_STATUSES.filter((s) => counts[s.value]).map((s) => (
                                <span key={s.value} className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold text-white ${STATUS_STYLES[s.value].dot}`}>
                                  {singleEmployee ? '' : counts[s.value]}
                                </span>
                              ))}
                            </div>

                            {/* Tablet / desktop: event chips */}
                            <div className="hidden space-y-1 sm:block">
                              {entries.slice(0, MAX_CHIPS).map((entry) => (
                                <Chip key={entry.id} entry={entry} showName={!singleEmployee} onClick={(e) => openEntry(e, entry)} />
                              ))}
                              {extra > 0 && (
                                <p className="text-theme-xs group-hover:text-brand-500 px-1 font-medium text-gray-500 dark:text-gray-400">
                                  +{extra} more
                                </p>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          Click a day to open its attendance sheet, or a name to edit that entry. Hourly employees appear only on days an entry was added for them.
        </p>
      </div>
    </>
  );
}
