import { Link, NavLink } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import { Logo } from '../common/Common';
import { BriefcaseIcon, CalendarIcon, DotsIcon, BanknoteIcon, HandCoinsIcon, ReceiptIcon, TagIcon, WalletIcon, GridIcon, ShieldIcon, UserCircleIcon, UsersIcon } from '../common/icons';

/** Menu definition. `roles` (on a group or an item) limits it to those role slugs. */
const MENU = [
  {
    title: 'Menu',
    items: [
      { label: 'Dashboard', to: '/', icon: GridIcon, end: true },
      { label: 'Employees', to: '/employees', icon: BriefcaseIcon, roles: ['admin', 'manager'] },
      { label: 'Attendance', to: '/attendance', icon: CalendarIcon, roles: ['admin', 'manager'] },
      { label: 'My Profile', to: '/profile', icon: UserCircleIcon },
    ],
  },
  {
    title: 'Finance',
    roles: ['admin', 'manager'],
    items: [
      { label: 'Payroll', to: '/payroll', icon: BanknoteIcon, roles: ['admin'] },
      { label: 'Daily Expenses', to: '/expenses', icon: ReceiptIcon },
      { label: 'Accounts', to: '/accounts', icon: WalletIcon },
      { label: 'Categories', to: '/expense-categories', icon: TagIcon },
      { label: 'Advances & Loans', to: '/advances', icon: HandCoinsIcon, roles: ['admin'] },
    ],
  },
  {
    title: 'Administration',
    roles: ['admin'],
    items: [
      { label: 'Users', to: '/users', icon: UsersIcon },
      { label: 'Roles', to: '/roles', icon: ShieldIcon },
    ],
  },
];

export default function Sidebar() {
  const { sidebarToggle, closeMobileSidebar } = useSidebar();
  const { hasRole } = useAuth();
  const ref = useRef(null);

  // Click outside closes the drawer on small screens (same as the template's @click.outside)
  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !e.target.closest('[data-sidebar-toggle]')) closeMobileSidebar();
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [closeMobileSidebar]);

  const collapsed = sidebarToggle; // only meaningful at xl+
  const hideText = collapsed ? 'xl:hidden' : '';

  return (
    <aside
      ref={ref}
      data-collapsed={collapsed}
      className={`sidebar fixed top-0 left-0 z-9999 flex h-screen w-72.5 flex-col overflow-y-auto border-r border-gray-200 bg-white px-5 transition-all duration-300 xl:static xl:translate-x-0 dark:border-gray-800 dark:bg-black ${
        sidebarToggle ? 'translate-x-0 xl:w-22.5' : '-translate-x-full'
      }`}
    >
      <div className={`sidebar-header flex items-center gap-2 pt-8 pb-7 ${collapsed ? 'xl:justify-center' : 'justify-between'}`}>
        <Link to="/" onClick={closeMobileSidebar} aria-label="EMS home">
          <span className={`logo ${collapsed ? 'xl:hidden' : ''}`}>
            <Logo />
          </span>
          <span className={`logo-icon hidden ${collapsed ? 'xl:block' : ''}`}>
            <Logo iconOnly />
          </span>
        </Link>
      </div>

      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav>
          {MENU.filter((g) => !g.roles || hasRole(...g.roles)).map((group) => (
            <div key={group.title}>
              <h3 className="mb-4 text-xs leading-5 text-gray-400 uppercase">
                <span className={`menu-group-title ${hideText}`}>{group.title}</span>
                <DotsIcon className={`menu-group-icon mx-auto hidden fill-current ${collapsed ? 'xl:block' : ''}`} />
              </h3>
              <ul className="mb-6 flex flex-col gap-1">
                {group.items.filter((i) => !i.roles || hasRole(...i.roles)).map(({ label, to, icon: Icon, end }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={end}
                      onClick={closeMobileSidebar}
                      className={({ isActive }) => `menu-item group ${isActive ? 'menu-item-active' : 'menu-item-inactive'}`}
                    >
                      {({ isActive }) => (
                        <>
                          <Icon className={isActive ? 'menu-item-icon-active' : 'menu-item-icon-inactive'} />
                          <span className={`menu-item-text ${hideText}`}>{label}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
