import { formatMoney } from '../../utils/format';

/** Row of totals: [{ label, value, tone: 'success' | 'error' | 'brand' | 'gray', hint }] */
export default function SummaryCards({ items }) {
  const tones = {
    success: 'text-success-600 dark:text-success-500',
    error: 'text-error-600 dark:text-error-500',
    brand: 'text-brand-600 dark:text-brand-400',
    gray: 'text-gray-800 dark:text-white/90',
  };
  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${items.length > 3 ? 'xl:grid-cols-4' : 'lg:grid-cols-3'}`}>
      {items.map((it) => (
        <div key={it.label} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">{it.label}</p>
          <p className={`mt-2 text-2xl font-bold ${tones[it.tone || 'gray']}`}>{it.value === null || it.value === undefined ? '—' : formatMoney(it.value)}</p>
          {it.hint && <p className="text-theme-xs mt-1 text-gray-400">{it.hint}</p>}
        </div>
      ))}
    </div>
  );
}
