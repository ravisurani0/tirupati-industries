import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarCheck, HandCoins, Receipt, Menu } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function BottomNav() {
  const { toggleDrawer } = useApp();

  return (
    <nav className="bottom-nav" aria-label="Mobile Bottom Navigation">
      <div className="bottom-nav-container">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/attendance"
          className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}
        >
          <CalendarCheck size={20} />
          <span>Attendance</span>
        </NavLink>

        <NavLink
          to="/advances"
          className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}
        >
          <HandCoins size={20} />
          <span>Advances</span>
        </NavLink>

        <NavLink
          to="/payroll"
          className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}
        >
          <Receipt size={20} />
          <span>Payroll</span>
        </NavLink>

        <button
          type="button"
          className="bnav-item bnav-more-btn"
          onClick={toggleDrawer}
          aria-label="Open More Menu"
        >
          <Menu size={20} />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
