import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { payrollApi } from '../../api';
import { ComponentCard, PageBreadcrumb } from '../../components/common/Common';
import Avatar from '../../components/ui/Avatar';
import { buttonClass, Spinner } from '../../components/ui/Button';
import { Alert, Badge } from '../../components/ui/Feedback';
import SummaryCards from '../../components/finance/SummaryCards';
import { ChevronLeftSmallIcon, ChevronRightIcon } from '../../components/common/icons';
import { attendanceStatus, formatDateOnly, formatDayLong, formatHours, formatMoney, STATUS_STYLES } from '../../utils/format';
import { addMonths, formatMonth } from '../../utils/loan';

function Line({ label, value, tone, strong, sub }) {
  const color = tone === 'minus' ? 'text-error-600 dark:text-error-500' : 'text-gray-800 dark:text-white/90';
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div>
        <p className={`text-sm ${strong ? 'font-semibold text-gray-800 dark:text-white/90' : 'text-gray-600 dark:text-gray-400'}`}>{label}</p>
        {sub && <p className="text-theme-xs text-gray-400">{sub}</p>}
      </div>
      <p className={`text-sm whitespace-nowrap ${strong ? 'text-base font-bold' : 'font-medium'} ${color}`}>{value}</p>
    </div>
  );
}

export default function PayrollDetail() {
  const { employeeId } = useParams();
  const [params, setParams] = useSearchParams();
  const month = params.get('month') || '';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setError('');
    payrollApi
      .get(employeeId, month || undefined)
      .then((r) => alive && setData(r.data))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [employeeId, month]);

  if (!data) {
    return error ? (
      <>
        <PageBreadcrumb title="Salary" items={[{ label: 'Payroll', to: '/payroll' }]} />
        <Alert variant="error">{error}</Alert>
      </>
    ) : (
      <div className="flex justify-center py-16 text-gray-400">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const { period, payroll: p, attendance, advances } = data;
  const e = p.employee;
  const b = p.basis;
  const fixed = b.type === 'monthly_fixed';

  return (
    <>
      <PageBreadcrumb title={e.full_name} items={[{ label: 'Payroll', to: `/payroll?month=${period.month}` }]} />
      <div className="space-y-6">
        {error && <Alert variant="error">{error}</Alert>}

        {/* Header with month switcher */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar user={e} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/employees/${e.id}`} className="hover:text-brand-500 text-lg font-semibold text-gray-800 dark:text-white/90">
                  {e.full_name}
                </Link>
                <Badge color={fixed ? 'primary' : 'warning'}>{fixed ? 'Fixed salary' : 'Hourly'}</Badge>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {fixed ? `${formatMoney(e.monthly_salary)} / month` : `${formatMoney(e.hourly_rate)} / hour`}
                {e.joining_date && ` · Joined ${formatDateOnly(e.joining_date)}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setParams({ month: addMonths(period.month, -1) })} className={buttonClass('outline', 'sm', '!px-3')} aria-label="Previous month">
                <ChevronLeftSmallIcon />
              </button>
              <div className="min-w-[120px] text-center">
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{formatMonth(period.month)}</p>
                <p className="text-theme-xs text-gray-500 dark:text-gray-400">{period.isCurrent ? `till ${formatDateOnly(period.asOf)}` : 'full month'}</p>
              </div>
              <button type="button" onClick={() => setParams({ month: addMonths(period.month, 1) })} disabled={period.isCurrent} className={buttonClass('outline', 'sm', '!px-3 disabled:opacity-40')} aria-label="Next month">
                <ChevronRightIcon />
              </button>
            </div>
          </div>
        </div>

        <SummaryCards
          items={[
            { label: 'Earned till date', value: p.gross_earned },
            { label: 'Deductions', value: p.total_deductions, tone: 'error' },
            { label: 'Net payable', value: p.net_payable, tone: 'brand' },
            { label: 'Open advances & loans', value: p.open_advances_total, tone: p.open_advances_total ? 'error' : 'gray', hint: 'Total still to recover' },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Calculation */}
          <ComponentCard title="Salary calculation" className="xl:col-span-2">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {fixed ? (
                <>
                  <Line label="Monthly salary" value={formatMoney(b.monthly_salary)} />
                  <Line label="Per day" sub={`${formatMoney(b.monthly_salary)} ÷ ${b.days_in_month} days in ${formatMonth(period.month)}`} value={formatMoney(b.per_day)} />
                  <Line label="Days in period" sub={`${formatDateOnly(p.period_from)} – ${formatDateOnly(period.asOf)}`} value={`${b.period_days} days`} />
                  <Line label="Unpaid days" sub={`${p.attendance.absent} absent · ${p.attendance.leave} leave`} value={`− ${b.unpaid_days} days`} tone={b.unpaid_days ? 'minus' : undefined} />
                  <Line label="Payable days" value={`${b.payable_days} days`} />
                  <Line label="Earned" sub={`${b.payable_days} × ${formatMoney(b.per_day)} (leave / absence cost ${formatMoney(b.leave_deduction)})`} value={formatMoney(p.gross_earned)} strong />
                </>
              ) : (
                <>
                  <Line label="Hours worked" sub={`${p.attendance.present} days present`} value={`${b.hours} h`} />
                  <Line label="Hourly rate" value={formatMoney(b.hourly_rate)} />
                  <Line label="Earned" sub={`${b.hours} h × ${formatMoney(b.hourly_rate)}`} value={formatMoney(p.gross_earned)} strong />
                </>
              )}
              {p.deductions.map((d) => (
                <Line key={d.id + d.kind} label={d.label} sub={d.carried_over ? 'Carried over from an earlier month' : d.kind === 'loan' ? `Outstanding ${formatMoney(d.outstanding)}` : undefined} value={`− ${formatMoney(d.amount)}`} tone="minus" />
              ))}
              {p.deductions.length === 0 && <Line label="Advance / loan deductions" value="None" />}
              <Line label="Net payable" value={formatMoney(p.net_payable)} strong />
              {p.carry_forward > 0 && <Line label="Carried forward to next salary" sub="Deductions are larger than this month's earnings" value={formatMoney(p.carry_forward)} tone="minus" />}
            </div>
          </ComponentCard>

          {/* Attendance summary */}
          <ComponentCard title="Attendance this month">
            <div className="grid grid-cols-2 gap-3">
              {['present', 'absent', 'leave', 'holiday', 'off'].map((s) => (
                <div key={s} className={`rounded-xl border px-3 py-2.5 ${STATUS_STYLES[s].pill}`}>
                  <p className="text-theme-xs font-medium">{attendanceStatus(s).label}</p>
                  <p className="text-xl font-bold">{p.attendance[s]}</p>
                </div>
              ))}
              <div className="rounded-xl border border-gray-200 px-3 py-2.5 dark:border-gray-800">
                <p className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">Hours</p>
                <p className="text-xl font-bold text-gray-800 dark:text-white/90">{p.attendance.hours}</p>
              </div>
            </div>
            <Link to={`/attendance?view=month&month=${period.month}`} className="text-brand-500 hover:text-brand-600 mt-4 inline-block text-sm font-medium">
              Open attendance calendar
            </Link>
          </ComponentCard>
        </div>

        {/* Records */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ComponentCard title={`Attendance entries (${attendance.length})`}>
            {attendance.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No attendance entries in this period.</p>
            ) : (
              <ul className="custom-scrollbar -my-2 max-h-96 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
                {attendance.map((a) => (
                  <li key={a.id}>
                    <Link to={`/attendance/${a.id}/edit`} className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80">
                      <span className="text-sm text-gray-800 dark:text-white/90">{formatDayLong(a.attendance_date)}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-theme-xs text-gray-500 dark:text-gray-400">{formatHours(a.actual_hours)}</span>
                        <span className={`text-theme-xs rounded-full border px-2 py-0.5 font-medium ${STATUS_STYLES[a.attendance_status].pill}`}>{attendanceStatus(a.attendance_status).label}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </ComponentCard>

          <ComponentCard
            title={`Advances & loans (${advances.length})`}
            action={
              <Link to={`/advances/new?employee_id=${e.id}`} className="text-brand-500 hover:text-brand-600 text-sm font-medium">
                New
              </Link>
            }
          >
            {advances.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No advances or loans.</p>
            ) : (
              <ul className="-my-2 divide-y divide-gray-100 dark:divide-gray-800">
                {advances.map((r) => (
                  <li key={r.id}>
                    <Link to={`/advances/${r.id}`} className="flex items-start justify-between gap-3 py-3 hover:opacity-80">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge color={r.type === 'loan' ? 'purple' : 'primary'}>{r.type === 'loan' ? 'Loan' : 'Advance'}</Badge>
                          <Badge color={r.status === 'settled' ? 'success' : 'warning'}>{r.status === 'settled' ? 'Settled' : 'Open'}</Badge>
                          {!r.from_salary && <Badge color="light">Paid back separately</Badge>}
                        </div>
                        <p className="text-theme-xs mt-1 text-gray-500 dark:text-gray-400">
                          {formatDateOnly(r.transfer_date)}
                          {r.account && ` · ${r.account}`}
                          {r.type === 'loan'
                            ? ` · ${formatMoney(r.monthly_installment)} × ${r.tenure_months} (${formatMonth(r.repayment_start_month)} – ${formatMonth(r.last_installment_month)})`
                            : ` · from salary of ${formatMonth(r.repayment_start_month)}`}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{formatMoney(r.amount)}</p>
                        <p className="text-theme-xs text-gray-500 dark:text-gray-400">Due {formatMoney(r.outstanding)}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </ComponentCard>
        </div>
      </div>
    </>
  );
}
