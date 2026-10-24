import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { advancesApi } from '../../api';
import { ComponentCard, PageBreadcrumb } from '../../components/common/Common';
import Avatar from '../../components/ui/Avatar';
import { buttonClass, Spinner } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Feedback';
import SummaryCards from '../../components/finance/SummaryCards';
import { PencilIcon } from '../../components/common/icons';
import { formatDate, formatDateOnly, formatMoney } from '../../utils/format';
import { formatMonth } from '../../utils/loan';
import { StatusBadge, TypeBadge } from './AdvancesList';

function Item({ label, children }) {
  return (
    <div>
      <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <div className="text-sm font-medium break-words text-gray-800 dark:text-white/90">{children || '—'}</div>
    </div>
  );
}

const yesNo = (v) => (v ? 'Yes' : 'No');

export default function AdvanceDetail() {
  const { id } = useParams();
  const location = useLocation();
  const [rec, setRec] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');

  useEffect(() => {
    advancesApi
      .get(id)
      .then((r) => setRec(r.data))
      .catch((e) => setError(e.message));
  }, [id]);

  if (!rec) {
    return error ? (
      <>
        <PageBreadcrumb title="Advance / Loan" items={[{ label: 'Advances & Loans', to: '/advances' }]} />
        <Alert variant="error">{error}</Alert>
      </>
    ) : (
      <div className="flex justify-center py-16 text-gray-400">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const r = rec;
  // Installments already covered by what has been recovered so far
  let covered = r.recovered_amount;
  const rows = r.schedule.map((p) => {
    const paid = Math.min(covered, p.amount);
    covered = Math.max(0, covered - p.amount);
    return { ...p, state: paid >= p.amount - 0.001 ? 'paid' : paid > 0 ? 'partial' : 'due' };
  });

  return (
    <>
      <PageBreadcrumb title={`${r.is_loan ? 'Loan' : 'Advance'} · ${r.employee.full_name}`} items={[{ label: 'Advances & Loans', to: '/advances' }]} />
      <div className="space-y-6">
        {notice && (
          <Alert variant="success" onClose={() => setNotice('')}>
            {notice}
          </Alert>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar user={r.employee} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/employees/${r.employee.id}`} className="hover:text-brand-500 text-lg font-semibold text-gray-800 dark:text-white/90">
                  {r.employee.full_name}
                </Link>
                <TypeBadge isLoan={r.is_loan} />
                <StatusBadge status={r.status} />
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {formatMoney(r.amount)} paid on {formatDateOnly(r.transfer_date)}
                {r.account ? ` from ${r.account.title}` : ''}
              </p>
            </div>
            <Link to={`/advances/${r.id}/edit`} className={buttonClass('outline')}>
              <PencilIcon size={18} />
              Edit
            </Link>
          </div>
        </div>

        <SummaryCards
          items={[
            { label: r.is_loan ? 'Principal' : 'Advance', value: r.amount },
            { label: 'Interest', value: r.interest_amount, tone: 'brand', hint: r.is_loan ? `${r.interest_rate}% / year for ${r.tenure_months} months` : 'No interest on advances' },
            { label: 'Recovered', value: r.recovered_amount, tone: 'success' },
            { label: 'Outstanding', value: r.outstanding, tone: r.outstanding > 0 ? 'error' : 'success' },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <ComponentCard title={r.is_loan ? 'Repayment schedule' : 'Settlement'} className="xl:col-span-2">
            <div className="max-w-full overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b border-gray-100 dark:border-gray-800">
                  <tr>
                    {['#', 'Salary month', 'Amount', 'Balance after', 'Status'].map((h) => (
                      <th key={h} className={`text-theme-xs px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 ${['Amount', 'Balance after'].includes(h) ? 'text-end' : 'text-start'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {rows.map((p) => (
                    <tr key={p.number}>
                      <td className="text-theme-sm px-3 py-2.5 text-gray-500 dark:text-gray-400">{p.number}</td>
                      <td className="text-theme-sm px-3 py-2.5 text-gray-800 dark:text-white/90">{formatMonth(p.month)}</td>
                      <td className="text-theme-sm px-3 py-2.5 text-end font-medium whitespace-nowrap text-gray-800 dark:text-white/90">{formatMoney(p.amount)}</td>
                      <td className="text-theme-sm px-3 py-2.5 text-end whitespace-nowrap text-gray-500 dark:text-gray-400">{formatMoney(p.balance_after)}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`text-theme-xs rounded-full px-2 py-0.5 font-medium ${
                            p.state === 'paid'
                              ? 'bg-success-50 text-success-600 dark:bg-success-500/15'
                              : p.state === 'partial'
                                ? 'bg-warning-50 text-warning-600 dark:bg-warning-500/15'
                                : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400'
                          }`}
                        >
                          {p.state === 'paid' ? 'Recovered' : p.state === 'partial' ? 'Partly recovered' : 'Due'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-theme-xs mt-3 text-gray-500 dark:text-gray-400">
              {r.is_loan
                ? `${r.tenure_months} monthly installments of ${formatMoney(r.monthly_installment)} starting ${formatMonth(r.repayment_start_month)}.`
                : `Settled in full from the salary of ${formatMonth(r.repayment_start_month)}.`}{' '}
              Recovery is recorded when payroll is processed.
            </p>
          </ComponentCard>

          <div className="space-y-6">
            <ComponentCard title="Details">
              <div className="space-y-4">
                <Item label="Paid from account">{r.account ? <Link to={`/accounts/${r.account.id}`} className="text-brand-500">{r.account.title}</Link> : 'Not linked'}</Item>
                <Item label="Transfer date">{formatDateOnly(r.transfer_date)}</Item>
                {r.is_loan ? <Item label="Repay from salary">{yesNo(r.repay_from_salary)}</Item> : <Item label="Recover from salary">{yesNo(r.recover_from_salary)}</Item>}
                <Item label="Description">
                  <span className="whitespace-pre-line">{r.description}</span>
                </Item>
                <Item label="Created by">
                  {r.created_by?.name || '—'}
                  <span className="text-theme-xs block font-normal text-gray-500 dark:text-gray-400">{formatDate(r.created_at)}</span>
                </Item>
              </div>
            </ComponentCard>
          </div>
        </div>
      </div>
    </>
  );
}
