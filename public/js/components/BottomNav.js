// Web Component: <mobile-bottom-nav>
// Native-like bottom navigation bar for mobile devices (< 768px)

class MobileBottomNav extends HTMLElement {
  static get observedAttributes() {
    return ['active'];
  }

  connectedCallback() {
    this.render();
    this.setupListeners();
  }

  attributeChangedCallback() {
    this.updateActiveTab();
  }

  render() {
    const currentActive = this.getAttribute('active') || 'dashboard';

    this.innerHTML = `
      <nav class="bottom-nav-container" aria-label="Mobile Navigation">
        <a href="/dashboard" class="bnav-item ${currentActive === 'dashboard' ? 'active' : ''}" data-route="/dashboard">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
          <span>Dashboard</span>
        </a>

        <a href="/attendance" class="bnav-item ${currentActive === 'attendance' ? 'active' : ''}" data-route="/attendance">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>Attendance</span>
        </a>

        <a href="/advances" class="bnav-item ${currentActive === 'advances' ? 'active' : ''}" data-route="/advances">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          <span>Advances</span>
        </a>

        <a href="/payroll" class="bnav-item ${currentActive === 'payroll' ? 'active' : ''}" data-route="/payroll">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <span>Payroll</span>
        </a>

        <button type="button" class="bnav-item bnav-more-btn" id="bnavToggleDrawer" aria-label="Open More Menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
          <span>More</span>
        </button>
      </nav>
    `;
  }

  updateActiveTab() {
    const activeRoute = this.getAttribute('active') || 'dashboard';
    const items = this.querySelectorAll('.bnav-item');
    items.forEach(item => {
      const route = item.getAttribute('data-route') || '';
      if (route.includes(activeRoute)) {
        item.classList.add('active');
      } else if (!item.classList.contains('bnav-more-btn')) {
        item.classList.remove('active');
      }
    });
  }

  setupListeners() {
    const drawerBtn = this.querySelector('#bnavToggleDrawer');
    drawerBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      const sidebar = document.getElementById('appSidebar');
      const overlay = document.getElementById('sidebarOverlay');
      sidebar?.classList.toggle('open');
      overlay?.classList.toggle('active');
    });
  }
}

if (!customElements.get('mobile-bottom-nav')) {
  customElements.define('mobile-bottom-nav', MobileBottomNav);
}

export default MobileBottomNav;
