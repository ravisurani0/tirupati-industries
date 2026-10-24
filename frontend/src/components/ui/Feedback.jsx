import { AlertCircleIcon, CheckCircleIcon } from '../common/icons';

const alertStyles = {
  success: { wrap: 'border-success-500 bg-success-50 dark:border-success-500/30 dark:bg-success-500/15', icon: 'text-success-500' },
  error: { wrap: 'border-error-500 bg-error-50 dark:border-error-500/30 dark:bg-error-500/15', icon: 'text-error-500' },
  warning: { wrap: 'border-warning-500 bg-warning-50 dark:border-warning-500/30 dark:bg-warning-500/15', icon: 'text-warning-500' },
  info: { wrap: 'border-blue-light-500 bg-blue-light-50 dark:border-blue-light-500/30 dark:bg-blue-light-500/15', icon: 'text-blue-light-500' },
};

/** TailAdmin alert */
export function Alert({ variant = 'info', title, children, onClose }) {
  if (!title && !children) return null;
  const s = alertStyles[variant];
  const Icon = variant === 'success' ? CheckCircleIcon : AlertCircleIcon;
  return (
    <div role={variant === 'error' ? 'alert' : 'status'} className={`rounded-xl border p-4 ${s.wrap}`}>
      <div className="flex items-start gap-3">
        <Icon className={`-mt-0.5 shrink-0 ${s.icon}`} />
        <div className="flex-1">
          {title && <h4 className="mb-1 text-sm font-semibold text-gray-800 dark:text-white/90">{title}</h4>}
          {children && <p className="text-sm text-gray-500 dark:text-gray-400">{children}</p>}
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Dismiss">
            ×
          </button>
        )}
      </div>
    </div>
  );
}

const badgeColors = {
  primary: 'bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400',
  success: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500',
  error: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500',
  warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400',
  light: 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white/80',
  purple: 'bg-theme-purple-500/10 text-theme-purple-500 dark:bg-theme-purple-500/20',
};

export function Badge({ color = 'primary', children }) {
  return <span className={`text-theme-xs inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-0.5 font-medium ${badgeColors[color]}`}>{children}</span>;
}

export const roleBadgeColor = (slug) => (slug === 'admin' ? 'primary' : slug === 'manager' ? 'success' : 'light');
