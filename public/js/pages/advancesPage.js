// Advance Salary Management Page Controller

import { advancesApi } from '../api/advancesApi.js';
import { apiFetch } from '../api/client.js';
import { AppState } from '../state.js';
import { formatCurrency, formatDate, escapeHTML, showToast } from '../utils.js';
import { openModal, closeModal, validateAllSteps } from '../wizards.js';
import { loadDashboardStats } from './dashboardPage.js';
import { loadEmployees } from './employeesPage.js';

export async function loadAdvances() {
  try {
    const status = document.getElementById('advFilterStatus')?.value || 'all';
    const search = document.getElementById('advSearchInput')?.value || '';

    const data = await advancesApi.getAll({ status, search });
    AppState.advances = data.advances;

    // Load advance KPI summary
    try {
      const kpiData = await advancesApi.getSummary();
      const unsettledEl = document.getElementById('advKpiUnsettled');
      const monthEl = document.getElementById('advKpiMonth');
      const totalEl = document.getElementById('advKpiTotal');

      if (unsettledEl) unsettledEl.textContent = formatCurrency(kpiData.stats.total_unsettled);
      if (monthEl) monthEl.textContent = formatCurrency(kpiData.stats.current_month_given);
      if (totalEl) totalEl.textContent = formatCurrency(kpiData.stats.total_all_time);
    } catch (kpiErr) {
      console.warn('Could not load advance summary KPI:', kpiErr);
    }

    const tbody = document.getElementById('advancesTableBody');
    if (!tbody) return;

    const countBadge = document.getElementById('advCountBadge');
    if (countBadge) countBadge.textContent = `${data.advances.length} Records`;

    if (data.advances.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #94a3b8; padding: 30px;">No advance salary records found.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.advances.map(a => {
      const remaining = parseFloat(a.remaining_advance) || 0;
      const isSettled = a.status === 'settled';

      const statusBadge = isSettled
        ? '<span class="badge badge-success">Fully Settled</span>'
        : (parseFloat(a.settled_amount) > 0 
            ? '<span class="badge badge-warning">Partially Settled</span>' 
            : '<span class="badge badge-danger">Unsettled</span>');

      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: #0f172a;">${escapeHTML(a.employee_name)}</div>
            <div style="font-size: 11px; color: #64748b;">${escapeHTML(a.employee_designation)}</div>
          </td>
          <td>${formatDate(a.date)}</td>
          <td><strong style="color: #d97706; font-size: 14px;">${formatCurrency(a.amount)}</strong></td>
          <td>${formatCurrency(a.settled_amount)}</td>
          <td>
            <strong style="color: ${remaining > 0 ? '#dc2626' : '#059669'}; font-size: 14px;">
              ${formatCurrency(remaining)}
            </strong>
          </td>
          <td><span style="font-size: 12px; color: #334155;">${escapeHTML(a.reason || 'Personal Advance')}</span></td>
          <td><span class="badge badge-neutral">${escapeHTML(a.payment_mode || 'Cash')}</span></td>
          <td>${statusBadge}</td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 6px;">
              <button class="btn btn-outline btn-sm" onclick="editAdvance(${a.id})" title="Edit Advance">
                Edit
              </button>
              ${!isSettled && parseFloat(a.settled_amount) === 0 ? `
                <button class="btn btn-outline btn-sm" style="color: #dc2626;" onclick="deleteAdvance(${a.id})" title="Cancel Advance">
                  Delete
                </button>
              ` : `
                <span style="font-size: 11px; color: #94a3b8; align-self: center;">Settled</span>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading advances:', err);
  }
}

export function populateAdvanceEmployeeDropdown() {
  const select = document.getElementById('advEmployeeSelect');
  if (!select) return;

  select.innerHTML = '<option value="">-- Choose Employee --</option>' + 
    AppState.employees
      .filter(e => e.status === 'active')
      .map(e => `<option value="${e.id}" data-unsettled="${e.unsettled_advance_total || 0}">${escapeHTML(e.name)} (${escapeHTML(e.designation)})</option>`)
      .join('');

  document.getElementById('advId').value = '';
  document.getElementById('advAmount').value = '';
  document.getElementById('advReason').value = '';
  document.getElementById('advDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('advCurrentBalanceHint').textContent = 'Current unsettled advance: ₹0';
  document.getElementById('modalAdvTitle').textContent = 'Issue Salary Advance';
}

export function editAdvance(id) {
  const adv = AppState.advances.find(a => a.id === id);
  if (!adv) return;

  populateAdvanceEmployeeDropdown();

  document.getElementById('advId').value = adv.id;
  document.getElementById('advEmployeeSelect').value = adv.employee_id;
  document.getElementById('advAmount').value = adv.amount;
  document.getElementById('advDate').value = adv.date ? adv.date.split('T')[0] : '';
  document.getElementById('advPaymentMode').value = adv.payment_mode || 'Cash';
  document.getElementById('advReason').value = adv.reason || '';
  document.getElementById('modalAdvTitle').textContent = `Edit Advance #${adv.id} - ${adv.employee_name}`;

  const remaining = (parseFloat(adv.amount) - parseFloat(adv.settled_amount)) || 0;
  document.getElementById('advCurrentBalanceHint').textContent = `Current unsettled balance: ${formatCurrency(remaining)}`;

  openModal('modalAdvance');
}

export async function deleteAdvance(id) {
  if (!confirm('Are you sure you want to remove this advance record?')) return;

  try {
    const data = await advancesApi.delete(id);
    showToast(data.message || 'Advance record deleted');
    await loadAdvances();
    await loadDashboardStats();
    await loadEmployees();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleAdvanceFormSubmit(e) {
  e.preventDefault();
  if (!validateAllSteps(document.getElementById('formAdvance'), 'adv')) return;
  const advId = document.getElementById('advId')?.value;
  const isEdit = !!advId;

  const empId = document.getElementById('advEmployeeSelect').value;
  const amount = parseFloat(document.getElementById('advAmount').value);
  const date = document.getElementById('advDate').value;
  const reason = document.getElementById('advReason').value;
  const paymentMode = document.getElementById('advPaymentMode').value;

  if (!empId || !amount || amount <= 0) {
    showToast('Please select employee and valid amount', 'error');
    return;
  }

  const payload = {
    employee_id: empId,
    amount,
    date,
    reason,
    payment_mode: paymentMode
  };

  try {
    let data;
    if (isEdit) {
      data = await advancesApi.update(advId, payload);
    } else {
      data = await advancesApi.create(payload);
    }

    closeModal('modalAdvance');
    showToast(isEdit ? 'Advance updated successfully' : `Advance of ${formatCurrency(amount)} recorded successfully`);
    await loadAdvances();
    await loadDashboardStats();
    await loadEmployees();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.editAdvance = editAdvance;
window.deleteAdvance = deleteAdvance;

export function initAdvancesPage() {
  window.editAdvance = editAdvance;
  window.deleteAdvance = deleteAdvance;

  // Filter & Search
  document.getElementById('advSearchInput')?.addEventListener('input', () => loadAdvances());
  document.getElementById('advFilterStatus')?.addEventListener('change', () => loadAdvances());

  // Modal Open Buttons
  document.getElementById('btnOpenIssueAdvanceModal')?.addEventListener('click', () => {
    populateAdvanceEmployeeDropdown();
    openModal('modalAdvance');
  });

  // Employee Select Change in Modal
  document.getElementById('advEmployeeSelect')?.addEventListener('change', (e) => {
    const selectedOption = e.target.selectedOptions[0];
    if (!selectedOption || !selectedOption.value) {
      document.getElementById('advCurrentBalanceHint').textContent = 'Current unsettled advance: ₹0';
      return;
    }
    const unsettled = selectedOption.getAttribute('data-unsettled') || 0;
    document.getElementById('advCurrentBalanceHint').textContent = 
      `Current unsettled advance: ${formatCurrency(unsettled)}`;
  });

  // Form submit & Update button
  document.getElementById('formAdvance')?.addEventListener('submit', handleAdvanceFormSubmit);
  document.getElementById('btnUpdateAdvance')?.addEventListener('click', () => {
    document.getElementById('formAdvance')?.requestSubmit();
  });
}
