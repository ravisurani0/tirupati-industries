import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { attendanceApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { PageBreadcrumb } from '../../components/common/Common';
import Avatar from '../../components/ui/Avatar';
import Button, { buttonClass, Spinner } from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ViewSwitch from '../../components/attendance/ViewSwitch';
import { Alert, Badge } from '../../components/ui/Feedback';
import { DateInput, inputClass, Select } from '../../components/ui/Form';
import { ChevronLeftSmallIcon, ChevronRightIcon, PencilIcon, PlayIcon, PlusIcon, SearchIcon, TrashIcon } from '../../components/common/icons';
import { addDays, ATTENDANCE_STATUSES, attendanceStatus, formatDayLong, formatHours, PAYROLL_TYPES, payrollLabel, STATUS_STYLES } from '../../utils/format';

const SUMMARY_CHIPS = [...ATTENDANCE_STATUSES, { value: 'not_marked', label: 'Not marked', color: 'light' }];

// Status colours shared with the month calendar (present = blue, absent = red, ...)
const chipTone = {
  ...Object.fromEntries(Object.entries(STATUS_STYLES).map(([k, v]) => [k, v.pill])),
  light: STATUS_STYLES.off.pill,
};

/** Inline status changer for an existing entry */
function StatusSelect({ row, busy, onChange }) {
  const s = row.attendance.attendance_status;
  return (
    <select
      value={s}
      disabled={busy}
      onChange={(e) => onChange(row, e.target.value)}
      aria-label={`Status for ${row.employee.full_name}`}
      className={`text-theme-xs cursor-pointer rounded-full border px-3 py-1 pr-7 font-medium focus:ring-3 focus:outline-hidden disabled:opacity-60 ${chipTone[s]}`}
    >
      {ATTENDANCE_STATUSES.map((o) => (
        <option key={o.value} value={o.value} className="bg-white text-gray-800 dark:bg-gray-900 dark:text-gray-300">
          {o.label}
        </option>
      ))}
    </select>
  );
}

function NotMarked({ row, date }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge color="light">{row.employee.payroll_type === 'hourly' ? 'Not marked (absent)' : 'Not marked'}</Badge>
      <Link to={`/attendance/new?employee_id=${row.employee.id}&date=${date}`} className="text-brand-500 hover:text-brand-600 text-theme-xs inline-flex items-center gap-1 font-medium">
        <PlusIcon size={14} />
        Add entry
      </Link>
    </div>
  );
}

export default function AttendanceDaily() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  const date = params.get('date') || ''; // empty = today (decided by the server's business timezone)
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [payrollType, setPayrollType] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');
  const [busyId, setBusyId] = useState(null);
  const [running, setRunning] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    return attendanceApi
      .daily({ date: date || undefined, page, per_page: 50, search: query, status, payroll_type: payrollType })
      .then((r) => {
        setRows(r.data);
        setMeta(r.meta);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [date, page, query, status, payrollType]);

  useEffect(() => {
    load();
  }, [load]);

  const shownDate = meta?.date || date;
  const goTo = (d) => {
    setPage(1);
    setNotice('');
    setParams(d ? { view: 'day', date: d } : { view: 'day' });
  };

  const changeStatus = async (row, value) => {
    setBusyId(row.attendance.id);
    setError('');
    try {
      await attendanceApi.update(row.attendance.id, { attendance_status: value });
      setNotice(`${row.employee.full_name} marked ${attendanceStatus(value).label.toLowerCase()}.`);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const runJob = async () => {
    setRunning(true);
    setError('');
    try {
      const r = await attendanceApi.generate(shownDate);
      setNotice(r.message);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await attendanceApi.remove(toDelete.attendance.id);
      setNotice(`Entry for ${toDelete.employee.full_name} deleted.`);
      setToDelete(null);
      load();
    } catch (e) {
      setError(e.message);
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const summary = meta?.summary;
  const isToday = shownDate && shownDate === meta?.today;

  const actions = (row) =>
    row.attendance ? (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => navigate(`/attendance/${row.attendance.id}/edit`)}
          className="hover:text-brand-500 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
          aria-label={`Edit entry for ${row.employee.full_name}`}
        >
          <PencilIcon size={18} />
        </button>
        <button
          type="button"
          onClick={() => setToDelete(row)}
          className="hover:text-error-500 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
          aria-label={`Delete entry for ${row.employee.full_name}`}
        >
          <TrashIcon size={18} />
        </button>
      </div>
    ) : null;

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

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          {/* Date bar */}
          <div className="flex flex-col gap-4 border-b border-gray-100 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between dark:border-gray-800">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => shownDate && goTo(addDays(shownDate, -1))} className={buttonClass('outline', 'sm', '!px-3')} aria-label="Previous day">
                <ChevronLeftSmallIcon />
              </button>
              <DateInput
                value={shownDate || ''}
                max={meta?.today}
                onChange={(e) => e.target.value && goTo(e.target.value)}
                aria-label="Attendance date"
                wrapperClassName="min-w-0 flex-1 sm:w-48 sm:flex-none"
              />
              <button
                type="button"
                onClick={() => shownDate && goTo(addDays(shownDate, 1))}
                disabled={isToday}
                className={buttonClass('outline', 'sm', '!px-3 disabled:opacity-40')}
                aria-label="Next day"
              >
                <ChevronRightIcon />
              </button>
              {!isToday && (
                <Button variant="ghost" onClick={() => goTo(meta?.today)}>
                  Today
                </Button>
              )}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">{formatDayLong(shownDate)}</p>
                <ViewSwitch view="day" onChange={() => setParams(shownDate ? { view: 'month', month: shownDate.slice(0, 7) } : { view: 'month' })} />
              </div>
              <div className="flex gap-3">
                {isAdmin && (
                  <Button variant="outline" startIcon={<PlayIcon />} loading={running} onClick={runJob} className="flex-1 sm:flex-none" title="Create present entries for fixed-salary employees">
                    Run daily job
                  </Button>
                )}
                <Link to={`/attendance/new?date=${shownDate || ''}`} className={buttonClass('primary', 'sm', 'flex-1 sm:flex-none')}>
                  <PlusIcon />
                  Add entry
                </Link>
              </div>
            </div>
          </div>

          {/* Summary chips (click to filter) */}
          {summary && (
            <div className="flex flex-wrap gap-2 border-b border-gray-100 px-4 py-4 sm:px-6 dark:border-gray-800">
              <button
                type="button"
                onClick={() => {
                  setStatus('');
                  setPage(1);
                }}
                className={`text-theme-xs rounded-full border px-3 py-1.5 font-medium ${status === '' ? 'border-gray-800 bg-gray-800 text-white dark:border-white/80 dark:bg-white/90 dark:text-gray-900' : chipTone.light}`}
              >
                All {summary.total}
              </button>
              {SUMMARY_CHIPS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => {
                    setStatus(status === c.value ? '' : c.value);
                    setPage(1);
                  }}
                  className={`text-theme-xs rounded-full border px-3 py-1.5 font-medium transition ${chipTone[c.value]} ${status === c.value ? 'ring-brand-500/40 ring-2' : ''}`}
                >
                  {c.label} {summary[c.value] ?? 0}
                </button>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="grid grid-cols-1 gap-3 border-b border-gray-100 px-4 py-4 sm:grid-cols-[1fr_200px] sm:px-6 dark:border-gray-800">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-gray-400" />
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee or mobile..." aria-label="Search" className={inputClass(false, 'pl-11')} />
            </div>
            <Select
              aria-label="Filter by payroll type"
              value={payrollType}
              onChange={(e) => {
                setPayrollType(e.target.value);
                setPage(1);
              }}
              placeholder="All payroll types"
              options={PAYROLL_TYPES}
            />
          </div>

          {loading && !meta ? (
            <div className="flex justify-center py-16 text-gray-400">
              <Spinner className="h-8 w-8" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">No employees for this day{status || query || payrollType ? ' with these filters' : ''}.</p>
          ) : (
            <div className={loading ? 'opacity-60 transition-opacity' : ''}>
              {/* Table on lg+ */}
              <div className="hidden max-w-full overflow-x-auto lg:block">
                <table className="min-w-full">
                  <thead className="border-b border-gray-100 dark:border-gray-800">
                    <tr>
                      {['Employee', 'Payroll', 'Status', 'Standard', 'Actual', 'Notes', ''].map((h) => (
                        <th key={h} className="text-theme-xs px-5 py-3 text-start font-medium whitespace-nowrap text-gray-500 dark:text-gray-400">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {rows.map((row) => (
                      <tr key={row.employee.id}>
                        <td className="px-5 py-3.5">
                          <Link to={`/employees/${row.employee.id}`} className="group flex items-center gap-3">
                            <Avatar user={row.employee} size="sm" />
                            <div>
                              <span className="text-theme-sm group-hover:text-brand-500 block font-medium text-gray-800 dark:text-white/90">{row.employee.full_name}</span>
                              <span className="text-theme-xs block text-gray-500 dark:text-gray-400">{row.employee.mobile_number}</span>
                            </div>
                          </Link>
                        </td>
                        <td className="text-theme-sm px-5 py-3.5 whitespace-nowrap text-gray-500 dark:text-gray-400">{payrollLabel(row.employee.payroll_type)}</td>
                        <td className="px-5 py-3.5">
                          {row.attendance ? (
                            <div className="flex items-center gap-2">
                              <StatusSelect row={row} busy={busyId === row.attendance.id} onChange={changeStatus} />
                              {row.attendance.auto_generated && <span className="text-theme-xs text-gray-400" title="Created by the daily job">auto</span>}
                            </div>
                          ) : (
                            <NotMarked row={row} date={shownDate} />
                          )}
                        </td>
                        <td className="text-theme-sm px-5 py-3.5 whitespace-nowrap text-gray-500 dark:text-gray-400">{row.attendance ? formatHours(row.attendance.standard_hours) : '—'}</td>
                        <td className="text-theme-sm px-5 py-3.5 whitespace-nowrap text-gray-800 dark:text-white/90">{row.attendance ? formatHours(row.attendance.actual_hours) : '—'}</td>
                        <td className="text-theme-sm max-w-[220px] truncate px-5 py-3.5 text-gray-500 dark:text-gray-400" title={row.attendance?.notes || ''}>
                          {row.attendance?.notes || '—'}
                        </td>
                        <td className="px-5 py-3.5">{actions(row)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards below lg */}
              <ul className="divide-y divide-gray-100 lg:hidden dark:divide-gray-800">
                {rows.map((row) => (
                  <li key={row.employee.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-start gap-3">
                      <Avatar user={row.employee} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-theme-sm truncate font-medium text-gray-800 dark:text-white/90">{row.employee.full_name}</p>
                        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                          {payrollLabel(row.employee.payroll_type)}
                          {row.attendance && ` · ${formatHours(row.attendance.actual_hours)} of ${formatHours(row.attendance.standard_hours)}`}
                        </p>
                        <div className="mt-2">{row.attendance ? <StatusSelect row={row} busy={busyId === row.attendance.id} onChange={changeStatus} /> : <NotMarked row={row} date={shownDate} />}</div>
                        {row.attendance?.notes && <p className="text-theme-xs mt-2 text-gray-500 dark:text-gray-400">{row.attendance.notes}</p>}
                      </div>
                      {actions(row)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-4 sm:px-6 dark:border-gray-800">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Page {meta.page} of {meta.last_page}
              </span>
              <Button variant="outline" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </div>

        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          Fixed-salary employees are marked <span className="font-medium">present</span> automatically every day. Change the status here if they are absent or on leave. Hourly employees are
          not added automatically; use <span className="font-medium">Add entry</span> for the days they work.
        </p>
      </div>

      <Modal open={Boolean(toDelete)} onClose={() => setToDelete(null)}>
        <h4 className="mb-2 pr-10 text-xl font-semibold text-gray-800 dark:text-white/90">Delete entry?</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          The {formatDayLong(shownDate)} entry for <span className="font-medium text-gray-800 dark:text-white/90">{toDelete?.employee.full_name}</span> will be removed.
          {toDelete?.employee.payroll_type === 'monthly_fixed' && ' Running the daily job again for this day will re-create it as present.'}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setToDelete(null)}>
            Cancel
          </Button>
          <Button variant="danger" loading={deleting} onClick={confirmDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
