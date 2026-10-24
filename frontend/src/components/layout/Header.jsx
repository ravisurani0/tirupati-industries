import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSidebar } from '../../context/SidebarContext';
import { Logo, ThemeToggleButton } from '../common/Common';
import { CloseIcon, DotsIcon, MenuDesktopIcon, MenuIcon } from '../common/icons';
import UserDropdown from './UserDropdown';

export default function Header() {
  const { sidebarToggle, toggleSidebar } = useSidebar();
  const [menuToggle, setMenuToggle] = useState(false);

  return (
    <header className="sticky top-0 z-99999 flex w-full border-gray-200 bg-white xl:border-b dark:border-gray-800 dark:bg-gray-900">
      <div className="flex grow flex-col items-center justify-between xl:flex-row xl:px-6">
        <div className="flex w-full items-center justify-between gap-2 border-b border-gray-200 px-3 py-3 sm:gap-4 lg:py-4 xl:justify-normal xl:border-b-0 xl:px-0 dark:border-gray-800">
          {/* Hamburger: opens the drawer on mobile, collapses the sidebar on desktop */}
          <button
            type="button"
            data-sidebar-toggle
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
            className={`z-99999 flex h-10 w-10 items-center justify-center rounded-lg border-gray-200 text-gray-500 xl:h-11 xl:w-11 xl:border dark:border-gray-800 dark:text-gray-400 ${
              sidebarToggle ? 'bg-gray-100 xl:bg-transparent dark:bg-gray-800 dark:xl:bg-transparent' : ''
            }`}
          >
            <MenuDesktopIcon className="hidden fill-current xl:block" />
            {sidebarToggle ? <CloseIcon className="fill-current xl:hidden" /> : <MenuIcon className="fill-current xl:hidden" />}
          </button>

          <Link to="/" className="xl:hidden" aria-label="EMS home">
            <Logo />
          </Link>

          {/* Shows the actions row on small screens */}
          <button
            type="button"
            onClick={() => setMenuToggle((v) => !v)}
            aria-label="Toggle header menu"
            className={`z-99999 flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 xl:hidden dark:text-gray-400 dark:hover:bg-gray-800 ${
              menuToggle ? 'bg-gray-100 dark:bg-gray-800' : ''
            }`}
          >
            <DotsIcon className="fill-current" />
          </button>
        </div>

        <div
          className={`shadow-theme-md w-full items-center justify-between gap-4 px-5 py-4 xl:flex xl:justify-end xl:px-0 xl:shadow-none ${
            menuToggle ? 'flex' : 'hidden'
          }`}
        >
          <div className="2xsm:gap-3 flex items-center gap-2">
            <ThemeToggleButton />
          </div>
          <UserDropdown />
        </div>
      </div>
    </header>
  );
}
