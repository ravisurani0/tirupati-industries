import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { attendanceApi, employeesApi } from '../../api';
import { ComponentCard, PageBreadcrumb } from '../../components/common/Common';
import Avatar from '../../components/ui/Avatar';
import Button, { buttonClass, Spinner } from '../../components/ui/Button';
import { Alert, Badge } from '../../components/ui/Feedback';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { HandCoinsIcon, PencilIcon, TrashIcon } from '../../components/common/icons';
import { attendanceStatus, formatDate, formatDateOnly, formatDayLong, formatHours, formatMoney, payrollLabel } from '../../utils/format';

function Item({ label, children, wide }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <p className="mb-1.5 text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <div className="text-sm font-medium break-words whitespace-pre-line text-gray-800 dark:text-white/90">{children || '—'}</div>
    </div>
  );
}

export default function EmployeeDetail() {
  const { hasRole } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [employee, setEmployee] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [attendance, setAttendance] = useState(null);

  useEffect(() => {
    attendanceApi
      .list({ employee_id: id, per_page: 10 })
      .then((r) => setAttendance(r.data))
      .catch(() => setAttendance([]));
  }, [id]);

  useEffect(() => {
    employeesApi
      .get(id)
      .then((r) => setEmployee(r.data))
      .catch((e) => setError(e.message));
  }, [id]);

  const remove = async () => {
    setDeleting(true);
    try {
      await employeesApi.remove(id);
      navigate('/employees', { state: { notice: `${employee.full_name} was deleted.` } });
    } catch (e) {
      setError(e.message);
      setConfirmDelete(false);
      setDeleting(false);
    }
  };

  if (error && !employee) {
    return (
      <>
        <PageBreadcrumb title="Employee" items={[{ label: 'Employees', to: '/employees' }]} />
        <Alert variant="error">{error}</Alert>
      </>
    );
  }

  if (!employee) {
    return (
      <div className="flex justify-center py-16 text-gray-400">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const e = employee;

  return (
    <>
      <PageBreadcrumb title={e.full_name} items={[{ label: 'Employees', to: '/employees' }]} />

      <div className="space-y-6">
        {notice && (
          <Alert variant="success" onClose={() => setNotice('')}>
            {notice}
          </Alert>
        )}
        {error && <Alert variant="error">{error}</Alert>}

        <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            <Avatar user={e} size="lg" className="border border-gray-200 dark:border-gray-800" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{e.full_name}</h3>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <Badge color={e.is_active ? 'success' : 'error'}>{e.is_active ? 'Active' : 'Inactive'}</Badge>
                <Badge color="primary">{payrollLabel(e.payroll_type)}</Badge>
                <span className="text-sm text-gray-500 dark:text-gray-400">{e.mobile_number}</span>
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              {hasRole('admin') && (
                <Link to={`/advances/new?employee_id=${e.id}`} className={buttonClass('outline')}>
                  <HandCoinsIcon size={18} />
                  Advance / loan
                </Link>
              )}
              <Link to={`/employees/${e.id}/edit`} className={buttonClass('outline')}>
                <PencilIcon size={18} />
                Edit
              </Link>
              <Button variant="outline" className="hover:!text-error-500" startIcon={<TrashIcon size={18} />} onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <ComponentCard title="Personal details" className="xl:col-span-2">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Item label="First Name">{e.first_name}</Item>
              <Item label="Last Name">{e.last_name}</Item>
              <Item label="Mobile Number">{e.mobile_number}</Item>
              <Item label="Email">{e.email}</Item>
              <Item label="Address" wide>
                {e.address}
              </Item>
              <Item label="Notes" wide>
                {e.notes}
              </Item>
            </div>
          </ComponentCard>

          <div className="space-y-6">
            <ComponentCard title="Employment & payroll">
              <div className="grid grid-cols-1 gap-5">
                <Item label="Joining Date">{e.joining_date && formatDateOnly(e.joining_date)}</Item>
                <Item label="Payroll Type">{payrollLabel(e.payroll_type)}</Item>
                <Item label="Monthly Salary">{formatMoney(e.monthly_salary)}</Item>
                <Item label="Hourly Rate">{formatMoney(e.hourly_rate)}</Item>
                <Item label="Fixed Working Hours / Day">{e.fixed_working_hours !== null && `${e.fixed_working_hours} hrs`}</Item>
              </div>
            </ComponentCard>
            <ComponentCard title="Recent attendance" action={<Link to={`/attendance/new?employee_id=${e.id}`} className="text-brand-500 hover:text-brand-600 text-sm font-medium">Add entry</Link>}>
              {attendance === null ? (
                <div className="flex justify-center py-4 text-gray-400">
                  <Spinner className="h-5 w-5" />
                </div>
              ) : attendance.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No attendance entries yet.</p>
              ) : (
                <ul className="-my-2 divide-y divide-gray-100 dark:divide-gray-800">
                  {attendance.map((a) => (
                    <li key={a.id}>
                      <Link to={`/attendance/${a.id}/edit`} className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80">
                        <span className="text-sm text-gray-800 dark:text-white/90">{formatDayLong(a.attendance_date)}</span>
                        <span className="flex items-center gap-2">
                          <span className="text-theme-xs text-gray-500 dark:text-gray-400">{formatHours(a.actual_hours)}</span>
                          <Badge color={attendanceStatus(a.attendance_status).color}>{attendanceStatus(a.attendance_status).label}</Badge>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </ComponentCard>
            <ComponentCard title="Record">
              <div className="grid grid-cols-1 gap-5">
                <Item label="Employee ID">
                  <span className="font-mono text-xs">{e.id}</span>
                </Item>
                <Item label="Created">{formatDate(e.created_at)}</Item>
                <Item label="Last updated">{formatDate(e.updated_at)}</Item>
              </div>
            </ComponentCard>
          </div>
        </div>
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <h4 className="mb-2 pr-10 text-xl font-semibold text-gray-800 dark:text-white/90">Delete employee?</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-800 dark:text-white/90">{e.full_name}</span> will be permanently removed. This cannot be undone.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setConfirmDelete(false)}>
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
