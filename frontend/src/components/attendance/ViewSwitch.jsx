/** Month / Day segmented switch shown on both attendance views. */
export default function ViewSwitch({ view, onChange }) {
  const btn = (value, label) => (
    <button
      type="button"
      role="tab"
      aria-selected={view === value}
      onClick={() => view !== value && onChange(value)}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
        view === value ? 'shadow-theme-xs bg-white text-gray-900 dark:bg-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
      }`}
    >
      {label}
    </button>
  );
  return (
    <div role="tablist" aria-label="Attendance view" className="inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
      {btn('month', 'Month')}
      {btn('day', 'Day')}
    </div>
  );
}
