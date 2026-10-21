// Web Component: <status-badge>
// Usage: <status-badge status="present"></status-badge> or <status-badge status="paid" label="Fully Paid"></status-badge>

class StatusBadge extends HTMLElement {
  static get observedAttributes() {
    return ['status', 'label'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const rawStatus = (this.getAttribute('status') || '').toLowerCase().trim();
    const customLabel = this.getAttribute('label');

    let badgeClass = 'badge-neutral';
    let text = customLabel || rawStatus;

    switch (rawStatus) {
      case 'present':
        badgeClass = 'badge-success';
        text = customLabel || 'Present';
        break;
      case 'half_day':
      case 'half day':
        badgeClass = 'badge-warning';
        text = customLabel || 'Half Day';
        break;
      case 'absent':
        badgeClass = 'badge-danger';
        text = customLabel || 'Absent';
        break;
      case 'active':
        badgeClass = 'badge-success';
        text = customLabel || 'Active';
        break;
      case 'inactive':
        badgeClass = 'badge-neutral';
        text = customLabel || 'Inactive';
        break;
      case 'paid':
        badgeClass = 'badge-success';
        text = customLabel || 'Paid';
        break;
      case 'partial':
        badgeClass = 'badge-warning';
        text = customLabel || 'Partial';
        break;
      case 'unpaid':
        badgeClass = 'badge-danger';
        text = customLabel || 'Unpaid';
        break;
      case 'unsettled':
        badgeClass = 'badge-warning';
        text = customLabel || 'Unsettled';
        break;
      case 'settled':
        badgeClass = 'badge-success';
        text = customLabel || 'Settled';
        break;
      default:
        badgeClass = 'badge-neutral';
        text = customLabel || rawStatus || 'N/A';
    }

    this.innerHTML = `<span class="badge ${badgeClass}">${text}</span>`;
  }
}

if (!customElements.get('status-badge')) {
  customElements.define('status-badge', StatusBadge);
}

export default StatusBadge;
