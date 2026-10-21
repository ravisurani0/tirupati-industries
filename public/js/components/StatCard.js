// Web Component: <workshop-stat-card>
// Usage: <workshop-stat-card title="Total Workers" value="12" sub="8 Fixed • 4 Hourly" icon="users"></workshop-stat-card>

class WorkshopStatCard extends HTMLElement {
  static get observedAttributes() {
    return ['title', 'value', 'sub', 'icon', 'color'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const title = this.getAttribute('title') || '';
    const value = this.getAttribute('value') || '0';
    const sub = this.getAttribute('sub') || '';
    const icon = this.getAttribute('icon') || 'trend';
    const color = this.getAttribute('color') || '#2563eb';

    const icons = {
      users: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      clock: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
      rupee: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
      file: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
      check: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
      trend: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`
    };

    const iconSvg = icons[icon] || icons.trend;

    this.innerHTML = `
      <div class="stat-card" style="--card-accent: ${color};">
        <div class="stat-header">
          <p class="stat-title">${title}</p>
          <div class="stat-icon" style="color: ${color}; background: ${color}15;">
            ${iconSvg}
          </div>
        </div>
        <h3 class="stat-value">${value}</h3>
        ${sub ? `<div class="sub-stat">${sub}</div>` : ''}
      </div>
    `;
  }
}

if (!customElements.get('workshop-stat-card')) {
  customElements.define('workshop-stat-card', WorkshopStatCard);
}

export default WorkshopStatCard;
