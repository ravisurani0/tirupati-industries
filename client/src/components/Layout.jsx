import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import BottomNav from './BottomNav';
import ToastContainer from './ToastContainer';
import EmployeeModal from './EmployeeModal';
import AdvanceModal from './AdvanceModal';
import LoanDetailsModal from './LoanDetailsModal';
import PaymentModal from './PaymentModal';
import PayslipModal from './PayslipModal';
import ProfileModal from './ProfileModal';
import SettingsModal from './SettingsModal';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  HandCoins,
  Receipt,
  FileSpreadsheet,
  Settings,
  LogOut,
  Menu,
  RotateCw,
  X
} from 'lucide-react';

const routeTitles = {
  '/': { title: 'Workshop Dashboard', sub: 'Real-time overview of staff, wages, advances & monthly payroll' },
  '/dashboard': { title: 'Workshop Dashboard', sub: 'Real-time overview of staff, wages, advances & monthly payroll' },
  '/employees': { title: 'Employee Management', sub: 'Fixed monthly salary & hourly workshop staff records' },
  '/attendance': { title: 'Daily Attendance & Hours Log', sub: 'Track daily attendance, working days, and hourly shifts' },
  '/advances': { title: 'Advance Salary Management', sub: 'Worker advance disbursement and repayment ledger' },
  '/payroll': { title: 'Monthly Payroll & Remaining Salary', sub: 'Automated wage calculation, advance deductions & balance settlement' },
  '/reports': { title: 'Audit Reports & Exports', sub: 'Download workshop payroll summaries and advance ledgers' }
};

export default function Layout() {
  const { user, logout } = useAuth();
  const { isDrawerOpen, toggleDrawer, closeDrawer, activeModal, openModal, showToast } = useApp();
  const location = useLocation();

  const currentInfo = routeTitles[location.pathname] || routeTitles['/dashboard'];

  const getInitials = (name) => {
    if (!name) return 'TI';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="app-container">
      {/* Mobile Drawer Overlay Backdrop */}
      <div
        className={`sidebar-overlay ${isDrawerOpen ? 'active' : ''}`}
        onClick={closeDrawer}
      />

      {/* Sidebar Navigation (Desktop persistent, Mobile slide-out drawer) */}
      <aside className={`sidebar ${isDrawerOpen ? 'open' : ''}`} id="appSidebar">
        <div className="sidebar-header">
          <div className="brand-icon">TI</div>
          <div className="brand-text">
            <h2>{user?.workshop_name?.split(' ')[0] || 'TIRUPATI'}</h2>
            <p>Industries • Rajkot</p>
          </div>
          <button
            className="btn-sidebar-close"
            onClick={closeDrawer}
            aria-label="Close navigation drawer"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={closeDrawer}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/employees"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={closeDrawer}
          >
            <Users size={18} />
            <span>Employees</span>
          </NavLink>

          <NavLink
            to="/attendance"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={closeDrawer}
          >
            <CalendarCheck size={18} />
            <span>Attendance & Days</span>
          </NavLink>

          <NavLink
            to="/advances"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={closeDrawer}
          >
            <HandCoins size={18} />
            <span>Advance Salary</span>
          </NavLink>

          <NavLink
            to="/payroll"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={closeDrawer}
          >
            <Receipt size={18} />
            <span>Payroll & Salary</span>
          </NavLink>

          <NavLink
            to="/reports"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={closeDrawer}
          >
            <FileSpreadsheet size={18} />
            <span>Reports & Export</span>
          </NavLink>

          <button
            type="button"
            className="nav-link"
            onClick={() => {
              closeDrawer();
              openModal('settings');
            }}
          >
            <Settings size={18} />
            <span>Admin Settings</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div
            className="admin-info"
            onClick={() => openModal('settings')}
            title="Click to edit admin details & password"
          >
            <div className="admin-avatar">{getInitials(user?.fullName || user?.username)}</div>
            <div className="admin-meta">
              <div className="admin-name">{user?.fullName || user?.username || 'Admin'}</div>
              <div className="admin-role">Workshop Manager</div>
            </div>
          </div>
          <button className="btn-logout" onClick={logout} title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Sticky Header */}
        <header className="top-header">
          <div className="header-left">
            <button
              className="btn-sidebar-toggle"
              onClick={toggleDrawer}
              aria-label="Toggle Navigation Menu"
            >
              <Menu size={20} />
            </button>
            <div className="page-title">
              <h1>{currentInfo.title}</h1>
              <p className="page-subtitle">{currentInfo.sub}</p>
            </div>
          </div>

          <div className="header-actions">
            <div className="workshop-badge">
              <span className="live-indicator" />
              <span>{user?.workshop_name || 'Tirupati Industries'}</span>
            </div>

            <button
              className="btn btn-outline btn-sm header-action-btn"
              onClick={() => openModal('settings')}
              title="Admin Settings & Password"
              aria-label="Admin Settings"
            >
              <Settings size={15} />
              <span className="header-action-label">Settings</span>
            </button>

            <button
              className="btn btn-outline btn-sm header-action-btn"
              onClick={() => {
                window.location.reload();
              }}
              title="Refresh Application"
              aria-label="Refresh Data"
            >
              <RotateCw size={15} />
              <span className="header-action-label">Refresh</span>
            </button>
          </div>
        </header>

        {/* Page Content Viewport */}
        <div className="content-body">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav />

      {/* Global Notifications */}
      <ToastContainer />

      {/* Modals */}
      {activeModal?.name === 'employee' && (
        <EmployeeModal employee={activeModal.props?.employee} onSave={activeModal.props?.onSave} />
      )}
      {activeModal?.name === 'advance' && (
        <AdvanceModal
          advance={activeModal.props?.advance}
          defaultType={activeModal.props?.defaultType}
          onSave={activeModal.props?.onSave}
        />
      )}
      {activeModal?.name === 'loanDetails' && (
        <LoanDetailsModal
          loanId={activeModal.props?.loanId}
          onSave={activeModal.props?.onSave}
        />
      )}
      {activeModal?.name === 'payment' && (
        <PaymentModal
          item={activeModal.props?.item}
          month={activeModal.props?.month}
          onSave={activeModal.props?.onSave}
        />
      )}
      {activeModal?.name === 'slip' && (
        <PayslipModal payrollId={activeModal.props?.payrollId} />
      )}
      {activeModal?.name === 'profile' && (
        <ProfileModal employeeId={activeModal.props?.employeeId} />
      )}
      {activeModal?.name === 'settings' && <SettingsModal />}
    </div>
  );
}
