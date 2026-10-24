import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';
import { ChevronDownIcon, LogoutIcon, UserCircleIcon } from '../common/icons';

export default function UserDropdown() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const signOut = async () => {
    setOpen(false);
    await logout();
    navigate('/signin', { replace: true });
  };

  return (
    <div className="relative" ref={ref}>
      <button type="button" className="flex items-center text-gray-700 dark:text-gray-400" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Avatar user={user} className="mr-3" />
        <span className="text-theme-sm mr-1 hidden font-medium sm:block">{user?.first_name}</span>
        <ChevronDownIcon className={`stroke-gray-500 transition-transform dark:stroke-gray-400 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="shadow-theme-lg dark:bg-gray-dark absolute right-0 mt-4.25 flex w-65 flex-col rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800">
          <div>
            <span className="text-theme-sm block font-medium text-gray-700 dark:text-gray-400">{user?.full_name}</span>
            <span className="text-theme-xs mt-0.5 block break-all text-gray-500 dark:text-gray-400">{user?.email}</span>
            <span className="text-theme-xs text-brand-500 mt-1 block font-medium">{user?.role?.name}</span>
          </div>

          <ul className="flex flex-col gap-1 border-b border-gray-200 pt-4 pb-3 dark:border-gray-800">
            <li>
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="group text-theme-sm flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
              >
                <UserCircleIcon className="text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300" />
                Edit profile
              </Link>
            </li>
          </ul>
          <button
            type="button"
            onClick={signOut}
            className="group text-theme-sm mt-3 flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
          >
            <LogoutIcon className="text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
