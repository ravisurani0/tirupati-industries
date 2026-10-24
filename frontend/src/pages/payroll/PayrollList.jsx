import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { payrollApi } from '../../api';
import { PageBreadcrumb } from '../../components/common/Common';
import Avatar from '../../components/ui/Avatar';
import { buttonClass, Spinner } from '../../components/ui/Button';
import { Alert, Badge } from '../../components/ui/Feedback';
import { inputClass, Select } from '../../components/ui/Form';
import SummaryCards from '../../components/finance/SummaryCards';
import { ChevronLeftSmallIcon, ChevronRightIcon, SearchIcon } from '../../components/common/icons';
import { formatDateOnly, formatMoney, PAYROLL_TYPES } from '../../utils/format';
import { addMonths, formatMonth } from '../../utils/loan';

/** "22 of 25 days · 2 absent · 1 leave"  or  "13.5 h × ₹250" */
export function basisText(p) {
  const b = p.basis;
  if (b.type === 'hourly') return `${b.hours} h × ${formatMoney(b.hourly_rate)}/h`;
  const parts = [`${b.payable_days} of ${b.period_days} days`];
  if (p.attendance.absent) parts.push(`${p.attendance.absent} absent`);
  if (p.attendance.leave) parts.push(`${p.attendance.leave} leave`);
  return parts.join(' · ');
}

export default function PayrollList() {
  const [params, setParams] = useSearchParams();
  const month = params.get('month') || '';
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [payrollType, setPayrollType] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    payrollApi
      .list({ month: month || undefined, payroll_type: payrollType, search: query })
      .then((r) => {
        if (!alive) return;
        setRows(r.data);
        setMeta(r.meta);
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [month, payrollType, query]);

  const period = meta?.period;
  const shown = period?.month || month;
  const totals = meta?.totals;
  const go = (m) => setParams({ month: m });

  return (
    <>
      <PageBreadcrumb title="Payroll" />
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        {/* Month bar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => shown && go(addMonths(shown, -1))} className={buttonClass('outline', 'sm', '!px-3')} aria-label="Previous month">
              <ChevronLeftSmallIcon />
            </button>
            <button type="button" onClick={() => shown && go(addMonths(shown, 1))} disabled={period?.isCurrent} className={buttonClass('outline', 'sm', '!px-3 disabled:opacity-40')} aria-label="Next month">
              <ChevronRightIcon />
            </button>
            <div className="ml-2">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{shown ? formatMonth(shown) : ' '}</h3>
              {period && (
                <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                  {period.isCurrent ? `Till date · ${formatDateOnly(period.asOf)}` : `Full month · ${formatDateOnly(period.start)} – ${formatDateOnly(period.end)}`}
                </p>
              )}
            </div>
          </div>
          {period && !period.isCurrent && (
            <button type="button" onClick={() => setParams({})} className="text-brand-500 hover:text-brand-600 self-start text-sm font-medium sm:self-auto">
              Back to current month
            </button>
          )}
        </div>

        <SummaryCards
          items={[
            { label: 'Gross earned', value: totals?.gross_earned, hint: totals ? `${totals.employees} employees` : undefined },
            { label: 'Advance & loan deductions', value: totals?.total_deductions, tone: 'error' },
            { label: 'Net payable', value: totals?.net_payable, tone: 'brand' },
            { label: 'Carried forward', value: totals?.carry_forward, tone: totals?.carry_forward ? 'error' : 'gray', hint: 'Deductions larger than earnings' },
          ]}
        />

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="grid grid-cols-1 gap-3 border-b border-gray-100 px-4 py-4 sm:grid-cols-[1fr_220px] sm:px-6 dark:border-gray-800">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-gray-400" />
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee..." aria-label="Search" className={inputClass(false, 'pl-11')} />
            </div>
            <Select aria-label="Filter by payroll type" value={payrollType} onChange={(e) => setPayrollType(e.target.value)} placeholder="All payroll types" options={PAYROLL_TYPES} />
          </div>

          {loading && !meta ? (
            <div className="flex justify-center py-16 text-gray-400">
              <Spinner className="h-8 w-8" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">No employees for this month.</p>
          ) : (
            <div className={loading ? 'opacity-60' : ''}>
              <div className="hidden max-w-full overflow-x-auto lg:block">
                <table className="min-w-full">
                  <thead className="border-b border-gray-100 dark:border-gray-800">
                    <tr>
                      {['Employee', 'Basis', 'Earned', 'Advances', 'Loan EMI', 'Net payable'].map((h) => (
                        <th key={h} className={`text-theme-xs px-5 py-3 font-medium whitespace-nowrap text-gray-500 dark:text-gray-400 ${h === 'Employee' || h === 'Basis' ? 'text-start' : 'text-end'}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {rows.map((p) => (
                      <tr key={p.employee.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                        <td className="px-5 py-3.5">
                          <Link to={`/payroll/${p.employee.id}?month=${shown}`} className="group flex items-center gap-3">
                            <Avatar user={p.employee} size="sm" />
                            <div>
                              <span className="text-theme-sm group-hover:text-brand-500 block font-medium text-gray-800 dark:text-white/90">{p.employee.full_name}</span>
                              <span className="text-theme-xs block text-gray-500 dark:text-gray-400">
                                {p.employee.payroll_type === 'hourly' ? `Hourly · ${formatMoney(p.employee.hourly_rate)}/h` : `Fixed · ${formatMoney(p.employee.monthly_salary)}/mo`}
                              </span>
                            </div>
                          </Link>
                        </td>
                        <td className="text-theme-xs px-5 py-3.5 whitespace-nowrap text-gray-500 dark:text-gray-400">{basisText(p)}</td>
                        <td className="text-theme-sm px-5 py-3.5 text-end whitespace-nowrap text-gray-800 dark:text-white/90">{formatMoney(p.gross_earned)}</td>
                        <td className="text-theme-sm px-5 py-3.5 text-end whitespace-nowrap text-gray-500 dark:text-gray-400">{p.advance_deduction ? <span className="text-error-600 dark:text-error-500">−{formatMoney(p.advance_deduction)}</span> : '—'}</td>
                        <td className="text-theme-sm px-5 py-3.5 text-end whitespace-nowrap text-gray-500 dark:text-gray-400">{p.loan_deduction ? <span className="text-error-600 dark:text-error-500">−{formatMoney(p.loan_deduction)}</span> : '—'}</td>
                        <td className="px-5 py-3.5 text-end">
                          <span className="text-theme-sm font-bold whitespace-nowrap text-gray-800 dark:text-white/90">{formatMoney(p.net_payable)}</span>
                          {p.carry_forward > 0 && <span className="text-theme-xs text-error-600 dark:text-error-500 block">{formatMoney(p.carry_forward)} carried forward</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-gray-100 lg:hidden dark:divide-gray-800">
                {rows.map((p) => (
                  <li key={p.employee.id}>
                    <Link to={`/payroll/${p.employee.id}?month=${shown}`} className="flex items-start gap-3 px-4 py-4 sm:px-6">
                      <Avatar user={p.employee} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-theme-sm truncate font-medium text-gray-800 dark:text-white/90">{p.employee.full_name}</p>
                        <div className="mt-1">
                          <Badge color={p.employee.payroll_type === 'hourly' ? 'warning' : 'primary'}>{p.employee.payroll_type === 'hourly' ? 'Hourly' : 'Fixed'}</Badge>
                        </div>
                        <p className="text-theme-xs mt-1 text-gray-500 dark:text-gray-400">{basisText(p)}</p>
                        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                          Earned {formatMoney(p.gross_earned)}
                          {p.total_deductions > 0 && ` · −${formatMoney(p.total_deductions)}`}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-theme-sm font-bold text-gray-800 dark:text-white/90">{formatMoney(p.net_payable)}</p>
                        <p className="text-theme-xs text-gray-500 dark:text-gray-400">net</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          Fixed salary: monthly salary ÷ days in month × days so far, minus Absent and Leave days (Holiday, Off and unmarked days are paid). Hourly: actual hours from attendance × hourly
          rate. Deductions: open salary advances marked &quot;recover from salary&quot; and this month&apos;s installment of loans marked &quot;repay from salary&quot;.
        </p>
      </div>
    </>
  );
}
