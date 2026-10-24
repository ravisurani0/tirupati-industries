import { useEffect } from 'react';
import { CloseIcon } from '../common/icons';

/** TailAdmin-style modal. Closes on Escape and backdrop click. */
export default function Modal({ open, onClose, children, className = 'max-w-[500px]' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-999999 flex items-center justify-center overflow-y-auto p-5" role="dialog" aria-modal="true">
      <div className="fixed inset-0 h-full w-full bg-gray-400/50 backdrop-blur-[32px]" onClick={onClose} />
      <div className={`relative w-full rounded-3xl bg-white p-6 lg:p-10 dark:bg-gray-900 ${className}`}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-999 flex h-9.5 w-9.5 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 sm:top-6 sm:right-6 sm:h-11 sm:w-11 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
        >
          <CloseIcon />
        </button>
        {children}
      </div>
    </div>
  );
}
