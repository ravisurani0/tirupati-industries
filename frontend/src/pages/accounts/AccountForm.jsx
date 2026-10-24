import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { accountsApi } from '../../api';
import { ComponentCard, PageBreadcrumb } from '../../components/common/Common';
import Button, { buttonClass, Spinner } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Feedback';
import { Field, Input, inputClass, Switch, TextArea } from '../../components/ui/Form';
import { formatMoney } from '../../utils/format';

const MONEY = /^\d+(\.\d{1,2})?$/;
const EMPTY = { title: '', description: '', account_number: '', initial_amount: '', is_active: true, is_default: false };

/** Full-page create (/accounts/new) and edit (/accounts/:id/edit). */
export default function AccountForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [account, setAccount] = useState(null);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    accountsApi
      .get(id)
      .then(({ data }) => {
        setAccount(data);
        setForm({
          title: data.title,
          description: data.description || '',
          account_number: data.account_number || '',
          initial_amount: String(data.initial_amount),
          is_active: data.is_active,
          is_default: data.is_default,
        });
      })
      .catch((e) => setMessage(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!form.title.trim()) er.title = 'Title is required';
    if (String(form.initial_amount).trim() === '') er.initial_amount = 'Initial amount is required';
    else if (!MONEY.test(String(form.initial_amount).trim())) er.initial_amount = 'Enter an amount with up to 2 decimals';
    setErrors(er);
    if (Object.keys(er).length) return;

    setSaving(true);
    setMessage('');
    try {
      const payload = { ...form, initial_amount: String(form.initial_amount).trim(), is_default: form.is_active && form.is_default };
      const res = isEdit ? await accountsApi.update(id, payload) : await accountsApi.create(payload);
      navigate(`/accounts/${res.data.id}`, { state: { notice: res.message } });
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageBreadcrumb title={isEdit ? 'Edit Account' : 'Add Account'} items={[{ label: 'Accounts', to: '/accounts' }]} />
      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          {message && <Alert variant="error">{message}</Alert>}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <ComponentCard title="Account details" className="xl:col-span-2">
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Input label="Title" required value={form.title} onChange={set('title')} error={errors.title} placeholder="e.g. Cash box, HDFC Current" maxLength={150} />
                  <Input label="Account Number" value={form.account_number} onChange={set('account_number')} error={errors.account_number} placeholder="Optional" maxLength={50} />
                </div>
                <Field label="Initial Amount" required error={errors.initial_amount} hint="Opening balance when the account is added to EMS.">
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">₹</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label="Initial amount"
                      aria-invalid={Boolean(errors.initial_amount)}
                      value={form.initial_amount}
                      onChange={set('initial_amount')}
                      placeholder="0.00"
                      className={inputClass(errors.initial_amount, 'pl-9')}
                    />
                  </div>
                </Field>
                <TextArea label="Description" rows={3} value={form.description} onChange={set('description')} error={errors.description} placeholder="What is this account used for?" />
              </div>
            </ComponentCard>

            <div className="space-y-6">
              <ComponentCard title="Status">
                <div className="space-y-5">
                  <div>
                    <Switch checked={form.is_active} onChange={(v) => setForm((f) => ({ ...f, is_active: v, is_default: v ? f.is_default : false }))} label="Active" />
                    <p className="text-theme-xs mt-1.5 text-gray-500 dark:text-gray-400">Inactive accounts keep their history but can&apos;t receive new transactions.</p>
                  </div>
                  <div>
                    <Switch checked={form.is_default} disabled={!form.is_active} onChange={(v) => setForm((f) => ({ ...f, is_default: v }))} label="Default for everyday entries" />
                    <p className="text-theme-xs mt-1.5 text-gray-500 dark:text-gray-400">Pre-selected when adding a daily expense. Only one account can be the default.</p>
                  </div>
                </div>
              </ComponentCard>
              {account && (
                <ComponentCard title="Balance">
                  <p className="text-2xl font-bold text-gray-800 dark:text-white/90">{formatMoney(account.current_balance)}</p>
                  <p className="text-theme-xs mt-1 text-gray-500 dark:text-gray-400">
                    {account.transactions_count} transaction{account.transactions_count === 1 ? '' : 's'}. Changing the initial amount changes the balance by the same difference.
                  </p>
                </ComponentCard>
              )}
            </div>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link to={isEdit ? `/accounts/${id}` : '/accounts'} className={buttonClass('outline')}>
              Cancel
            </Link>
            <Button type="submit" loading={saving}>
              {isEdit ? 'Save changes' : 'Create account'}
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
