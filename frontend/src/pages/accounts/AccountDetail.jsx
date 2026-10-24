import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { accountsApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { PageBreadcrumb } from '../../components/common/Common';
import Button, { buttonClass, Spinner } from '../../components/ui/Button';
import { Alert, Badge } from '../../components/ui/Feedback';
import Modal from '../../components/ui/Modal';
import SummaryCards from '../../components/finance/SummaryCards';
import LedgerTable from '../../components/finance/LedgerTable';
import { HandCoinsIcon, PencilIcon, PlusIcon, TrashIcon, WalletIcon } from '../../components/common/icons';
import { formatMoney } from '../../utils/format';

const SOURCES = [
  { value: '', label: 'All' },
  { value: 'expense', label: 'Expenses' },
  { value: 'advance', label: 'Advances' },
  { value: 'loan', label: 'Loans' },
];

export default function AccountDetail() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const navigate = useNavigate();
  const location = useLocation();
  const [account, setAccount] = useState(null);
  const [tx, setTx] = useState(null);
  const [txMeta, setTxMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [source, setSource] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    accountsApi
      .get(id)
      .then((r) => setAccount(r.data))
      .catch((e) => setError(e.message));
    accountsApi
      .transactions(id, { source, page, per_page: 20 })
      .then((r) => {
        setTx(r.data);
        setTxMeta(r.meta);
      })
      .catch(() => setTx([]));
  }, [id, page, source]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async () => {
    setDeleting(true);
    try {
      await accountsApi.remove(id);
      navigate('/accounts', { state: { notice: `Account "${account.title}" deleted.` } });
    } catch (e) {
      setError(e.message);
      setConfirm(false);
      setDeleting(false);
    }
  };

  if (!account) {
    return error ? (
      <>
        <PageBreadcrumb title="Account" items={[{ label: 'Accounts', to: '/accounts' }]} />
        <Alert variant="error">{error}</Alert>
      </>
    ) : (
      <div className="flex justify-center py-16 text-gray-400">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const a = account;
  return (
    <>
      <PageBreadcrumb title={a.title} items={[{ label: 'Accounts', to: '/accounts' }]} />
      <div className="space-y-6">
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

        <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl">
              <WalletIcon size={28} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{a.title}</h3>
                {a.is_default && <Badge color="primary">Default</Badge>}
                <Badge color={a.is_active ? 'success' : 'error'}>{a.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{a.account_number ? `A/C ${a.account_number}` : 'No account number'}</p>
              {a.description && <p className="mt-2 text-sm whitespace-pre-line text-gray-600 dark:text-gray-400">{a.description}</p>}
            </div>
            {isAdmin && (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link to={`/accounts/${a.id}/edit`} className={buttonClass('outline')}>
                  <PencilIcon size={18} />
                  Edit
                </Link>
                <Button
                  variant="outline"
                  className="hover:!text-error-500"
                  startIcon={<TrashIcon size={18} />}
                  onClick={() => setConfirm(true)}
                  disabled={a.transactions_count > 0}
                  title={a.transactions_count > 0 ? 'Accounts with transactions cannot be deleted. Mark it inactive instead.' : undefined}
                >
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>

        <SummaryCards
          items={[
            { label: 'Current balance', value: a.current_balance, tone: a.current_balance < 0 ? 'error' : 'brand' },
            { label: 'Initial amount', value: a.initial_amount },
            { label: 'Total credits', value: a.total_credits, tone: 'success' },
            { label: 'Total debits', value: a.total_debits, tone: 'error', hint: a.total_advances > 0 ? `Includes ${formatMoney(a.total_advances)} in advances & loans` : undefined },
          ]}
        />

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:px-6 dark:border-gray-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Transactions</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Expenses, salary advances and loans paid from this account, with the balance after each.</p>
              </div>
              {a.is_active && (
                <div className="flex flex-wrap gap-2">
                  {isAdmin && (
                    <Link to={`/advances/new?account_id=${a.id}`} className={buttonClass('outline')}>
                      <HandCoinsIcon size={18} />
                      Give advance / loan
                    </Link>
                  )}
                  <Link to={`/expenses/new?account_id=${a.id}`} className={buttonClass('primary')}>
                    <PlusIcon />
                    Add expense
                  </Link>
                </div>
              )}
            </div>
            <div role="tablist" aria-label="Transaction type" className="flex flex-wrap gap-2">
              {SOURCES.map((s) => {
                const n = txMeta?.counts ? (s.value ? txMeta.counts[s.value] : txMeta.counts.all) : null;
                const on = source === s.value;
                return (
                  <button
                    key={s.label}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => {
                      setSource(s.value);
                      setPage(1);
                    }}
                    className={`text-theme-xs rounded-full border px-3 py-1.5 font-medium transition ${
                      on ? 'border-gray-800 bg-gray-800 text-white dark:border-white/80 dark:bg-white/90 dark:text-gray-900' : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5'
                    }`}
                  >
                    {s.label}
                    {n !== null && <span className="ml-1 opacity-70">{n}</span>}
                  </button>
                );
              })}
            </div>
          </div>
          {tx === null ? (
            <div className="flex justify-center py-10 text-gray-400">
              <Spinner className="h-6 w-6" />
            </div>
          ) : tx.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">{source ? 'No transactions of this type.' : 'No transactions yet.'}</p>
          ) : (
            <LedgerTable rows={tx} canOpenAdvances={isAdmin} />
          )}
          {txMeta && txMeta.last_page > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-4 sm:px-6 dark:border-gray-800">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Page {txMeta.page} of {txMeta.last_page}
              </span>
              <Button variant="outline" disabled={page >= txMeta.last_page} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </div>
      </div>

      <Modal open={confirm} onClose={() => setConfirm(false)}>
        <h4 className="mb-2 pr-10 text-xl font-semibold text-gray-800 dark:text-white/90">Delete account?</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-800 dark:text-white/90">{a.title}</span> will be permanently removed.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" loading={deleting} onClick={remove}>
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
