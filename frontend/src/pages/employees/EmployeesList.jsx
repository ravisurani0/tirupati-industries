import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { employeesApi } from '../../api';
import { PageBreadcrumb } from '../../components/common/Common';
import Avatar from '../../components/ui/Avatar';
import Button, { buttonClass, Spinner } from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Alert, Badge } from '../../components/ui/Feedback';
import { inputClass, Select } from '../../components/ui/Form';
import { EyeOutlineIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon } from '../../components/common/icons';
import { formatDateOnly, formatMoney, PAYROLL_TYPES, payrollLabel } from '../../utils/format';

const PER_PAGE = 10;

function StatusBadge({ active }) {
  return <Badge color={active ? 'success' : 'error'}>{active ? 'Active' : 'Inactive'}</Badge>;
}

const pay = (e) => (e.payroll_type === 'hourly' ? `${formatMoney(e.hourly_rate)} / hr` : `${formatMoney(e.monthly_salary)} / mo`);

function RowActions({ employee, onDelete }) {
  const navigate = useNavigate();
  const btn = 'rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5';
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => navigate(`/employees/${employee.id}`)} className={`${btn} hover:text-brand-500`} aria-label={`View ${employee.full_name}`}>
        <EyeOutlineIcon size={18} />
      </button>
      <button type="button" onClick={() => navigate(`/employees/${employee.id}/edit`)} className={`${btn} hover:text-brand-500`} aria-label={`Edit ${employee.full_name}`}>
        <PencilIcon size={18} />
      </button>
      <button type="button" onClick={() => onDelete(employee)} className={`${btn} hover:text-error-500`} aria-label={`Delete ${employee.full_name}`}>
        <TrashIcon size={18} />
      </button>
    </div>
  );
}

export default function EmployeesList() {
  const location = useLocation();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, last_page: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [payrollType, setPayrollType] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');
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
    return employeesApi
      .list({ page, per_page: PER_PAGE, search: query, status, payroll_type: payrollType })
      .then((r) => {
        setRows(r.data);
        setMeta(r.meta);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, query, status, payrollType]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await employeesApi.remove(toDelete.id);
      setNotice(`${toDelete.full_name} was deleted.`);
      setToDelete(null);
      if (rows.length === 1 && page > 1) setPage((p) => p - 1);
      else load();
    } catch (e) {
      setError(e.message);
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const filtering = query || status || payrollType;

  return (
    <>
      <PageBreadcrumb title="Employees" />

      <div className="space-y-4">
        {notice && (
          <Alert variant="success" onClose={() => setNotice('')}>
            {notice}
          </Alert>
        )}
        {error && <Alert variant="error">{error}</Alert>}

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:px-6 dark:border-gray-800">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">All employees</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{meta.total} total</p>
              </div>
              <Link to="/employees/new" className={buttonClass('primary', 'sm', 'shrink-0')}>
                <PlusIcon />
                <span className="hidden sm:inline">Add employee</span>
                <span className="sm:hidden">Add</span>
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_180px_180px]">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, mobile, email..."
                  aria-label="Search employees"
                  className={inputClass(false, 'pl-11')}
                />
              </div>
              <Select
                aria-label="Filter by status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                placeholder="All statuses"
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
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
          </div>

          {loading ? (
            <div className="flex justify-center py-16 text-gray-400">
              <Spinner className="h-8 w-8" />
            </div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">{filtering ? 'No employees match these filters.' : 'No employees yet.'}</p>
              {!filtering && (
                <Link to="/employees/new" className={buttonClass('primary', 'sm', 'mt-4')}>
                  <PlusIcon />
                  Add your first employee
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Table on lg+ */}
              <div className="hidden max-w-full overflow-x-auto lg:block">
                <table className="min-w-full">
                  <thead className="border-b border-gray-100 dark:border-gray-800">
                    <tr>
                      {['Employee', 'Mobile', 'Payroll', 'Pay', 'Joined', 'Status', ''].map((h) => (
                        <th key={h} className="text-theme-xs px-5 py-3 text-start font-medium whitespace-nowrap text-gray-500 dark:text-gray-400">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {rows.map((e) => (
                      <tr key={e.id}>
                        <td className="px-5 py-4">
                          <Link to={`/employees/${e.id}`} className="group flex items-center gap-3">
                            <Avatar user={e} size="sm" />
                            <div>
                              <span className="text-theme-sm group-hover:text-brand-500 block font-medium text-gray-800 dark:text-white/90">{e.full_name}</span>
                              <span className="text-theme-xs block text-gray-500 dark:text-gray-400">{e.email || '—'}</span>
                            </div>
                          </Link>
                        </td>
                        <td className="text-theme-sm px-5 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">{e.mobile_number}</td>
                        <td className="text-theme-sm px-5 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">{payrollLabel(e.payroll_type)}</td>
                        <td className="text-theme-sm px-5 py-4 whitespace-nowrap text-gray-800 dark:text-white/90">{pay(e)}</td>
                        <td className="text-theme-sm px-5 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">{formatDateOnly(e.joining_date)}</td>
                        <td className="px-5 py-4">
                          <StatusBadge active={e.is_active} />
                        </td>
                        <td className="px-5 py-4">
                          <RowActions employee={e} onDelete={setToDelete} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards below lg */}
              <ul className="divide-y divide-gray-100 lg:hidden dark:divide-gray-800">
                {rows.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 px-4 py-4 sm:px-6">
                    <Link to={`/employees/${e.id}`} className="shrink-0">
                      <Avatar user={e} size="sm" />
                    </Link>
                    <Link to={`/employees/${e.id}`} className="min-w-0 flex-1">
                      <p className="text-theme-sm truncate font-medium text-gray-800 dark:text-white/90">{e.full_name}</p>
                      <p className="text-theme-xs truncate text-gray-500 dark:text-gray-400">{e.mobile_number}</p>
                      <p className="text-theme-xs mt-1 text-gray-800 dark:text-white/90">{pay(e)}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <StatusBadge active={e.is_active} />
                        <Badge color="light">{payrollLabel(e.payroll_type)}</Badge>
                      </div>
                    </Link>
                    <RowActions employee={e} onDelete={setToDelete} />
                  </li>
                ))}
              </ul>
            </>
          )}

          {meta.last_page > 1 && (
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
      </div>

      <Modal open={Boolean(toDelete)} onClose={() => setToDelete(null)}>
        <h4 className="mb-2 pr-10 text-xl font-semibold text-gray-800 dark:text-white/90">Delete employee?</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-800 dark:text-white/90">{toDelete?.full_name}</span> will be permanently removed. This cannot be undone.
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
