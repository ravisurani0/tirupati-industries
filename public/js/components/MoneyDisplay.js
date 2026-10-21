// Web Component: <money-display>
// Usage: <money-display amount="25000"></money-display>

import { formatCurrency } from '../utils.js';

class MoneyDisplay extends HTMLElement {
  static get observedAttributes() {
    return ['amount', 'color'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const amount = this.getAttribute('amount');
    const color = this.getAttribute('color');
    const formatted = formatCurrency(amount);

    if (color) {
      this.innerHTML = `<span style="color: ${color}; font-weight: 600;">${formatted}</span>`;
    } else {
      this.innerHTML = `<span style="font-weight: 600;">${formatted}</span>`;
    }
  }
}

if (!customElements.get('money-display')) {
  customElements.define('money-display', MoneyDisplay);
}

export default MoneyDisplay;
