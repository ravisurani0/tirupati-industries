import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { advancesApi, employeesApi } from '../../api';
import { PageBreadcrumb } from '../../components/common/Common';
import Avatar from '../../components/ui/Avatar';
import Button, { buttonClass, Spinner } from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Alert, Badge } from '../../components/ui/Feedback';
import { inputClass, Select } from '../../components/ui/Form';
import SummaryCards from '../../components/finance/SummaryCards';
import { EyeOutlineIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon } from '../../components/common/icons';
import { formatDateOnly, formatMoney } from '../../utils/format';
import { formatMonth } from '../../utils/loan';

export const TypeBadge = ({ isLoan }) => <Badge color={isLoan ? 'purple' : 'primary'}>{isLoan ? 'Loan' : 'Advance'}</Badge>;
export const StatusBadge = ({ status }) => <Badge color={status === 'settled' ? 'success' : 'warning'}>{status === 'settled' ? 'Settled' : 'Open'}</Badge>;

const terms = (r) => (r.is_loan ? `${r.interest_rate}% · ${r.tenure_months} mo · ${formatMoney(r.monthly_installment)}/mo` : `Salary of ${formatMonth(r.repayment_start_month)}`);

export default function AdvancesList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState(location.state?.employeeId || '');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    employeesApi
      .list({ per_page: 100 })
      .then((r) => setEmployees(r.data))
      .catch(() => {});
  }, []);

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
    return advancesApi
      .list({ page, per_page: 20, employee_id: employeeId, type, status, search: query })
      .then((r) => {
        setRows(r.data);
        setMeta(r.meta);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, employeeId, type, status, query]);

  useEffect(() => {
    load();
  }, [load]);

  const filter = (fn) => (e) => {
    fn(e.target.value);
    setPage(1);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await advancesApi.remove(toDelete.id);
      setNotice(`${toDelete.is_loan ? 'Loan' : 'Advance'} for ${toDelete.employee.full_name} deleted.`);
      setToDelete(null);
      load();
    } catch (e) {
      setError(e.message);
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const actions = (r) => (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => navigate(`/advances/${r.id}`)} className="hover:text-brand-500 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5" aria-label="View">
        <EyeOutlineIcon size={18} />
      </button>
      <button type="button" onClick={() => navigate(`/advances/${r.id}/edit`)} className="hover:text-brand-500 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5" aria-label="Edit">
        <PencilIcon size={18} />
      </button>
      {r.recovered_amount === 0 && (
        <button type="button" onClick={() => setToDelete(r)} className="hover:text-error-500 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5" aria-label="Delete">
          <TrashIcon size={18} />
        </button>
      )}
    </div>
  );

  const s = meta?.summary;

  return (
    <>
      <PageBreadcrumb title="Advances & Loans" />
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

        <SummaryCards
          items={[
            { label: 'Total paid out', value: s?.total_given, tone: 'gray' },
            { label: 'Interest on loans', value: s?.total_interest, tone: 'brand' },
            { label: 'Outstanding to recover', value: s?.total_outstanding, tone: 'error' },
          ]}
        />

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:px-6 dark:border-gray-800">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Advances & loans</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{meta ? `${meta.total} records` : ' '}</p>
              </div>
              <Link to="/advances/new" className={buttonClass('primary', 'sm', 'shrink-0')}>
                <PlusIcon />
                <span className="hidden sm:inline">New advance / loan</span>
                <span className="sm:hidden">New</span>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1fr_220px_160px_160px]">
              <div className="relative col-span-2 lg:col-span-1">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-gray-400" />
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee..." aria-label="Search" className={inputClass(false, 'pl-11')} />
              </div>
              <Select aria-label="Filter by employee" value={employeeId} onChange={filter(setEmployeeId)} placeholder="All employees" options={employees.map((e) => ({ value: e.id, label: e.full_name }))} wrapperClassName="col-span-2 lg:col-span-1" />
              <Select
                aria-label="Filter by type"
                value={type}
                onChange={filter(setType)}
                placeholder="All types"
                options={[
                  { value: 'advance', label: 'Advances' },
                  { value: 'loan', label: 'Loans' },
                ]}
              />
              <Select
                aria-label="Filter by status"
                value={status}
                onChange={filter(setStatus)}
                placeholder="Any status"
                options={[
                  { value: 'open', label: 'Open' },
                  { value: 'settled', label: 'Settled' },
                ]}
              />
            </div>
          </div>

          {loading && !meta ? (
            <div className="flex justify-center py-16 text-gray-400">
              <Spinner className="h-8 w-8" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">No advances or loans{employeeId || type || status || query ? ' for these filters' : ' yet'}.</p>
          ) : (
            <div className={loading ? 'opacity-60' : ''}>
              <div className="hidden max-w-full overflow-x-auto lg:block">
                <table className="min-w-full">
                  <thead className="border-b border-gray-100 dark:border-gray-800">
                    <tr>
                      {['Employee', 'Type', 'Date', 'Amount', 'Terms', 'Outstanding', 'Status', ''].map((h) => (
                        <th key={h} className={`text-theme-xs px-5 py-3 font-medium whitespace-nowrap text-gray-500 dark:text-gray-400 ${['Amount', 'Outstanding'].includes(h) ? 'text-end' : 'text-start'}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td className="px-5 py-3.5">
                          <Link to={`/advances/${r.id}`} className="group flex items-center gap-3">
                            <Avatar user={r.employee} size="sm" />
                            <div>
                              <span className="text-theme-sm group-hover:text-brand-500 block font-medium text-gray-800 dark:text-white/90">{r.employee.full_name}</span>
                              <span className="text-theme-xs block text-gray-500 dark:text-gray-400">{r.account ? `From ${r.account.title}` : 'No account linked'}</span>
                            </div>
                          </Link>
                        </td>
                        <td className="px-5 py-3.5">
                          <TypeBadge isLoan={r.is_loan} />
                        </td>
                        <td className="text-theme-sm px-5 py-3.5 whitespace-nowrap text-gray-500 dark:text-gray-400">{formatDateOnly(r.transfer_date)}</td>
                        <td className="text-theme-sm px-5 py-3.5 text-end font-medium whitespace-nowrap text-gray-800 dark:text-white/90">{formatMoney(r.amount)}</td>
                        <td className="text-theme-xs px-5 py-3.5 whitespace-nowrap text-gray-500 dark:text-gray-400">{terms(r)}</td>
                        <td className="text-theme-sm px-5 py-3.5 text-end font-semibold whitespace-nowrap text-gray-800 dark:text-white/90">{formatMoney(r.outstanding)}</td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-5 py-3.5">{actions(r)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-gray-100 lg:hidden dark:divide-gray-800">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-start gap-3 px-4 py-4 sm:px-6">
                    <Avatar user={r.employee} size="sm" />
                    <Link to={`/advances/${r.id}`} className="min-w-0 flex-1">
                      <p className="text-theme-sm truncate font-medium text-gray-800 dark:text-white/90">{r.employee.full_name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <TypeBadge isLoan={r.is_loan} />
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="text-theme-xs mt-1 text-gray-500 dark:text-gray-400">
                        {formatDateOnly(r.transfer_date)} · {terms(r)}
                      </p>
                    </Link>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">{formatMoney(r.amount)}</span>
                      <span className="text-theme-xs text-gray-500 dark:text-gray-400">Due {formatMoney(r.outstanding)}</span>
                      <div className="-mr-2">{actions(r)}</div>
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
      </div>

      <Modal open={Boolean(toDelete)} onClose={() => setToDelete(null)}>
        <h4 className="mb-2 pr-10 text-xl font-semibold text-gray-800 dark:text-white/90">Delete {toDelete?.is_loan ? 'loan' : 'advance'}?</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          The {formatMoney(toDelete?.amount)} {toDelete?.is_loan ? 'loan' : 'advance'} to <span className="font-medium text-gray-800 dark:text-white/90">{toDelete?.employee.full_name}</span> will be removed
          {toDelete?.account ? ` and ${toDelete.account.title}'s balance restored` : ''}.
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
