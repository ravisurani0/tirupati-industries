import { UserCircleIcon } from '../common/icons';

const sizes = {
  sm: 'h-10 w-10 text-sm',
  md: 'h-11 w-11 text-sm',
  lg: 'h-20 w-20 text-xl',
};

export function initials(user) {
  if (!user) return '';
  return `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase();
}

/** Profile logo with an initials fallback */
export default function Avatar({ user, src, size = 'md', className = '' }) {
  const url = src ?? user?.profile_logo_url;
  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${sizes[size]} ${className}`}>
      {url ? (
        <img src={url} alt={user ? `${user.first_name} ${user.last_name}` : 'Profile'} className="h-full w-full object-cover" />
      ) : (
        <span className="bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400 flex h-full w-full items-center justify-center font-semibold">
          {initials(user) || <UserCircleIcon className="h-1/2 w-1/2" />}
        </span>
      )}
    </span>
  );
}
