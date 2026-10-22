import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarCheck, HandCoins, Receipt } from 'lucide-react';

export default function BottomNav() {
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
          to="/employees"
          className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}
        >
          <Users size={20} />
          <span>Staff</span>
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
      </div>
    </nav>
  );
}
