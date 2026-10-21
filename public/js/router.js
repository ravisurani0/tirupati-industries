// HTML5 History API Client-Side Router for Module Pages

import { AppState } from './state.js';

export const routes = {
  '/': { tab: 'dashboard', title: 'Workshop Dashboard', sub: 'Real-time overview of staff, wages, advances & monthly payroll' },
  '/dashboard': { tab: 'dashboard', title: 'Workshop Dashboard', sub: 'Real-time overview of staff, wages, advances & monthly payroll' },
  '/employees': { tab: 'employees', title: 'Employee Management', sub: 'Fixed monthly salary & hourly workshop staff records' },
  '/attendance': { tab: 'attendance', title: 'Daily Attendance & Hours Log', sub: 'Track daily attendance, working days, and hourly shifts' },
  '/advances': { tab: 'advances', title: 'Advance Salary Management', sub: 'Worker advance disbursement and repayment ledger' },
  '/payroll': { tab: 'payroll', title: 'Monthly Payroll & Remaining Salary', sub: 'Automated wage calculation, advance deductions & balance settlement' },
  '/reports': { tab: 'reports', title: 'Audit Reports & Exports', sub: 'Download workshop payroll summaries and advance ledgers' },
  '/settings': { tab: 'settings', title: 'Admin Settings', sub: 'Manage workshop profile, login username & security password' }
};

const routeHandlers = new Map();

export const Router = {
  register(route, handler) {
    routeHandlers.set(route, handler);
  },

  getCurrentRoute() {
    let path = window.location.pathname;
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    return routes[path] ? path : '/dashboard';
  },

  navigate(path, replace = false) {
    if (path === '/') path = '/dashboard';
    const routeInfo = routes[path] || routes['/dashboard'];
    const tabName = routeInfo.tab;

    // Update URL in browser history
    if (window.location.pathname !== path) {
      if (replace) {
        window.history.replaceState({ path }, '', path);
      } else {
        window.history.pushState({ path }, '', path);
      }
    }

    AppState.currentTab = tabName;
    AppState.currentRoute = path;

    // Update Browser Document Title
    document.title = `${routeInfo.title} • Tirupati Industries`;

    // Update Header Section Title & Subtitle
    const titleEl = document.getElementById('topSectionTitle');
    const subEl = document.getElementById('topSectionSubtitle');
    if (titleEl) titleEl.textContent = routeInfo.title;
    if (subEl) subEl.textContent = routeInfo.sub;

    // Update Sidebar Navigation Active States
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
      const linkTab = link.getAttribute('data-tab');
      const href = link.getAttribute('href');
      link.classList.toggle('active', linkTab === tabName || href === path);
    });

    // Update Mobile Bottom Navigation
    const bottomNav = document.querySelector('mobile-bottom-nav');
    if (bottomNav) {
      bottomNav.setAttribute('active', tabName);
    }

    // Update Tab Panes
    if (tabName !== 'settings') {
      document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === `tab-${tabName}`);
      });
    }

    // Close Mobile Drawer if open
    const sidebar = document.getElementById('appSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (window.innerWidth <= 1024) {
      sidebar?.classList.remove('open');
      overlay?.classList.remove('active');
    }

    // Scroll main window to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Execute registered route handler
    const handler = routeHandlers.get(path) || routeHandlers.get(tabName);
    if (handler) {
      try {
        handler();
      } catch (err) {
        console.error(`Error executing route handler for ${path}:`, err);
      }
    }
  },

  init() {
    // Intercept clicks on links with internal routes
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="/"], [data-route]');
      if (!link) return;

      const href = link.getAttribute('href') || link.getAttribute('data-route');
      if (href && routes[href]) {
        e.preventDefault();
        Router.navigate(href);
      }
    });

    // Handle browser back and forward buttons
    window.addEventListener('popstate', (e) => {
      const targetPath = e.state?.path || Router.getCurrentRoute();
      Router.navigate(targetPath, true);
    });

    // Handle initial route on page load / reload
    const initialRoute = Router.getCurrentRoute();
    Router.navigate(initialRoute, true);
  }
};
