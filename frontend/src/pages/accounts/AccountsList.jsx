import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { accountsApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { PageBreadcrumb } from '../../components/common/Common';
import { buttonClass, Spinner } from '../../components/ui/Button';
import { Alert, Badge } from '../../components/ui/Feedback';
import { inputClass, Select } from '../../components/ui/Form';
import SummaryCards from '../../components/finance/SummaryCards';
import { PlusIcon, SearchIcon, WalletIcon } from '../../components/common/icons';
import { formatMoney } from '../../utils/format';

export default function AccountsList() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const location = useLocation();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    accountsApi
      .list({ search: query, status, per_page: 100 })
      .then((r) => setRows(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [query, status]);

  const active = rows.filter((a) => a.is_active);
  const totalBalance = active.reduce((s, a) => s + a.current_balance, 0);

  return (
    <>
      <PageBreadcrumb title="Accounts" />
      <div className="space-y-4">
        {notice && (
          <Alert variant="success" onClose={() => setNotice('')}>
            {notice}
          </Alert>
        )}
        {error && <Alert variant="error">{error}</Alert>}

        <SummaryCards
          items={[
            { label: 'Total balance (active accounts)', value: totalBalance, tone: totalBalance < 0 ? 'error' : 'brand' },
            { label: 'Total credits', value: active.reduce((s, a) => s + a.total_credits, 0), tone: 'success' },
            { label: 'Total debits', value: active.reduce((s, a) => s + a.total_debits, 0), tone: 'error' },
          ]}
        />

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between dark:border-gray-800">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Payment accounts</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Salaries and daily expenses are paid from these accounts.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-gray-400" />
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or number..." aria-label="Search accounts" className={inputClass(false, 'pl-11 sm:w-60')} />
              </div>
              <Select
                aria-label="Filter by status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="All accounts"
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                wrapperClassName="sm:w-40"
              />
              {isAdmin && (
                <Link to="/accounts/new" className={buttonClass('primary', 'sm', 'w-full sm:w-auto')}>
                  <PlusIcon />
                  Add account
                </Link>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16 text-gray-400">
              <Spinner className="h-8 w-8" />
            </div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">{query || status ? 'No accounts match these filters.' : 'No accounts yet.'}</p>
              {isAdmin && !query && !status && (
                <Link to="/accounts/new" className={buttonClass('primary', 'sm', 'mt-4')}>
                  <PlusIcon />
                  Create your first account
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
              {rows.map((a) => (
                <Link
                  key={a.id}
                  to={`/accounts/${a.id}`}
                  className={`hover:border-brand-300 dark:hover:border-brand-800 flex flex-col rounded-xl border p-5 transition ${a.is_active ? 'border-gray-200 dark:border-gray-800' : 'border-dashed border-gray-300 opacity-70 dark:border-gray-700'
                    }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                        <WalletIcon />
                      </span>
                      <div className="min-w-0">
                        <h4 className="truncate text-base font-semibold text-gray-800 dark:text-white/90">{a.title}</h4>
                        <p className="text-theme-xs truncate text-gray-500 dark:text-gray-400">{a.account_number ? `A/C ${a.account_number}` : 'No account number'}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {a.is_default && <Badge color="primary">Default</Badge>}
                      {!a.is_active && <Badge color="error">Inactive</Badge>}
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">Current balance</p>
                  <p className={`text-2xl font-bold ${a.current_balance < 0 ? 'text-error-600 dark:text-error-500' : 'text-gray-800 dark:text-white/90'}`}>{formatMoney(a.current_balance)}</p>
                  {/* <div className="text-theme-xs mt-3 flex flex-wrap gap-x-4 gap-y-1 text-gray-500 dark:text-gray-400">
                    <span>Opening {formatMoney(a.initial_amount)}</span>
                    <span className="text-success-600 dark:text-success-500">+{formatMoney(a.total_credits)}</span>
                    <span className="text-error-600 dark:text-error-500">−{formatMoney(a.total_debits)}</span>
                  </div> */}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
