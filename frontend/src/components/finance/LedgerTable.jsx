import { Link } from 'react-router-dom';
import { ArrowDownLeftIcon, ArrowUpRightIcon, HandCoinsIcon, PaperclipIcon } from '../common/icons';
import { formatDateOnly, formatMoney } from '../../utils/format';

const SOURCE = {
  expense: { label: 'Expense', cls: 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300' },
  advance: { label: 'Advance', cls: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400' },
  loan: { label: 'Loan', cls: 'bg-theme-purple-500/10 text-theme-purple-500 dark:bg-theme-purple-500/20' },
};

function SourceTag({ source }) {
  const s = SOURCE[source];
  return <span className={`text-theme-xs inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 font-medium ${s.cls}`}>{s.label}</span>;
}

function Icon({ t }) {
  if (t.source !== 'expense') {
    return (
      <span className="bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
        <HandCoinsIcon size={18} />
      </span>
    );
  }
  const credit = t.direction === 'credit';
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
        credit ? 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500' : 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500'
      }`}
    >
      {credit ? <ArrowDownLeftIcon size={18} /> : <ArrowUpRightIcon size={18} />}
    </span>
  );
}

const linkFor = (t) => (t.source === 'expense' ? `/expenses/${t.id}/edit` : `/advances/${t.id}`);

const Amount = ({ t }) => (
  <span className={`font-semibold whitespace-nowrap ${t.direction === 'credit' ? 'text-success-600 dark:text-success-500' : 'text-error-600 dark:text-error-500'}`}>
    {t.direction === 'credit' ? '+' : '−'}
    {formatMoney(t.amount)}
  </span>
);

/** Detail line: category for expenses, terms for advances/loans */
const Sub = ({ t }) => {
  const text = t.source === 'expense' ? [t.category || 'Uncategorized', t.description].filter(Boolean).join(' · ') : t.description || (t.source === 'advance' ? 'Recovered from salary' : '');
  return text ? <span className="text-theme-xs block max-w-[340px] truncate text-gray-500 dark:text-gray-400">{text}</span> : null;
};

/**
 * Everything that moved money in or out of an account, newest first, with the
 * running balance after each transaction. canOpenAdvances: advances/loans are admin-only pages.
 */
export default function LedgerTable({ rows, canOpenAdvances }) {
  const Title = ({ t, className }) =>
    t.source !== 'expense' && !canOpenAdvances ? (
      <span className={className}>{t.title}</span>
    ) : (
      <Link to={linkFor(t)} className={`hover:text-brand-500 ${className}`}>
        {t.title}
      </Link>
    );

  return (
    <>
      <div className="hidden max-w-full overflow-x-auto lg:block">
        <table className="min-w-full">
          <thead className="border-b border-gray-100 dark:border-gray-800">
            <tr>
              {['Date', 'Transaction', 'Type', 'By', 'Amount', 'Balance'].map((h) => (
                <th key={h} className={`text-theme-xs px-5 py-3 font-medium whitespace-nowrap text-gray-500 dark:text-gray-400 ${['Amount', 'Balance'].includes(h) ? 'text-end' : 'text-start'}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((t) => (
              <tr key={`${t.source}-${t.id}`}>
                <td className="text-theme-sm px-5 py-3.5 whitespace-nowrap text-gray-500 dark:text-gray-400">{formatDateOnly(t.date)}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Icon t={t} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Title t={t} className="text-theme-sm block max-w-[300px] truncate font-medium text-gray-800 dark:text-white/90" />
                        {t.bill_image_url && (
                          <a href={t.bill_image_url} target="_blank" rel="noreferrer" title={`Open bill${t.bill_number ? ` ${t.bill_number}` : ''}`} className="text-brand-500 hover:text-brand-600">
                            <PaperclipIcon size={15} />
                          </a>
                        )}
                      </div>
                      <Sub t={t} />
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <SourceTag source={t.source} />
                </td>
                <td className="text-theme-sm px-5 py-3.5 whitespace-nowrap text-gray-500 dark:text-gray-400">{t.by || '—'}</td>
                <td className="text-theme-sm px-5 py-3.5 text-end">
                  <Amount t={t} />
                </td>
                <td className={`text-theme-sm px-5 py-3.5 text-end font-medium whitespace-nowrap ${t.balance_after < 0 ? 'text-error-600' : 'text-gray-800 dark:text-white/90'}`}>{formatMoney(t.balance_after)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-gray-100 lg:hidden dark:divide-gray-800">
        {rows.map((t) => (
          <li key={`${t.source}-${t.id}`} className="flex items-start gap-3 px-4 py-4 sm:px-6">
            <Icon t={t} />
            <div className="min-w-0 flex-1">
              <Title t={t} className="text-theme-sm line-clamp-2 font-medium text-gray-800 dark:text-white/90" />
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <SourceTag source={t.source} />
                {t.source === 'expense' && <span className="text-theme-xs text-gray-500 dark:text-gray-400">{t.category || 'Uncategorized'}</span>}
              </div>
              <p className="text-theme-xs mt-1 text-gray-500 dark:text-gray-400">
                {formatDateOnly(t.date)}
                {t.by && ` · ${t.by}`}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <span className="text-theme-sm">
                <Amount t={t} />
              </span>
              <span className="text-theme-xs text-gray-500 dark:text-gray-400">Bal {formatMoney(t.balance_after)}</span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
