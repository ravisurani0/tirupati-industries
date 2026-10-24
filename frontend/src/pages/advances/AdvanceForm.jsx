import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { accountsApi, advancesApi, employeesApi } from '../../api';
import { ComponentCard, PageBreadcrumb } from '../../components/common/Common';
import Button, { buttonClass, Spinner } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Feedback';
import { Field, Input, inputClass, Select, Switch, TextArea } from '../../components/ui/Form';
import { formatMoney } from '../../utils/format';
import { calculate, formatMonth, schedule } from '../../utils/loan';

const MONEY = /^\d+(\.\d{1,2})?$/;

const todayLocal = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function RupeeInput({ label, required, error, hint, value, onChange, placeholder = '0.00', suffix }) {
  return (
    <Field label={label} required={required} error={error} hint={hint}>
      <div className="relative">
        {!suffix && <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">₹</span>}
        <input
          type="text"
          inputMode="decimal"
          aria-label={label}
          aria-invalid={Boolean(error)}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={inputClass(error, suffix ? 'pr-16' : 'pl-9')}
        />
        {suffix && <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-gray-400">{suffix}</span>}
      </div>
    </Field>
  );
}

function SwitchRow({ checked, onChange, label, hint, disabled }) {
  return (
    <div>
      <Switch checked={checked} onChange={onChange} label={label} disabled={disabled} />
      {hint && <p className="text-theme-xs mt-1 ml-14 text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}

/** Full-page add (/advances/new?employee_id=) and edit (/advances/:id/edit). */
export default function AdvanceForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [record, setRecord] = useState(null);
  const [form, setForm] = useState({
    employee_id: params.get('employee_id') || '',
    account_id: params.get('account_id') || '',
    amount: '',
    transfer_date: todayLocal(),
    description: '',
    recover_from_salary: true,
    repay_from_salary: true,
    is_loan: false,
    interest_rate: '',
    tenure_months: '',
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      employeesApi.list({ per_page: 100 }).then((r) => r.data),
      accountsApi.list({ per_page: 100 }).then((r) => r.data),
      isEdit ? advancesApi.get(id).then((r) => r.data) : Promise.resolve(null),
    ])
      .then(([emps, accs, rec]) => {
        setEmployees(emps);
        setAccounts(accs);
        if (rec) {
          setRecord(rec);
          setForm({
            employee_id: rec.employee_id,
            account_id: rec.account_id || '',
            amount: String(rec.amount),
            transfer_date: rec.transfer_date,
            description: rec.description || '',
            recover_from_salary: rec.recover_from_salary,
            repay_from_salary: rec.repay_from_salary,
            is_loan: rec.is_loan,
            interest_rate: rec.interest_rate === null ? '' : String(rec.interest_rate),
            tenure_months: rec.tenure_months === null ? '' : String(rec.tenure_months),
          });
        }
      })
      .catch((e) => setMessage(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };
  const setFlag = (field) => (v) => setForm((f) => ({ ...f, [field]: v }));

  const employeeOptions = employees.filter((e) => e.is_active || e.id === record?.employee_id).map((e) => ({ value: e.id, label: e.full_name }));
  const accountOptions = accounts.filter((a) => a.is_active || a.id === record?.account_id).map((a) => ({ value: a.id, label: `${a.title} · ${formatMoney(a.current_balance)}` }));
  const employee = employees.find((e) => e.id === form.employee_id);
  const account = accounts.find((a) => a.id === form.account_id);

  // Live preview of the figures the server will store
  const preview = useMemo(() => {
    if (!MONEY.test(String(form.amount).trim()) || Number(form.amount) <= 0) return null;
    return calculate({ amount: form.amount, transferDate: form.transfer_date, isLoan: form.is_loan, rate: form.interest_rate || 0, months: form.tenure_months });
  }, [form.amount, form.transfer_date, form.is_loan, form.interest_rate, form.tenure_months]);
  const plan = preview && form.is_loan ? schedule(preview) : [];

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    const er = {};
    if (!form.employee_id) er.employee_id = 'Select an employee';
    if (!String(form.amount).trim()) er.amount = 'Amount is required';
    else if (!MONEY.test(String(form.amount).trim()) || Number(form.amount) <= 0) er.amount = 'Enter an amount greater than 0 (up to 2 decimals)';
    if (!form.transfer_date) er.transfer_date = 'Transfer date is required';
    if (form.is_loan) {
      if (String(form.interest_rate).trim() === '') er.interest_rate = 'Interest % is required for a loan';
      else if (!MONEY.test(String(form.interest_rate).trim()) || Number(form.interest_rate) > 100) er.interest_rate = 'Enter 0 to 100 (up to 2 decimals)';
      if (!String(form.tenure_months).trim()) er.tenure_months = 'Time period is required for a loan';
      else if (!/^\d+$/.test(String(form.tenure_months).trim()) || Number(form.tenure_months) < 1 || Number(form.tenure_months) > 360) er.tenure_months = 'Enter 1 to 360 months';
    }
    setErrors(er);
    if (Object.keys(er).length) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const payload = {
      ...form,
      // Only the flag for the chosen type applies
      recover_from_salary: !form.is_loan && form.recover_from_salary,
      repay_from_salary: form.is_loan && form.repay_from_salary,
      amount: String(form.amount).trim(),
      account_id: form.account_id || null,
      interest_rate: form.is_loan ? String(form.interest_rate).trim() : null,
      tenure_months: form.is_loan ? Number(form.tenure_months) : null,
    };
    setSaving(true);
    try {
      const res = isEdit ? await advancesApi.update(id, payload) : await advancesApi.create(payload);
      navigate(`/advances/${res.data.id}`, { state: { notice: res.message } });
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setMessage(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const title = isEdit ? `Edit ${record?.is_loan ? 'Loan' : 'Advance'}` : 'New Advance / Loan';

  return (
    <>
      <PageBreadcrumb title={title} items={[{ label: 'Advances & Loans', to: '/advances' }]} />
      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          {message && <Alert variant="error">{message}</Alert>}
          {record?.recovered_amount > 0 && (
            <Alert variant="warning" title="Partly recovered">
              {formatMoney(record.recovered_amount)} has already been recovered from salary. The total can&apos;t be reduced below that.
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-2">
              <ComponentCard title="Payment details">
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Select label="Employee" required value={form.employee_id} onChange={set('employee_id')} error={errors.employee_id} placeholder="Select an employee" options={employeeOptions} />
                    <Select
                      label="Paid from account"
                      value={form.account_id}
                      onChange={set('account_id')}
                      error={errors.account_id}
                      placeholder="Not linked to an account"
                      options={accountOptions}
                      hint="Optional. The amount is deducted from this account's balance."
                    />
                    <RupeeInput label="Amount paid" required value={form.amount} onChange={set('amount')} error={errors.amount} />
                    <Input label="Transfer date" required type="date" value={form.transfer_date} onChange={set('transfer_date')} error={errors.transfer_date} />
                  </div>
                  <TextArea label="Description" rows={3} value={form.description} onChange={set('description')} error={errors.description} placeholder="Reason, terms agreed, etc." />
                </div>
              </ComponentCard>

              <ComponentCard title="Advance or loan">
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Type">
                    {[
                      { loan: false, label: 'Salary advance', hint: 'Settled from this month’s salary. No interest.' },
                      { loan: true, label: 'Loan', hint: 'Repaid in monthly installments with interest.' },
                    ].map((t) => {
                      const on = form.is_loan === t.loan;
                      return (
                        <button
                          key={t.label}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() =>
                            setForm((f) =>
                              f.is_loan === t.loan
                                ? f
                                : // Switching type: the new type's salary flag starts on
                                  { ...f, is_loan: t.loan, ...(t.loan ? { repay_from_salary: true } : { recover_from_salary: true }) },
                            )
                          }
                          className={`rounded-xl border p-4 text-left transition ${
                            on ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/15' : 'border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/5'
                          }`}
                        >
                          <span className={`block text-sm font-semibold ${on ? 'text-brand-600 dark:text-brand-400' : 'text-gray-800 dark:text-white/90'}`}>{t.label}</span>
                          <span className="text-theme-xs mt-0.5 block text-gray-500 dark:text-gray-400">{t.hint}</span>
                        </button>
                      );
                    })}
                  </div>

                  {form.is_loan && (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <RupeeInput label="Interest" required value={form.interest_rate} onChange={set('interest_rate')} error={errors.interest_rate} placeholder="e.g. 12" suffix="% / year" hint="Simple interest per year. Use 0 for an interest-free loan." />
                      <Field label="Time period" required error={errors.tenure_months} hint="Number of monthly installments.">
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="numeric"
                            aria-label="Time period"
                            aria-invalid={Boolean(errors.tenure_months)}
                            value={form.tenure_months}
                            onChange={set('tenure_months')}
                            placeholder="e.g. 6"
                            className={inputClass(errors.tenure_months, 'pr-20')}
                          />
                          <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-gray-400">months</span>
                        </div>
                      </Field>
                    </div>
                  )}

                  <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.02]">
                    {form.is_loan ? (
                      <SwitchRow
                        checked={form.repay_from_salary}
                        onChange={setFlag('repay_from_salary')}
                        label="Repay from salary"
                        hint="Monthly installments are deducted from salary. Turn off if the employee repays the loan separately (cash / bank)."
                      />
                    ) : (
                      <SwitchRow
                        checked={form.recover_from_salary}
                        onChange={setFlag('recover_from_salary')}
                        label="Recover from salary"
                        hint="The advance is deducted from this month's salary. Turn off if the employee returns it separately (cash / bank)."
                      />
                    )}
                  </div>
                </div>
              </ComponentCard>
            </div>

            {/* Live summary */}
            <div className="space-y-6">
              <ComponentCard title="Summary">
                {!preview ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Enter the amount{form.is_loan ? ', interest and months' : ''} to see the repayment.</p>
                ) : (
                  <div className="space-y-3 text-sm">
                    <Row label={form.is_loan ? 'Principal' : 'Advance'} value={formatMoney(form.amount)} />
                    {form.is_loan && <Row label={`Interest (${form.interest_rate || 0}% / yr × ${form.tenure_months} mo)`} value={formatMoney(preview.interest_amount)} />}
                    <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
                      <Row label="Total to recover" value={formatMoney(preview.total_repayable)} strong />
                    </div>
                    {form.is_loan ? (
                      <Row label="Monthly installment" value={`${formatMoney(preview.monthly_installment)} × ${preview.installments}`} />
                    ) : (
                      <Row label="Settled in salary of" value={formatMonth(preview.repayment_start_month)} />
                    )}
                    {form.is_loan && <Row label="Repayment" value={`${formatMonth(preview.repayment_start_month)} – ${formatMonth(plan[plan.length - 1]?.month)}`} />}
                    {account && <Row label={`${account.title} after payment`} value={formatMoney(account.current_balance - (isEdit && record?.account_id === account.id ? 0 : Number(form.amount)))} />}
                  </div>
                )}
              </ComponentCard>

              {form.is_loan && plan.length > 0 && (
                <ComponentCard title="Repayment schedule">
                  <ol className="custom-scrollbar max-h-72 space-y-1.5 overflow-y-auto text-sm">
                    {plan.map((p) => (
                      <li key={p.number} className="flex items-center justify-between gap-3">
                        <span className="text-gray-500 dark:text-gray-400">
                          {p.number}. {formatMonth(p.month)}
                        </span>
                        <span className="font-medium text-gray-800 dark:text-white/90">{formatMoney(p.amount)}</span>
                      </li>
                    ))}
                  </ol>
                </ComponentCard>
              )}

              {employee && (
                <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                  {employee.full_name} · {employee.payroll_type === 'hourly' ? 'Hourly' : `Monthly salary ${formatMoney(employee.monthly_salary)}`}
                  {preview && employee.payroll_type !== 'hourly' && employee.monthly_salary > 0 && preview.monthly_installment > employee.monthly_salary && (
                    <span className="text-warning-600 dark:text-orange-400 mt-1 block font-medium">The monthly deduction is more than the monthly salary.</span>
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link to={isEdit ? `/advances/${id}` : '/advances'} className={buttonClass('outline')}>
              Cancel
            </Link>
            <Button type="submit" loading={saving}>
              {isEdit ? 'Save changes' : form.is_loan ? 'Record loan' : 'Record advance'}
            </Button>
          </div>
        </form>
      )}
    </>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`text-right whitespace-nowrap ${strong ? 'text-base font-bold text-gray-800 dark:text-white/90' : 'font-medium text-gray-800 dark:text-white/90'}`}>{value}</span>
    </div>
  );
}
