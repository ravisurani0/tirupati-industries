// Tirupati Industries - Main Application Entry Point (Modular Architecture)

// Web Components
import './components/StatCard.js';
import './components/StatusBadge.js';
import './components/MoneyDisplay.js';
import './components/BottomNav.js';

// Core State & Utilities
import { AppState } from './state.js';
import { Router } from './router.js';
import { initModalListeners } from './wizards.js';
import { showToast } from './utils.js';

// API Services
import { authApi } from './api/authApi.js';

// Page Controllers
import { loadDashboardStats, initDashboardPage } from './pages/dashboardPage.js';
import { loadEmployees, initEmployeesPage } from './pages/employeesPage.js';
import { loadDailyAttendance, loadMonthlyAttendanceSummary, initAttendancePage } from './pages/attendancePage.js';
import { loadAdvances, initAdvancesPage } from './pages/advancesPage.js';
import { loadPayroll, initPayrollPage } from './pages/payrollPage.js';
import { initReportsPage } from './pages/reportsPage.js';
import { initSettingsPage, updateAdminUI, openAdminProfileModal } from './pages/settingsPage.js';

// Responsive Sidebar Drawer for Mobile
function setupResponsiveDrawer() {
  const toggleBtn = document.getElementById('btnSidebarToggle');
  const overlay = document.getElementById('sidebarOverlay');
  const sidebar = document.getElementById('appSidebar');

  const closeDrawer = () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('active');
  };

  const toggleDrawer = () => {
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('active');
  };

  toggleBtn?.addEventListener('click', toggleDrawer);
  overlay?.addEventListener('click', closeDrawer);

  document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 1024) {
        closeDrawer();
      }
    });
  });
}

// Date & Month Pickers Initialization
function initDateControls() {
  const todayStr = new Date().toISOString().split('T')[0];
  const monthStr = todayStr.slice(0, 7);

  const attPicker = document.getElementById('attendanceDatePicker');
  if (attPicker) {
    attPicker.value = todayStr;
    AppState.attendanceDate = todayStr;
  }

  const attMonth = document.getElementById('attSummaryMonthPicker');
  if (attMonth) attMonth.value = monthStr;

  const payMonth = document.getElementById('payrollMonthPicker');
  if (payMonth) {
    payMonth.value = monthStr;
    AppState.currentMonth = monthStr;
  }

  const repMonth = document.getElementById('reportPayrollMonth');
  if (repMonth) repMonth.value = monthStr;

  const advDate = document.getElementById('advDate');
  if (advDate) advDate.value = todayStr;

  const empJoin = document.getElementById('empJoiningDate');
  if (empJoin) empJoin.value = todayStr;
}

// Global Event Listeners
function setupGlobalListeners() {
  document.getElementById('btnLogout')?.addEventListener('click', () => authApi.logout());

  document.getElementById('btnRefreshData')?.addEventListener('click', () => {
    Router.navigate(AppState.currentRoute || '/dashboard');
    showToast('Data refreshed successfully');
  });
}

// Bootstrap Application
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Session & Auth Check
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login';
    return;
  }

  let currentUser = null;
  try {
    const data = await authApi.getMe();
    currentUser = data.user;
    AppState.currentUser = currentUser;
    localStorage.setItem('user', JSON.stringify(currentUser));
  } catch (err) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    return;
  }

  // 2. Set Admin & Workshop branding
  updateAdminUI(currentUser);

  // 3. Initialize Responsive Mobile Drawer
  setupResponsiveDrawer();

  // 4. Initialize Date & Month Pickers
  initDateControls();

  // 5. Initialize Modals & Wizards
  initModalListeners();

  // 6. Initialize Page-specific Listeners
  initDashboardPage();
  initEmployeesPage();
  initAttendancePage();
  initAdvancesPage();
  initPayrollPage();
  initReportsPage();
  initSettingsPage();
  setupGlobalListeners();

  // 7. Register Route Handlers
  Router.register('/', () => loadDashboardStats());
  Router.register('/dashboard', () => loadDashboardStats());
  Router.register('/employees', () => loadEmployees());
  Router.register('/attendance', () => {
    loadDailyAttendance(AppState.attendanceDate);
    loadMonthlyAttendanceSummary(AppState.currentMonth);
  });
  Router.register('/advances', () => loadAdvances());
  Router.register('/payroll', () => loadPayroll(AppState.currentMonth));
  Router.register('/reports', () => {});
  Router.register('/settings', () => openAdminProfileModal());

  // 8. Preload Employees (needed across dropdowns)
  await loadEmployees();

  // 9. Start Router and Load Initial Page
  Router.init();
});
