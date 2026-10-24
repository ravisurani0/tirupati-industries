import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { employeesApi } from '../../api';
import { ComponentCard, PageBreadcrumb } from '../../components/common/Common';
import Button, { buttonClass, Spinner } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Feedback';
import { Field, Input, inputClass, Select, Switch, TextArea } from '../../components/ui/Form';
import { PAYROLL_TYPES } from '../../utils/format';

const EMPTY = {
  first_name: '',
  last_name: '',
  mobile_number: '',
  email: '',
  address: '',
  joining_date: '',
  payroll_type: 'monthly_fixed',
  monthly_salary: '',
  hourly_rate: '',
  fixed_working_hours: '',
  notes: '',
  is_active: true,
};

const PHONE = /^\+?[0-9\s()-]{7,20}$/;
const EMAIL = /^\S+@\S+\.\S+$/;
const MONEY = /^\d+(\.\d{1,2})?$/;

function validate(v) {
  const e = {};
  if (!v.first_name.trim()) e.first_name = 'First name is required';
  if (!v.last_name.trim()) e.last_name = 'Last name is required';
  if (!v.mobile_number.trim()) e.mobile_number = 'Mobile number is required';
  else if (!PHONE.test(v.mobile_number.trim())) e.mobile_number = 'Enter a valid mobile number';
  if (v.email && !EMAIL.test(v.email.trim())) e.email = 'Enter a valid email address';
  if (!v.payroll_type) e.payroll_type = 'Payroll type is required';
  for (const [k, label] of [['monthly_salary', 'Monthly salary'], ['hourly_rate', 'Hourly rate']]) {
    const val = String(v[k]).trim();
    if (val === '') e[k] = `${label} is required`;
    else if (!MONEY.test(val)) e[k] = `${label} must be a positive amount with up to 2 decimals`;
  }
  if (String(v.fixed_working_hours).trim() !== '') {
    const h = String(v.fixed_working_hours).trim();
    if (!MONEY.test(h) || Number(h) > 24) e.fixed_working_hours = 'Enter hours between 0 and 24 (up to 2 decimals)';
  }
  return e;
}

/** Amount input with a ₹ prefix */
function MoneyInput({ label, required, error, hint, value, onChange, placeholder = '0.00', suffix }) {
  return (
    <Field label={label} required={required} error={error} hint={hint}>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">₹</span>
        <input
          type="text"
          inputMode="decimal"
          aria-label={label}
          aria-invalid={Boolean(error)}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={inputClass(error, `pl-9 ${suffix ? 'pr-16' : ''}`)}
        />
        {suffix && <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-gray-400">{suffix}</span>}
      </div>
    </Field>
  );
}

/** Full-page create (/employees/new) and edit (/employees/:id/edit) form. */
export default function EmployeeForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    employeesApi
      .get(id)
      .then(({ data: e }) =>
        setForm({
          ...EMPTY,
          ...Object.fromEntries(Object.entries(e).filter(([k]) => k in EMPTY).map(([k, val]) => [k, val ?? (k === 'is_active' ? true : '')])),
          monthly_salary: e.monthly_salary ?? '',
          hourly_rate: e.hourly_rate ?? '',
          fixed_working_hours: e.fixed_working_hours ?? '',
        }),
      )
      .catch((err) => setMessage(err.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    const er = validate(form);
    setErrors(er);
    if (Object.keys(er).length) {
      setMessage('Please fix the highlighted fields.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const payload = {
      ...form,
      monthly_salary: String(form.monthly_salary).trim(),
      hourly_rate: String(form.hourly_rate).trim(),
      fixed_working_hours: String(form.fixed_working_hours).trim() || null,
      joining_date: form.joining_date || null,
      email: form.email.trim() || null,
    };

    setSaving(true);
    try {
      const res = isEdit ? await employeesApi.update(id, payload) : await employeesApi.create(payload);
      navigate(`/employees/${res.data.id}`, { state: { notice: res.message } });
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setMessage(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const title = isEdit ? 'Edit Employee' : 'Add Employee';

  return (
    <>
      <PageBreadcrumb title={title} items={[{ label: 'Employees', to: '/employees' }]} />

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          {message && <Alert variant="error">{message}</Alert>}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-2">
              <ComponentCard title="Personal details">
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Input label="First Name" required value={form.first_name} onChange={set('first_name')} error={errors.first_name} placeholder="First name" maxLength={100} />
                    <Input label="Last Name" required value={form.last_name} onChange={set('last_name')} error={errors.last_name} placeholder="Last name" maxLength={100} />
                    <Input label="Mobile Number" required type="tel" value={form.mobile_number} onChange={set('mobile_number')} error={errors.mobile_number} placeholder="+91 98765 43210" maxLength={20} />
                    <Input label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} placeholder="name@company.com" maxLength={255} />
                  </div>
                  <TextArea label="Address" rows={3} value={form.address} onChange={set('address')} error={errors.address} placeholder="Residential address" />
                </div>
              </ComponentCard>

              <ComponentCard title="Notes">
                <TextArea rows={4} value={form.notes} onChange={set('notes')} error={errors.notes} placeholder="Additional information" aria-label="Notes" />
              </ComponentCard>
            </div>

            <div className="space-y-6">
              <ComponentCard title="Employment">
                <div className="space-y-5">
                  <Input label="Joining Date" type="date" value={form.joining_date} onChange={set('joining_date')} error={errors.joining_date} />
                  <Input
                    label="Fixed Working Hours / Day"
                    type="text"
                    inputMode="decimal"
                    value={form.fixed_working_hours}
                    onChange={set('fixed_working_hours')}
                    error={errors.fixed_working_hours}
                    placeholder="e.g. 8"
                  />
                  <Switch checked={form.is_active} onChange={(v) => setForm((f) => ({ ...f, is_active: v }))} label={form.is_active ? 'Active' : 'Inactive'} />
                </div>
              </ComponentCard>

              <ComponentCard title="Payroll">
                <div className="space-y-5">
                  <Select label="Payroll Type" required value={form.payroll_type} onChange={set('payroll_type')} error={errors.payroll_type} options={PAYROLL_TYPES} />
                  <MoneyInput label="Monthly Salary" required value={form.monthly_salary} onChange={set('monthly_salary')} error={errors.monthly_salary} suffix="/ month" />
                  <MoneyInput
                    label="Hourly Rate"
                    required
                    value={form.hourly_rate}
                    onChange={set('hourly_rate')}
                    error={errors.hourly_rate}
                    suffix="/ hour"
                    hint="Reserved for future hourly payroll."
                  />
                </div>
              </ComponentCard>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link to={isEdit ? `/employees/${id}` : '/employees'} className={buttonClass('outline')}>
              Cancel
            </Link>
            <Button type="submit" loading={saving}>
              {isEdit ? 'Save changes' : 'Create employee'}
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
