const sizes = {
  sm: 'px-4 py-3 text-sm',
  md: 'px-5 py-3.5 text-sm',
};

const variants = {
  primary: 'bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300',
  outline:
    'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300',
  danger: 'bg-error-500 text-white shadow-theme-xs hover:bg-error-600 disabled:bg-error-300',
  ghost: 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300',
};

export function Spinner({ className = 'h-4 w-4' }) {
  return <span className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} aria-hidden="true" />;
}

export const buttonClass = (variant = 'primary', size = 'sm', extra = '') =>
  `inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed ${sizes[size]} ${variants[variant]} ${extra}`;

export default function Button({ children, variant = 'primary', size = 'sm', loading = false, startIcon, endIcon, className = '', disabled, type = 'button', ...props }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={buttonClass(variant, size, className)}
      {...props}
    >
      {loading ? <Spinner /> : startIcon}
      {children}
      {!loading && endIcon}
    </button>
  );
}
