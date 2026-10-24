import { Link, useNavigate } from 'react-router-dom';
import { ArrowDownLeftIcon, ArrowUpRightIcon, PaperclipIcon, PencilIcon, TrashIcon } from '../common/icons';
import { formatDateOnly, signedMoney } from '../../utils/format';

function CategoryTag({ category }) {
  return <span className="text-theme-xs inline-flex shrink-0 items-center rounded-md bg-gray-100 px-1.5 py-0.5 font-medium text-gray-700 dark:bg-white/5 dark:text-gray-300">{category.title}</span>;
}

function TypeIcon({ type }) {
  const credit = type === 'credit';
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
        credit ? 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500' : 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500'
      }`}
      aria-label={credit ? 'Credit' : 'Debit'}
    >
      {credit ? <ArrowDownLeftIcon size={18} /> : <ArrowUpRightIcon size={18} />}
    </span>
  );
}

const Amount = ({ e }) => (
  <span className={`font-semibold whitespace-nowrap ${e.transaction_type === 'credit' ? 'text-success-600 dark:text-success-500' : 'text-error-600 dark:text-error-500'}`}>{signedMoney(e.amount, e.transaction_type)}</span>
);

/** Small paperclip that opens the attached bill (only shown when one is uploaded). */
function BillButton({ e }) {
  if (!e.bill_image_url) return null;
  const label = `Open bill${e.bill_number ? ` ${e.bill_number}` : ''}`;
  return (
    <a
      href={e.bill_image_url}
      target="_blank"
      rel="noreferrer"
      title={label}
      aria-label={label}
      className="text-brand-500 hover:text-brand-600 rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-white/5"
    >
      <PaperclipIcon size={18} />
    </a>
  );
}

function CategoryCell({ category }) {
  return category ? <CategoryTag category={category} /> : <span className="text-theme-xs text-gray-400 italic">Uncategorized</span>;
}

/** Transactions table (desktop) / cards (mobile). Set showAccount=false inside an account page. */
export default function ExpensesTable({ rows, showAccount = true, onDelete }) {
  const navigate = useNavigate();
  const actions = (e) => (
    <div className="flex items-center gap-1">
      <BillButton e={e} />
      <button
        type="button"
        onClick={() => navigate(`/expenses/${e.id}/edit`)}
        className="hover:text-brand-500 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
        aria-label={`Edit ${e.title}`}
      >
        <PencilIcon size={18} />
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(e)}
          className="hover:text-error-500 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
          aria-label={`Delete ${e.title}`}
        >
          <TrashIcon size={18} />
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className="hidden max-w-full overflow-x-auto lg:block">
        <table className="min-w-full">
          <thead className="border-b border-gray-100 dark:border-gray-800">
            <tr>
              {['Expense', 'Date', 'Category', ...(showAccount ? ['Account'] : []), 'By', 'Amount', ''].map((h) => (
                <th key={h} className={`text-theme-xs px-5 py-3 font-medium whitespace-nowrap text-gray-500 dark:text-gray-400 ${h === 'Amount' ? 'text-end' : 'text-start'}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((e) => (
              <tr key={e.id}>
                <td className="px-5 py-3.5">
                  <Link to={`/expenses/${e.id}/edit`} className="group flex items-center gap-3">
                    <TypeIcon type={e.transaction_type} />
                    <div className="min-w-0">
                      <span className="text-theme-sm group-hover:text-brand-500 block max-w-[260px] truncate font-medium text-gray-800 dark:text-white/90">{e.title}</span>
                      {e.description && <span className="text-theme-xs block max-w-[260px] truncate text-gray-500 dark:text-gray-400">{e.description}</span>}
                    </div>
                  </Link>
                </td>
                <td className="text-theme-sm px-5 py-3.5 whitespace-nowrap text-gray-500 dark:text-gray-400">{formatDateOnly(e.expense_date)}</td>
                <td className="px-5 py-3.5">
                  <CategoryCell category={e.category} />
                </td>
                {showAccount && (
                  <td className="px-5 py-3.5">
                    <Link to={`/accounts/${e.account.id}`} className="text-theme-sm hover:text-brand-500 text-gray-700 dark:text-gray-300">
                      {e.account.title}
                    </Link>
                  </td>
                )}
                <td className="text-theme-sm px-5 py-3.5 whitespace-nowrap text-gray-500 dark:text-gray-400">{e.transaction_by?.name || '—'}</td>
                <td className="text-theme-sm px-5 py-3.5 text-end">
                  <Amount e={e} />
                </td>
                <td className="px-5 py-3.5">{actions(e)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-gray-100 lg:hidden dark:divide-gray-800">
        {rows.map((e) => (
          <li key={e.id} className="flex items-start gap-3 px-4 py-4 sm:px-6">
            <TypeIcon type={e.transaction_type} />
            <Link to={`/expenses/${e.id}/edit`} className="min-w-0 flex-1">
              <p className="text-theme-sm line-clamp-2 font-medium break-words text-gray-800 dark:text-white/90">{e.title}</p>
              <div className="mt-1">
                <CategoryCell category={e.category} />
              </div>
              <p className="text-theme-xs mt-1 text-gray-500 dark:text-gray-400">
                {formatDateOnly(e.expense_date)}
                {showAccount && ` · ${e.account.title}`}
                {e.transaction_by && ` · ${e.transaction_by.name}`}
              </p>
            </Link>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-theme-sm">
                <Amount e={e} />
              </span>
              <div className="-mr-2">{actions(e)}</div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
