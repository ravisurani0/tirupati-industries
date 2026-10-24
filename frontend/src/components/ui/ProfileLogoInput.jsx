import { useEffect, useId, useRef, useState } from 'react';
import Avatar from './Avatar';
import { FieldError } from './Form';
import { UploadIcon } from '../common/icons';

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml';

/**
 * Profile logo picker with live preview.
 * onChange(file | null, { removed: boolean })
 */
export default function ProfileLogoInput({ user, currentUrl, onChange, error, label = 'Profile logo' }) {
  const id = useId();
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [removed, setRemoved] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const pick = (file) => {
    setLocalError('');
    if (!file) return;
    if (!ACCEPT.split(',').includes(file.type)) return setLocalError('Choose a JPG, PNG, WEBP, GIF or SVG image');
    if (file.size > MAX_BYTES) return setLocalError('Image must be 2 MB or smaller');
    setPreview(URL.createObjectURL(file));
    setRemoved(false);
    onChange(file, { removed: false });
  };

  const clear = () => {
    setPreview(null);
    setRemoved(true);
    if (inputRef.current) inputRef.current.value = '';
    onChange(null, { removed: true });
  };

  const shown = preview || (removed ? null : currentUrl);

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">{label}</span>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar user={user} src={shown || null} size="lg" className="border border-gray-200 dark:border-gray-800" />
        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor={id}
            className="shadow-theme-xs inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          >
            <UploadIcon size={18} />
            {shown ? 'Change' : 'Upload'}
          </label>
          <input ref={inputRef} id={id} type="file" accept={ACCEPT} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
          {shown && (
            <button type="button" onClick={clear} className="text-error-500 hover:text-error-600 text-sm font-medium">
              Remove
            </button>
          )}
          <p className="text-theme-xs w-full text-gray-500 dark:text-gray-400">JPG, PNG, WEBP, GIF or SVG. Max 2 MB.</p>
        </div>
      </div>
      <FieldError>{localError || error}</FieldError>
    </div>
  );
}
