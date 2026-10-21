// Monthly Payroll & Remaining Salary Page Controller

import { apiFetch } from '../api/client.js';
import { AppState } from '../state.js';
import { formatCurrency, formatDate, escapeHTML, showToast } from '../utils.js';
import { openModal, closeModal, validateAllSteps } from '../wizards.js';
import { loadDashboardStats } from './dashboardPage.js';
import { loadAdvances } from './advancesPage.js';

export async function loadPayroll(monthStr) {
  try {
    const res = await apiFetch(`/api/payroll/calculate?month=${encodeURIComponent(monthStr)}`);
    if (!res.ok) throw new Error('Failed to calculate payroll');

    const data = await res.json();
    AppState.payrollData = data;

    const targetLabel = document.getElementById('payrollTargetMonthLabel');
    if (targetLabel) targetLabel.textContent = monthStr;

    // Update Banner
    const grossEl = document.getElementById('payBannerGross');
    const advEl = document.getElementById('payBannerAdvances');
    const bonusEl = document.getElementById('payBannerBonus');
    const netEl = document.getElementById('payBannerNet');
    const paidEl = document.getElementById('payBannerPaid');
    const remEl = document.getElementById('payBannerRemaining');

    if (grossEl) grossEl.textContent = formatCurrency(data.totals.total_gross);
    if (advEl) advEl.textContent = formatCurrency(data.totals.total_advance_deductions);
    if (bonusEl) bonusEl.textContent = formatCurrency(data.totals.total_bonus);
    if (netEl) netEl.textContent = formatCurrency(data.totals.total_net);
    if (paidEl) paidEl.textContent = formatCurrency(data.totals.total_paid);
    if (remEl) remEl.textContent = formatCurrency(data.totals.total_remaining);

    const tbody = document.getElementById('payrollTableBody');
    if (!tbody) return;

    if (data.payroll.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #94a3b8; padding: 30px;">No staff records to calculate for ${monthStr}.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.payroll.map((p, idx) => {
      const isFixed = p.employment_type === 'fixed';
      const daysWorked = p.effective_working_days;
      const totalHours = p.total_hours_worked;

      const rateDisplay = isFixed
        ? `${formatCurrency(p.base_rate)}/mo`
        : `${formatCurrency(p.base_rate)}/hr`;

      const workUnitDisplay = isFixed
        ? `<strong>${daysWorked}</strong> / ${p.month_total_days} Days`
        : `<strong>${totalHours}</strong> Hours`;

      const statusBadge = p.payment_status === 'paid'
        ? '<span class="badge badge-success">Fully Paid</span>'
        : (p.payment_status === 'partially_paid' 
            ? '<span class="badge badge-warning">Partial</span>' 
            : '<span class="badge badge-danger">Unpaid</span>');

      return `
        <tr data-emp-id="${p.employee_id}" data-idx="${idx}">
          <td>
            <div style="font-weight: 700; color: #0f172a;">${escapeHTML(p.name)}</div>
            <div style="font-size: 11px; color: #64748b;">${escapeHTML(p.designation)}</div>
          </td>
          <td>
            <div style="font-size: 12px; font-weight: 600;">${rateDisplay}</div>
            <div style="font-size: 11px; color: #64748b;">${isFixed ? 'Fixed Salary' : 'Hourly Wage'}</div>
          </td>
          <td>${workUnitDisplay}</td>
          <td><strong style="font-size: 14px; color: #0f172a;">${formatCurrency(p.gross_salary)}</strong></td>
          <td>
            <input type="number" step="any" class="form-control pay-advance" style="width: 95px; font-weight: 600; color: #d97706;" 
                   value="${p.advance_deduction}" min="0" max="${p.available_advance + p.advance_deduction}" 
                   title="Available advance balance: ${formatCurrency(p.available_advance)}">
          </td>
          <td>
            <input type="number" step="any" class="form-control pay-bonus" style="width: 85px; color: #2563eb;" 
                   value="${p.bonus_allowance || 0}" min="0">
          </td>
          <td>
            <strong class="pay-net-display" style="font-size: 14px; color: #059669;">
              ${formatCurrency(p.net_salary)}
            </strong>
          </td>
          <td>${formatCurrency(p.paid_amount)}</td>
          <td>
            <strong class="pay-rem-display" style="font-size: 14px; color: ${p.remaining_salary > 0 ? '#dc2626' : '#059669'};">
              ${formatCurrency(p.remaining_salary)}
            </strong>
          </td>
          <td>${statusBadge}</td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 6px;">
              ${p.remaining_salary > 0 ? `
                <button class="btn btn-success btn-sm" onclick="openPaymentModal(${idx})" title="Record Salary Payment">
                  Pay Now
                </button>
              ` : `
                <span class="badge badge-success" style="padding: 6px 8px;">Settled</span>
              `}
              ${p.id ? `
                <button class="btn btn-outline btn-sm" onclick="viewPayslip(${p.id})" title="Print Salary Slip">
                  Slip
                </button>
              ` : `
                <button class="btn btn-outline btn-sm" onclick="showToast('Please Save Payroll first to generate permanent slips', 'error')" title="Save first">
                  Slip
                </button>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach live change recalculation
    tbody.querySelectorAll('.pay-advance, .pay-bonus').forEach(input => {
      input.addEventListener('input', (e) => {
        const tr = e.target.closest('tr');
        const idx = parseInt(tr.getAttribute('data-idx'), 10);
        recalcRow(tr, idx);
      });
    });
  } catch (err) {
    console.error('Error loading payroll:', err);
  }
}

export function recalcRow(tr, idx) {
  const item = AppState.payrollData.payroll[idx];
  const advDeduct = parseFloat(tr.querySelector('.pay-advance').value) || 0;
  const bonus = parseFloat(tr.querySelector('.pay-bonus').value) || 0;

  const gross = item.gross_salary;
  const net = Math.max(0, gross - advDeduct + bonus);
  const paid = item.paid_amount;
  const rem = Math.max(0, net - paid);

  item.advance_deduction = advDeduct;
  item.bonus_allowance = bonus;
  item.net_salary = net;
  item.remaining_salary = rem;

  tr.querySelector('.pay-net-display').textContent = formatCurrency(net);
  const remEl = tr.querySelector('.pay-rem-display');
  remEl.textContent = formatCurrency(rem);
  remEl.style.color = rem > 0 ? '#dc2626' : '#059669';

  // Recalculate banner totals
  const totals = AppState.payrollData.payroll.reduce((acc, p) => {
    acc.gross += p.gross_salary;
    acc.adv += p.advance_deduction;
    acc.bonus += p.bonus_allowance;
    acc.net += p.net_salary;
    acc.paid += p.paid_amount;
    acc.rem += p.remaining_salary;
    return acc;
  }, { gross: 0, adv: 0, bonus: 0, net: 0, paid: 0, rem: 0 });

  document.getElementById('payBannerGross').textContent = formatCurrency(totals.gross);
  document.getElementById('payBannerAdvances').textContent = formatCurrency(totals.adv);
  document.getElementById('payBannerBonus').textContent = formatCurrency(totals.bonus);
  document.getElementById('payBannerNet').textContent = formatCurrency(totals.net);
  document.getElementById('payBannerPaid').textContent = formatCurrency(totals.paid);
  document.getElementById('payBannerRemaining').textContent = formatCurrency(totals.rem);
}

export async function saveAllPayroll() {
  if (!AppState.payrollData || !AppState.payrollData.payroll) return;

  const month = AppState.currentMonth;
  const records = AppState.payrollData.payroll.map(p => ({
    employee_id: p.employee_id,
    employment_type: p.employment_type,
    base_rate: p.base_rate,
    month_total_days: p.month_total_days,
    present_days: p.present_days,
    half_days: p.half_days,
    absent_days: p.absent_days,
    paid_leaves: p.paid_leaves,
    total_working_days: p.effective_working_days,
    total_hours_worked: p.total_hours_worked,
    gross_salary: p.gross_salary,
    advance_deduction: p.advance_deduction,
    bonus_allowance: p.bonus_allowance,
    other_deductions: p.other_deductions,
    net_salary: p.net_salary,
    paid_amount: p.paid_amount,
    remaining_salary: p.remaining_salary,
    payment_status: p.payment_status,
    payment_date: p.payment_date,
    payment_mode: p.payment_mode,
    notes: p.notes
  }));

  try {
    const res = await apiFetch('/api/payroll/save', {
      method: 'POST',
      body: JSON.stringify({ month, records })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save payroll');

    showToast(`Monthly payroll for ${month} saved and locked!`);
    await loadPayroll(month);
    await loadDashboardStats();
    await loadAdvances();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

export function openPaymentModal(idx) {
  const item = AppState.payrollData?.payroll?.[idx];
  if (!item) return;

  if (!item.id) {
    alert('Please click "Save / Lock Payroll" button first before recording payments so payroll records are initialized.');
    return;
  }

  document.getElementById('payPayrollId').value = item.id;
  document.getElementById('payModalEmpName').textContent = `${item.name} (${item.designation})`;
  document.getElementById('payModalMonth').textContent = `Settlement Month: ${AppState.currentMonth}`;
  document.getElementById('payModalNet').textContent = formatCurrency(item.net_salary);
  document.getElementById('payModalPaid').textContent = formatCurrency(item.paid_amount);
  document.getElementById('payModalRemaining').textContent = formatCurrency(item.remaining_salary);

  document.getElementById('payAmount').value = item.remaining_salary;
  document.getElementById('payMode').value = item.payment_mode || 'Cash';
  document.getElementById('payRef').value = '';
  document.getElementById('payNotes').value = item.notes || '';

  openModal('modalPayment');
}

export async function handlePaymentSubmit(e) {
  e.preventDefault();
  if (!validateAllSteps(document.getElementById('formPayment'), 'pay')) return;
  const payrollId = document.getElementById('payPayrollId').value;
  const amount = parseFloat(document.getElementById('payAmount').value);
  const mode = document.getElementById('payMode').value;
  const ref = document.getElementById('payRef').value;
  const notes = document.getElementById('payNotes')?.value || '';

  if (!payrollId || isNaN(amount) || amount <= 0) {
    showToast('Valid payment amount is required', 'error');
    return;
  }

  try {
    const res = await apiFetch('/api/payroll/record-payment', {
      method: 'POST',
      body: JSON.stringify({
        payroll_id: payrollId,
        payment_amount: amount,
        payment_mode: mode,
        payment_reference: ref,
        notes: notes
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to record payment');

    closeModal('modalPayment');
    showToast(`Payment of ${formatCurrency(amount)} recorded successfully!`);
    await loadPayroll(AppState.currentMonth);
    await loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

export async function viewPayslip(payrollId) {
  try {
    const res = await apiFetch(`/api/payroll/slip/${payrollId}`);
    if (!res.ok) throw new Error('Failed to load payslip');

    const data = await res.json();
    const { slip, advancesDeducted } = data;

    const isFixed = slip.employment_type === 'fixed';

    const htmlContent = `
      <div class="payslip-header">
        <h2>TIRUPATI INDUSTRIES</h2>
        <p>Plot No. 42, GIDC Industrial Estate, Rajkot - 360003, Gujarat</p>
        <p style="font-weight: 700; margin-top: 4px; font-size: 13px;">SALARY PAYMENT VOUCHER • MONTH: ${slip.month}</p>
      </div>

      <div class="payslip-grid">
        <div>
          <div><strong>Employee Name:</strong> ${escapeHTML(slip.name)}</div>
          <div><strong>Designation:</strong> ${escapeHTML(slip.designation)}</div>
          <div><strong>Wage Type:</strong> ${isFixed ? 'Fixed Monthly Salary' : 'Hourly Wage'}</div>
        </div>
        <div>
          <div><strong>Voucher Date:</strong> ${formatDate(slip.payment_date || new Date().toISOString())}</div>
          <div><strong>Disbursement Mode:</strong> ${escapeHTML(slip.payment_mode || 'Cash')}</div>
          <div><strong>Payment Ref:</strong> ${escapeHTML(slip.payment_reference || 'Voucher #' + slip.id)}</div>
        </div>
      </div>

      <table class="payslip-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Units / Calculation</th>
            <th style="text-align: right;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Base Wage Rate</td>
            <td>${isFixed ? `₹${parseFloat(slip.base_rate).toLocaleString('en-IN')} / month` : `₹${parseFloat(slip.base_rate).toLocaleString('en-IN')} / hour`}</td>
            <td style="text-align: right;">-</td>
          </tr>
          <tr>
            <td>Working Days / Hours</td>
            <td>${isFixed ? `${slip.total_working_days} Days (out of ${slip.month_total_days})` : `${slip.total_hours_worked} Hours worked`}</td>
            <td style="text-align: right;"><strong>${formatCurrency(slip.gross_salary)}</strong></td>
          </tr>
          ${parseFloat(slip.bonus_allowance) > 0 ? `
            <tr>
              <td>Incentives / Overtime Bonus</td>
              <td>Additional allowance</td>
              <td style="text-align: right; color: #2563eb;">+ ${formatCurrency(slip.bonus_allowance)}</td>
            </tr>
          ` : ''}
          ${parseFloat(slip.advance_deduction) > 0 ? `
            <tr>
              <td>Advance Salary Deductions</td>
              <td>Recovered from worker advances</td>
              <td style="text-align: right; color: #d97706;">- ${formatCurrency(slip.advance_deduction)}</td>
            </tr>
          ` : ''}
          ${parseFloat(slip.other_deductions) > 0 ? `
            <tr>
              <td>Other Deductions / Penalties</td>
              <td>Workshop deductions</td>
              <td style="text-align: right; color: #dc2626;">- ${formatCurrency(slip.other_deductions)}</td>
            </tr>
          ` : ''}
          <tr style="background: #f8fafc; font-weight: 800; font-size: 14px;">
            <td>NET PAYABLE SALARY</td>
            <td>Total Earned Wages</td>
            <td style="text-align: right; color: #059669;">${formatCurrency(slip.net_salary)}</td>
          </tr>
          <tr>
            <td>Amount Disbursed / Paid</td>
            <td>Paid to worker</td>
            <td style="text-align: right;">${formatCurrency(slip.paid_amount)}</td>
          </tr>
          <tr style="font-weight: 700; color: ${parseFloat(slip.remaining_salary) > 0 ? '#dc2626' : '#059669'};">
            <td>Remaining Balance Payable</td>
            <td>Pending balance</td>
            <td style="text-align: right;">${formatCurrency(slip.remaining_salary)}</td>
          </tr>
        </tbody>
      </table>

      ${advancesDeducted.length > 0 ? `
        <div style="font-size: 11px; color: #64748b; margin-top: 8px;">
          * Advance Deductions Breakdown: ${advancesDeducted.map(a => `₹${a.amount_deducted} (Advance of ${formatDate(a.advance_date)}: ${escapeHTML(a.reason || 'Personal')})`).join(', ')}
        </div>
      ` : ''}

      <div class="payslip-signatures">
        <div class="signature-line">
          <div>Worker Signature</div>
          <div style="font-size: 10px; color: #94a3b8; font-weight: 400;">Received with thanks</div>
        </div>
        <div class="signature-line">
          <div>For Tirupati Industries</div>
          <div style="font-size: 10px; color: #94a3b8; font-weight: 400;">Authorized Workshop Signatory</div>
        </div>
      </div>
    `;

    document.getElementById('payslipModalContent').innerHTML = htmlContent;
    document.getElementById('payslipPrintArea').innerHTML = htmlContent;

    openModal('modalPayslip');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.openPaymentModal = openPaymentModal;
window.viewPayslip = viewPayslip;

export function initPayrollPage() {
  window.openPaymentModal = openPaymentModal;
  window.viewPayslip = viewPayslip;

  const monthPicker = document.getElementById('payrollMonthPicker');
  monthPicker?.addEventListener('change', (e) => {
    AppState.currentMonth = e.target.value;
    loadPayroll(AppState.currentMonth);
  });

  document.getElementById('btnRecalculatePayroll')?.addEventListener('click', () => {
    loadPayroll(AppState.currentMonth);
    showToast('Payroll recalculated from live attendance and advance data');
  });

  document.getElementById('btnSaveAllPayroll')?.addEventListener('click', saveAllPayroll);

  document.getElementById('formPayment')?.addEventListener('submit', handlePaymentSubmit);
  document.getElementById('btnUpdatePayment')?.addEventListener('click', () => {
    document.getElementById('formPayment')?.requestSubmit();
  });

  document.getElementById('btnPrintSlip')?.addEventListener('click', () => {
    window.print();
  });
}
