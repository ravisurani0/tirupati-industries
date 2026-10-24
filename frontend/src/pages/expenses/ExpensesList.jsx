import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { accountsApi, categoriesApi, expensesApi } from '../../api';
import { PageBreadcrumb } from '../../components/common/Common';
import Button, { buttonClass, Spinner } from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Feedback';
import { DateInput, inputClass, Select } from '../../components/ui/Form';
import SummaryCards from '../../components/finance/SummaryCards';
import ExpensesTable from '../../components/finance/ExpensesTable';
import { PlusIcon, SearchIcon } from '../../components/common/icons';
import { formatMoney } from '../../utils/format';

const PER_PAGE = 20;

/** First and last day of the current month as YYYY-MM-DD (local time). */
function thisMonth() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return { from: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`, to: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(last)}` };
}

export default function ExpensesList() {
  const location = useLocation();
  // Opened from a category's expense count: show that category across all dates
  const fromCategory = location.state?.categoryId || '';
  const [range, setRange] = useState(() => (fromCategory ? { from: '', to: '' } : thisMonth()));
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(fromCategory);
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    accountsApi
      .list({ per_page: 100 })
      .then((r) => setAccounts(r.data))
      .catch(() => {});
    categoriesApi
      .list()
      .then((r) => setCategories(r.data))
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
    return expensesApi
      .list({ page, per_page: PER_PAGE, from: range.from, to: range.to, account_id: accountId, category_id: categoryId, type, search: query })
      .then((r) => {
        setRows(r.data);
        setMeta(r.meta);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, range, accountId, categoryId, type, query]);

  useEffect(() => {
    load();
  }, [load]);

  const setFilter = (fn) => (e) => {
    fn(e.target.value);
    setPage(1);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await expensesApi.remove(toDelete.id);
      setNotice(`"${toDelete.title}" deleted.`);
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

  const s = meta?.summary;
  const filtering = accountId || categoryId || type || query || range.from !== thisMonth().from || range.to !== thisMonth().to;

  return (
    <>
      <PageBreadcrumb title="Daily Expenses" />
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
            { label: 'Total debits (money out)', value: s?.total_debits, tone: 'error' },
            { label: 'Total credits (money in)', value: s?.total_credits, tone: 'success' },
            { label: 'Net', value: s?.net, tone: s && s.net < 0 ? 'error' : 'success', hint: 'Credits − debits for the filters below' },
          ]}
        />

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:px-6 dark:border-gray-800">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Expenses</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{meta ? `${meta.total} entries` : ' '}</p>
              </div>
              <Link to="/expenses/new" className={buttonClass('primary', 'sm', 'shrink-0')}>
                <PlusIcon />
                <span className="hidden sm:inline">Add expense</span>
                <span className="sm:hidden">Add</span>
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-[1fr_165px_165px_180px_180px_160px]">
              <div className="relative col-span-2 lg:col-span-3 2xl:col-span-1">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-gray-400" />
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, bill no..." aria-label="Search expenses" className={inputClass(false, 'pl-11')} />
              </div>
              <DateInput aria-label="From date" value={range.from} max={range.to || undefined} onChange={setFilter((v) => setRange((r) => ({ ...r, from: v })))} />
              <DateInput aria-label="To date" value={range.to} min={range.from || undefined} onChange={setFilter((v) => setRange((r) => ({ ...r, to: v })))} />
              <Select
                aria-label="Filter by category"
                value={categoryId}
                onChange={setFilter(setCategoryId)}
                placeholder="All categories"
                options={[{ value: 'none', label: 'Uncategorized' }, ...categories.map((c) => ({ value: c.id, label: c.is_active ? c.title : `${c.title} (inactive)` }))]}
              />
              <Select aria-label="Filter by account" value={accountId} onChange={setFilter(setAccountId)} placeholder="All accounts" options={accounts.map((a) => ({ value: a.id, label: a.title }))} />
              <Select
                aria-label="Filter by type"
                value={type}
                onChange={setFilter(setType)}
                placeholder="Debit & credit"
                options={[
                  { value: 'debit', label: 'Debit only' },
                  { value: 'credit', label: 'Credit only' },
                ]}
              />
            </div>
            {filtering && (
              <button
                type="button"
                onClick={() => {
                  setRange(thisMonth());
                  setAccountId('');
                  setCategoryId('');
                  setType('');
                  setSearch('');
                  setPage(1);
                }}
                className="text-brand-500 hover:text-brand-600 self-start text-sm font-medium"
              >
                Reset to this month
              </button>
            )}
          </div>

          {loading && !meta ? (
            <div className="flex justify-center py-16 text-gray-400">
              <Spinner className="h-8 w-8" />
            </div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No expenses for these filters.</p>
              {accounts.length === 0 && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Create an <Link to="/accounts" className="text-brand-500 font-medium">account</Link> first. Every expense is paid from an account.
                </p>
              )}
            </div>
          ) : (
            <div className={loading ? 'opacity-60 transition-opacity' : ''}>
              <ExpensesTable rows={rows} onDelete={setToDelete} />
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
        <h4 className="mb-2 pr-10 text-xl font-semibold text-gray-800 dark:text-white/90">Delete expense?</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-800 dark:text-white/90">{toDelete?.title}</span> ({toDelete && formatMoney(toDelete.amount)}) and its bill will be removed, and the balance of{' '}
          <span className="font-medium">{toDelete?.account.title}</span> will be updated.
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
