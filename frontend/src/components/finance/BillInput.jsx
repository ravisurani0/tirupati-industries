import { useEffect, useId, useRef, useState } from 'react';
import { FieldError } from '../ui/Form';
import { PaperclipIcon, UploadIcon } from '../common/icons';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

/**
 * Bill image / PDF picker with preview and drag-and-drop.
 * onChange(file | null, { removed })
 */
export default function BillInput({ currentUrl, onChange, error }) {
  const id = useId();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [removed, setRemoved] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const pick = (f) => {
    setLocalError('');
    if (!f) return;
    if (!ACCEPT.includes(f.type)) return setLocalError('Choose a JPG, PNG, WEBP or PDF file');
    if (f.size > MAX_BYTES) return setLocalError('File must be 5 MB or smaller');
    setFile(f);
    setPreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
    setRemoved(false);
    onChange(f, { removed: false });
  };

  const clear = () => {
    setFile(null);
    setPreview(null);
    setRemoved(true);
    if (inputRef.current) inputRef.current.value = '';
    onChange(null, { removed: true });
  };

  const existing = !file && !removed ? currentUrl : null;
  const existingIsPdf = existing && /\.pdf($|\?)/i.test(existing);
  const shownImage = preview || (existing && !existingIsPdf ? existing : null);

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Bill Image</span>

      {file || existing ? (
        <div className="flex flex-col gap-4 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center dark:border-gray-800">
          {shownImage ? (
            <a href={existing || preview} target="_blank" rel="noreferrer" className="block shrink-0">
              <img src={shownImage} alt="Bill" className="h-28 w-28 rounded-lg border border-gray-200 object-cover dark:border-gray-800" />
            </a>
          ) : (
            <span className="bg-error-50 text-error-600 dark:bg-error-500/15 flex h-28 w-28 shrink-0 items-center justify-center rounded-lg text-sm font-semibold">PDF</span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">{file ? file.name : 'Current bill'}</p>
            {file && <p className="text-theme-xs text-gray-500 dark:text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>}
            <div className="mt-3 flex flex-wrap gap-3">
              {existing && (
                <a href={existing} target="_blank" rel="noreferrer" className="text-brand-500 hover:text-brand-600 inline-flex items-center gap-1 text-sm font-medium">
                  <PaperclipIcon size={16} />
                  Open
                </a>
              )}
              <label htmlFor={id} className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300">
                Replace
              </label>
              <button type="button" onClick={clear} className="text-error-500 hover:text-error-600 text-sm font-medium">
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <label
          htmlFor={id}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files?.[0]);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center transition ${
            dragging ? 'border-brand-500 bg-brand-25 dark:bg-brand-500/5' : 'border-gray-300 bg-gray-50 hover:border-brand-500 dark:border-gray-700 dark:bg-gray-900'
          }`}
        >
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
            <UploadIcon />
          </span>
          <span className="text-sm font-medium text-gray-800 dark:text-white/90">Drop the bill here or click to upload</span>
          <span className="text-theme-xs mt-1 text-gray-500 dark:text-gray-400">JPG, PNG, WEBP or PDF · max 5 MB · photos from the phone camera work too</span>
        </label>
      )}

      <input ref={inputRef} id={id} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      <FieldError>{localError || error}</FieldError>
    </div>
  );
}
