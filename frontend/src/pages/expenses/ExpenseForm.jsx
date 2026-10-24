import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { accountsApi, categoriesApi, expensesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { ComponentCard, PageBreadcrumb } from '../../components/common/Common';
import Button, { buttonClass, Spinner } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Feedback';
import { Field, Input, inputClass, Select, TextArea } from '../../components/ui/Form';
import Avatar from '../../components/ui/Avatar';
import BillInput from '../../components/finance/BillInput';
import { formatDate, formatMoney } from '../../utils/format';

const MONEY = /^\d+(\.\d{1,2})?$/;

const todayLocal = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Full-page add (/expenses/new?account_id=) and edit (/expenses/:id/edit). */
export default function ExpenseForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expense, setExpense] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    amount: '',
    transaction_type: 'debit',
    account_id: params.get('account_id') || '',
    expense_date: todayLocal(),
    bill_number: '',
    category_id: '',
  });
  const [bill, setBill] = useState({ file: null, removed: false });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadAccounts = accountsApi.list({ per_page: 100 }).then((r) => r.data);
    const loadExpense = isEdit ? expensesApi.get(id).then((r) => r.data) : Promise.resolve(null);
    const loadCategories = categoriesApi.list().then((r) => r.data);
    Promise.all([loadAccounts, loadExpense, loadCategories])
      .then(([accs, exp, cats]) => {
        setAccounts(accs);
        setCategories(cats);
        if (exp) {
          setExpense(exp);
          setForm({
            title: exp.title,
            description: exp.description || '',
            amount: String(exp.amount),
            transaction_type: exp.transaction_type,
            account_id: exp.account_id,
            expense_date: exp.expense_date,
            bill_number: exp.bill_number || '',
            category_id: exp.category_id || '',
          });
        } else {
          // Pre-select the default account for everyday entries
          setForm((f) => ({ ...f, account_id: f.account_id || accs.find((a) => a.is_default && a.is_active)?.id || '' }));
        }
      })
      .catch((e) => setMessage(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  // Active accounts, plus the expense's current account even if it has since been deactivated
  const accountOptions = useMemo(
    () =>
      accounts
        .filter((a) => a.is_active || a.id === expense?.account_id)
        .map((a) => ({ value: a.id, label: `${a.title}${a.account_number ? ` (${a.account_number})` : ''}${a.is_active ? '' : ' - inactive'}` })),
    [accounts, expense],
  );
  // Active categories, plus the expense's current one even if deactivated
  const categoryOptions = useMemo(
    () => categories.filter((c) => c.is_active || c.id === expense?.category_id).map((c) => ({ value: c.id, label: c.is_active ? c.title : `${c.title} (inactive)` })),
    [categories, expense],
  );
  const selectedAccount = accounts.find((a) => a.id === form.account_id);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    const er = {};
    if (!form.title.trim()) er.title = 'Title is required';
    if (!String(form.amount).trim()) er.amount = 'Amount is required';
    else if (!MONEY.test(String(form.amount).trim()) || Number(form.amount) <= 0) er.amount = 'Enter an amount greater than 0 (up to 2 decimals)';
    if (!form.account_id) er.account_id = 'Select an account';
    if (!form.expense_date) er.expense_date = 'Date is required';
    setErrors(er);
    if (Object.keys(er).length) return;

    const payload = { ...form, amount: String(form.amount).trim(), bill_image: bill.file || undefined };
    if (isEdit && bill.removed) payload.remove_bill_image = true;

    setSaving(true);
    try {
      const res = isEdit ? await expensesApi.update(id, payload) : await expensesApi.create(payload);
      navigate('/expenses', { state: { notice: `${res.message}: ${res.data.title} (${formatMoney(res.data.amount)}).` } });
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setMessage(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const by = isEdit ? expense?.transaction_by : { name: user.full_name };

  return (
    <>
      <PageBreadcrumb title={isEdit ? 'Edit Expense' : 'Add Expense'} items={[{ label: 'Daily Expenses', to: '/expenses' }]} />
      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          {message && <Alert variant="error">{message}</Alert>}
          {!isEdit && accountOptions.length === 0 && (
            <Alert variant="warning" title="No active account">
              Every expense is posted to an account. Ask an admin to create one under Finance → Accounts.
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-2">
              <ComponentCard title="Expense details">
                <div className="space-y-5">
                  <Input label="Title" required value={form.title} onChange={set('title')} error={errors.title} placeholder="e.g. Office tea & snacks" maxLength={200} />

                  <div>
                    <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                      Type<span className="text-error-500">*</span>
                    </span>
                    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Transaction type">
                      {[
                        { value: 'debit', label: 'Debit', hint: 'Money out', on: 'border-error-500 bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400' },
                        { value: 'credit', label: 'Credit', hint: 'Money in', on: 'border-success-500 bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500' },
                      ].map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          role="radio"
                          aria-checked={form.transaction_type === t.value}
                          onClick={() => set('transaction_type')({ target: { value: t.value } })}
                          className={`rounded-lg border px-4 py-2.5 text-left transition ${
                            form.transaction_type === t.value ? t.on : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5'
                          }`}
                        >
                          <span className="block text-sm font-semibold">{t.label}</span>
                          <span className="text-theme-xs block opacity-80">{t.hint}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field label="Amount" required error={errors.amount}>
                      <div className="relative">
                        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">₹</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label="Amount"
                          aria-invalid={Boolean(errors.amount)}
                          value={form.amount}
                          onChange={set('amount')}
                          placeholder="0.00"
                          className={inputClass(errors.amount, 'pl-9')}
                        />
                      </div>
                    </Field>
                    <Input label="Date of Expense" required type="date" value={form.expense_date} onChange={set('expense_date')} error={errors.expense_date} />
                    <Select label="Account" required value={form.account_id} onChange={set('account_id')} error={errors.account_id} placeholder="Select an account" options={accountOptions} />
                    <Field
                      label="Category"
                      error={errors.category_id}
                      hint={
                        <>
                          Used to group spending.{' '}
                          <Link to="/expense-categories/new" className="text-brand-500 hover:text-brand-600 font-medium">
                            Add a category
                          </Link>
                        </>
                      }
                    >
                      <Select value={form.category_id} onChange={set('category_id')} placeholder="Uncategorized" options={categoryOptions} aria-label="Category" />
                    </Field>
                    <Input label="Bill Number" value={form.bill_number} onChange={set('bill_number')} error={errors.bill_number} placeholder="Optional" maxLength={100} />
                  </div>

                  <TextArea label="Description" rows={3} value={form.description} onChange={set('description')} error={errors.description} placeholder="Optional details" />
                </div>
              </ComponentCard>

              <ComponentCard title="Bill">
                <BillInput currentUrl={expense?.bill_image_url} onChange={(file, { removed }) => setBill({ file, removed })} error={errors.bill_image} />
              </ComponentCard>
            </div>

            <div className="space-y-6">
              {selectedAccount && (
                <ComponentCard title="Account">
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">{selectedAccount.title}</p>
                  {selectedAccount.account_number && <p className="text-theme-xs text-gray-500 dark:text-gray-400">A/C {selectedAccount.account_number}</p>}
                  <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Current balance</p>
                  <p className={`text-xl font-bold ${selectedAccount.current_balance < 0 ? 'text-error-600' : 'text-gray-800 dark:text-white/90'}`}>{formatMoney(selectedAccount.current_balance)}</p>
                  {!isEdit && MONEY.test(String(form.amount).trim()) && (
                    <p className="text-theme-xs mt-1 text-gray-500 dark:text-gray-400">
                      After saving: {formatMoney(selectedAccount.current_balance + (form.transaction_type === 'credit' ? 1 : -1) * Number(form.amount))}
                    </p>
                  )}
                </ComponentCard>
              )}

              <ComponentCard title="Transaction by">
                <div className="flex items-center gap-3">
                  <Avatar user={isEdit ? null : user} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">{by?.name || '—'}</p>
                    <p className="text-theme-xs text-gray-500 dark:text-gray-400">{isEdit ? `Recorded ${formatDate(expense?.created_at)}` : 'Set automatically to you'}</p>
                  </div>
                </div>
                {isEdit && expense?.updated_by && (
                  <p className="text-theme-xs mt-3 text-gray-500 dark:text-gray-400">
                    Last updated by {expense.updated_by.name}, {formatDate(expense.updated_at)}
                  </p>
                )}
              </ComponentCard>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link to="/expenses" className={buttonClass('outline')}>
              Cancel
            </Link>
            <Button type="submit" loading={saving} disabled={!isEdit && accountOptions.length === 0}>
              {isEdit ? 'Save changes' : 'Add expense'}
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
