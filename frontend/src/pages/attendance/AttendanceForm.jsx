import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { attendanceApi, employeesApi } from '../../api';
import { ComponentCard, PageBreadcrumb } from '../../components/common/Common';
import Avatar from '../../components/ui/Avatar';
import Button, { buttonClass, Spinner } from '../../components/ui/Button';
import { Alert, Badge } from '../../components/ui/Feedback';
import { Input, Select, TextArea } from '../../components/ui/Form';
import { ATTENDANCE_STATUSES, attendanceStatus, formatDate, formatDayLong, payrollLabel } from '../../utils/format';

const HOURS = /^\d+(\.\d{1,2})?$/;
const DEFAULT_HOURS = 8;

/**
 * Full-page add (/attendance/new?employee_id=&date=) and edit (/attendance/:id/edit) form.
 * Keyed by route so going from "add" to "edit the existing entry" starts with fresh state.
 */
export default function AttendanceFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  return <AttendanceForm key={id || `new:${params.toString()}`} />;
}

function AttendanceForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [record, setRecord] = useState(null);
  const [form, setForm] = useState({
    employee_id: params.get('employee_id') || '',
    attendance_date: params.get('date') || '',
    attendance_status: 'present',
    standard_hours: '',
    actual_hours: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [existingId, setExistingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load the record (edit) or the employee list (add)
  useEffect(() => {
    if (isEdit) {
      attendanceApi
        .get(id)
        .then(({ data }) => {
          setRecord(data);
          setForm({
            employee_id: data.employee_id,
            attendance_date: data.attendance_date,
            attendance_status: data.attendance_status,
            standard_hours: String(data.standard_hours ?? ''),
            actual_hours: String(data.actual_hours ?? ''),
            notes: data.notes || '',
          });
        })
        .catch((e) => setMessage(e.message))
        .finally(() => setLoading(false));
      return;
    }
    employeesApi
      .list({ status: 'active', per_page: 100 })
      .then((r) => setEmployees(r.data))
      .catch((e) => setMessage(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const employee = useMemo(() => (isEdit ? record?.employee : employees.find((e) => e.id === form.employee_id)), [isEdit, record, employees, form.employee_id]);

  // Default the hours from the employee's fixed working hours when adding
  useEffect(() => {
    if (isEdit || !employee) return;
    setForm((f) => {
      const std = f.standard_hours !== '' ? f.standard_hours : String(employee.fixed_working_hours ?? DEFAULT_HOURS);
      return { ...f, standard_hours: std, actual_hours: f.actual_hours !== '' ? f.actual_hours : f.attendance_status === 'present' ? std : '0' };
    });
  }, [employee, isEdit]);

  const set = (field) => (e) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, [field]: value };
      // Keep actual hours sensible when the status changes
      if (field === 'attendance_status') next.actual_hours = value === 'present' ? f.standard_hours || f.actual_hours : '0';
      return next;
    });
    setErrors((er) => ({ ...er, [field]: undefined }));
    setExistingId(null);
  };

  const validate = () => {
    const e = {};
    if (!form.employee_id) e.employee_id = 'Select an employee';
    if (!form.attendance_date) e.attendance_date = 'Select a date';
    if (!form.attendance_status) e.attendance_status = 'Select a status';
    for (const [k, label] of [['standard_hours', 'Standard hours'], ['actual_hours', 'Actual hours']]) {
      const v = String(form[k]).trim();
      if (v !== '' && (!HOURS.test(v) || Number(v) > 24)) e[k] = `${label} must be between 0 and 24 (up to 2 decimals)`;
    }
    return e;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setExistingId(null);
    const er = validate();
    setErrors(er);
    if (Object.keys(er).length) return;

    const payload = {
      attendance_status: form.attendance_status,
      standard_hours: String(form.standard_hours).trim() || null,
      actual_hours: String(form.actual_hours).trim() || null,
      notes: form.notes.trim() || null,
    };

    setSaving(true);
    try {
      const res = isEdit ? await attendanceApi.update(id, payload) : await attendanceApi.create({ ...payload, employee_id: form.employee_id, attendance_date: form.attendance_date });
      navigate(`/attendance?date=${res.data.attendance_date}`, { state: { notice: `${res.message} for ${res.data.employee.full_name}.` } });
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setMessage(err.message);
      const dup = (err.errors || []).find((x) => x.existing_id);
      if (dup) setExistingId(dup.existing_id);
    } finally {
      setSaving(false);
    }
  };

  const title = isEdit ? 'Edit Attendance' : 'Add Attendance';
  const backTo = `/attendance${form.attendance_date ? `?date=${form.attendance_date}` : ''}`;

  return (
    <>
      <PageBreadcrumb title={title} items={[{ label: 'Attendance', to: backTo }]} />

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          {message && (
            <Alert variant="error">
              {message}
              {existingId && (
                <>
                  {' '}
                  <Link to={`/attendance/${existingId}/edit`} className="text-brand-500 font-medium underline">
                    Edit the existing entry
                  </Link>
                </>
              )}
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <ComponentCard title="Attendance details" className="xl:col-span-2">
              <div className="space-y-5">
                {isEdit ? (
                  <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                    <Avatar user={record?.employee} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">{record?.employee.full_name}</p>
                      <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                        {payrollLabel(record?.employee.payroll_type)} · {formatDayLong(record?.attendance_date)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Select
                      label="Employee"
                      required
                      value={form.employee_id}
                      onChange={set('employee_id')}
                      error={errors.employee_id}
                      placeholder="Select an employee"
                      options={employees.map((e) => ({ value: e.id, label: `${e.full_name} (${payrollLabel(e.payroll_type)})` }))}
                    />
                    <Input label="Attendance Date" required type="date" value={form.attendance_date} onChange={set('attendance_date')} error={errors.attendance_date} />
                  </div>
                )}

                <div>
                  <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Attendance Status<span className="text-error-500">*</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Attendance status">
                    {ATTENDANCE_STATUSES.map((s) => {
                      const active = form.attendance_status === s.value;
                      return (
                        <button
                          key={s.value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => set('attendance_status')({ target: { value: s.value } })}
                          className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                            active
                              ? 'border-brand-500 bg-brand-50 text-brand-600 dark:border-brand-400 dark:bg-brand-500/15 dark:text-brand-400'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5'
                          }`}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                  {errors.attendance_status && <p className="text-theme-xs text-error-500 mt-1.5">{errors.attendance_status}</p>}
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Input label="Standard Hours" type="text" inputMode="decimal" value={form.standard_hours} onChange={set('standard_hours')} error={errors.standard_hours} placeholder="e.g. 8" hint="Employee's normal hours for the day" />
                  <Input label="Actual Hours" type="text" inputMode="decimal" value={form.actual_hours} onChange={set('actual_hours')} error={errors.actual_hours} placeholder="e.g. 8" hint="Hours actually worked" />
                </div>

                <TextArea label="Notes" rows={3} value={form.notes} onChange={set('notes')} error={errors.notes} placeholder="Optional notes (reason for absence, overtime, ...)" />
              </div>
            </ComponentCard>

            <div className="space-y-6">
              {employee && (
                <ComponentCard title="Employee">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                      <Avatar user={employee} size="sm" />
                      <div>
                        <p className="font-medium text-gray-800 dark:text-white/90">{employee.full_name}</p>
                        <p className="text-theme-xs text-gray-500 dark:text-gray-400">{employee.mobile_number}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge color="primary">{payrollLabel(employee.payroll_type)}</Badge>
                      {employee.fixed_working_hours != null && <Badge color="light">{employee.fixed_working_hours} h / day</Badge>}
                    </div>
                    {!isEdit && employee.payroll_type === 'monthly_fixed' && (
                      <p className="text-theme-xs text-gray-500 dark:text-gray-400">Fixed-salary employees are marked present by the daily job. Add an entry here only for a day the job hasn&apos;t covered.</p>
                    )}
                  </div>
                </ComponentCard>
              )}

              {isEdit && record && (
                <ComponentCard title="Record">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Current status</p>
                      <div className="mt-1">
                        <Badge color={attendanceStatus(record.attendance_status).color}>{attendanceStatus(record.attendance_status).label}</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Created by</p>
                      <p className="font-medium text-gray-800 dark:text-white/90">{record.created_by?.name || 'Daily job (automatic)'}</p>
                      <p className="text-theme-xs text-gray-500 dark:text-gray-400">{formatDate(record.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Last updated by</p>
                      <p className="font-medium text-gray-800 dark:text-white/90">{record.updated_by?.name || 'Daily job (automatic)'}</p>
                      <p className="text-theme-xs text-gray-500 dark:text-gray-400">{formatDate(record.updated_at)}</p>
                    </div>
                  </div>
                </ComponentCard>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link to={backTo} className={buttonClass('outline')}>
              Cancel
            </Link>
            <Button type="submit" loading={saving}>
              {isEdit ? 'Save changes' : 'Add entry'}
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
