import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { MoonIcon, SunIcon } from './icons';

/** Brand mark: TailAdmin icon + product name */
export function Logo({ dark = false, iconOnly = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img src="/images/logo/logo-icon.svg" alt="" width="32" height="32" />
      {!iconOnly && (
        <span className={`text-[22px] leading-none font-semibold tracking-tight ${dark ? 'text-white' : 'text-gray-900 dark:text-white'}`}>EMS</span>
      )}
    </span>
  );
}

/** Page title + breadcrumb (partials/breadcrumb.html) */
export function PageBreadcrumb({ title, items = [] }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pb-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">{title}</h2>
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400" to="/">
              Home
              <Chevron />
            </Link>
          </li>
          {items.map((item) => (
            <li key={item.label}>
              <Link className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400" to={item.to}>
                {item.label}
                <Chevron />
              </Link>
            </li>
          ))}
          <li className="text-sm text-gray-800 dark:text-white/90">{title}</li>
        </ol>
      </nav>
    </div>
  );
}

function Chevron() {
  return (
    <svg className="stroke-current" width="17" height="16" viewBox="0 0 17 16" fill="none" aria-hidden="true">
      <path d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366" stroke="" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** White rounded card used throughout TailAdmin */
export function ComponentCard({ title, description, action, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${className}`}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6 sm:py-5">
          <div>
            {title && <h3 className="text-base font-medium text-gray-800 dark:text-white/90">{title}</h3>}
            {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={`${title || action ? 'border-t border-gray-100 dark:border-gray-800' : ''} p-4 sm:p-6`}>{children}</div>
    </div>
  );
}

/** Full-screen loader (partials/preloader.html) */
export function Preloader() {
  return (
    <div className="fixed top-0 left-0 z-999999 flex h-screen w-screen items-center justify-center bg-white dark:bg-black">
      <div className="border-brand-500 h-16 w-16 animate-spin rounded-full border-4 border-solid border-t-transparent" />
    </div>
  );
}

/** Round header button that flips light/dark */
export function ThemeToggleButton({ floating = false }) {
  const { toggleTheme } = useTheme();
  const cls = floating
    ? 'bg-brand-500 hover:bg-brand-600 inline-flex size-14 items-center justify-center rounded-full text-white transition-colors'
    : 'relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white';
  return (
    <button type="button" onClick={toggleTheme} className={cls} aria-label="Toggle dark mode">
      <SunIcon className="hidden fill-current dark:block" />
      <MoonIcon className="fill-current dark:hidden" />
    </button>
  );
}

/** Decorative grid shapes on the auth panel (partials/common-grid-shape.html) */
export function GridShape() {
  return (
    <>
      <div className="absolute top-0 right-0 -z-1 w-full max-w-[250px] xl:max-w-[450px]">
        <img src="/images/shape/grid-01.svg" alt="" />
      </div>
      <div className="absolute bottom-0 left-0 -z-1 w-full max-w-[250px] rotate-180 xl:max-w-[450px]">
        <img src="/images/shape/grid-01.svg" alt="" />
      </div>
    </>
  );
}
