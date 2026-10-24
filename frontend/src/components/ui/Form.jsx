import { forwardRef, useId, useRef, useState } from 'react';
import { CalendarIcon, EyeCloseIcon, EyeIcon } from '../common/icons';

/* Classes taken from the TailAdmin form elements */
const baseInput =
  'dark:bg-dark-900 shadow-theme-xs focus:ring-3 focus:outline-hidden h-11 w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 disabled:cursor-not-allowed disabled:opacity-60';
const okBorder = 'border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:focus:border-brand-800';
const errBorder = 'border-error-500 focus:border-error-300 focus:ring-error-500/10 dark:border-error-500 dark:focus:border-error-800';

export const inputClass = (error, extra = '') => `${baseInput} ${error ? errBorder : okBorder} ${extra}`;

export function Label({ htmlFor, children, required }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
      {children}
      {required && <span className="text-error-500">*</span>}
    </label>
  );
}

export function FieldError({ children }) {
  if (!children) return null;
  return <p className="text-theme-xs text-error-500 mt-1.5">{children}</p>;
}

/** Label + control + error message */
export function Field({ label, required, error, hint, id, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      )}
      {children}
      {error ? <FieldError>{error}</FieldError> : hint && <p className="text-theme-xs mt-1.5 text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}

export const Input = forwardRef(function Input({ label, required, error, hint, className = '', wrapperClassName, id, ...props }, ref) {
  const autoId = useId();
  if (props.type === 'date') {
    const { type, ...rest } = props; // eslint-disable-line no-unused-vars
    return <DateInput label={label} required={required} error={error} hint={hint} className={className} wrapperClassName={wrapperClassName} id={id} {...rest} />;
  }
  const inputId = id || autoId;
  return (
    <Field label={label} required={required} error={error} hint={hint} id={inputId} className={wrapperClassName}>
      <input ref={ref} id={inputId} aria-invalid={Boolean(error)} className={inputClass(error, className)} {...props} />
    </Field>
  );
});

/** Opens the browser's native date picker (the TailAdmin CSS hides its default icon). */
function openPicker(input) {
  if (!input || input.disabled || input.readOnly) return;
  try {
    input.showPicker(); // Chrome 99+, Safari 16+, Firefox 101+
  } catch {
    input.focus(); // older browsers: focus so the user can type / use the keyboard
  }
}

/**
 * Date field with a calendar icon. Clicking anywhere on it (or the icon) opens
 * the date picker; typing the date still works.
 */
export function DateInput({ label, required, error, hint, id, wrapperClassName, className = '', ...props }) {
  const autoId = useId();
  const inputId = id || autoId;
  const ref = useRef(null);
  return (
    <Field label={label} required={required} error={error} hint={hint} id={inputId} className={wrapperClassName}>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type="date"
          aria-invalid={Boolean(error)}
          onClick={(e) => openPicker(e.currentTarget)}
          className={inputClass(error, `cursor-pointer pr-11 dark:[color-scheme:dark] ${className}`)}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Open date picker"
          onClick={() => openPicker(ref.current)}
          className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <CalendarIcon size={20} />
        </button>
      </div>
    </Field>
  );
}

export function PasswordInput({ label, required, error, hint, id, wrapperClassName, ...props }) {
  const autoId = useId();
  const inputId = id || autoId;
  const [show, setShow] = useState(false);
  return (
    <Field label={label} required={required} error={error} hint={hint} id={inputId} className={wrapperClassName}>
      <div className="relative">
        <input
          id={inputId}
          type={show ? 'text' : 'password'}
          aria-invalid={Boolean(error)}
          className={inputClass(error, 'ps-4 pe-11')}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute top-1/2 right-4 z-30 -translate-y-1/2 cursor-pointer text-gray-400 dark:text-gray-400"
        >
          {show ? <EyeCloseIcon className="fill-current" /> : <EyeIcon className="fill-current" />}
        </button>
      </div>
    </Field>
  );
}

export function TextArea({ label, required, error, hint, id, rows = 4, wrapperClassName, className = '', ...props }) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <Field label={label} required={required} error={error} hint={hint} id={inputId} className={wrapperClassName}>
      <textarea id={inputId} rows={rows} aria-invalid={Boolean(error)} className={inputClass(error, `h-auto ${className}`)} {...props} />
    </Field>
  );
}

export function Select({ label, required, error, hint, id, options = [], placeholder, wrapperClassName, ...props }) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <Field label={label} required={required} error={error} hint={hint} id={inputId} className={wrapperClassName}>
      <div className="relative">
        <select id={inputId} aria-invalid={Boolean(error)} className={inputClass(error, 'appearance-none pr-11')} {...props}>
          {placeholder !== undefined && (
            <option value="" className="text-gray-700 dark:bg-gray-900 dark:text-gray-400">
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value} className="text-gray-700 dark:bg-gray-900 dark:text-gray-400">
              {o.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-gray-500 dark:text-gray-400">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M4.79175 7.396L10.0001 12.6043L15.2084 7.396" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </Field>
  );
}

/** TailAdmin custom checkbox */
export function Checkbox({ checked, onChange, label, id }) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <label htmlFor={inputId} className="flex cursor-pointer items-center text-sm font-normal text-gray-700 select-none dark:text-gray-400">
      <span className="relative">
        <input type="checkbox" id={inputId} className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span
          className={`peer-focus-visible:ring-brand-500/20 mr-3 flex h-5 w-5 items-center justify-center rounded-md border-[1.25px] peer-focus-visible:ring-3 ${
            checked ? 'border-brand-500 bg-brand-500' : 'border-gray-300 bg-transparent dark:border-gray-700'
          }`}
        >
          <svg className={checked ? '' : 'opacity-0'} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="white" strokeWidth="1.94437" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </span>
      {label}
    </label>
  );
}

/** TailAdmin toggle switch */
export function Switch({ checked, onChange, label, disabled }) {
  return (
    <label className={`flex items-center gap-3 text-sm font-medium text-gray-700 select-none dark:text-gray-400 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
      <span className="relative">
        <input type="checkbox" className="sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span className={`block h-6 w-11 rounded-full transition ${checked ? 'bg-brand-500' : 'bg-gray-200 dark:bg-white/10'}`} />
        <span className={`shadow-theme-sm absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition duration-300 ${checked ? 'translate-x-full' : ''}`} />
      </span>
      {label}
    </label>
  );
}
