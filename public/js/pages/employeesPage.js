// Employee Management Page Controller

import { employeesApi } from '../api/employeesApi.js';
import { AppState } from '../state.js';
import { formatCurrency, formatDate, escapeHTML, showToast } from '../utils.js';
import { openModal, closeModal, validateAllSteps } from '../wizards.js';
import { loadDashboardStats } from './dashboardPage.js';

export async function loadEmployees() {
  try {
    const search = document.getElementById('empSearchInput')?.value || '';
    const type = document.getElementById('empFilterType')?.value || 'all';
    const status = document.getElementById('empFilterStatus')?.value || 'all';

    const data = await employeesApi.getAll({ search, type, status });
    AppState.employees = data.employees;

    const tbody = document.getElementById('employeesTableBody');
    if (!tbody) return;

    if (data.employees.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 30px;">No employees match the criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.employees.map(emp => {
      const isFixed = emp.employment_type === 'fixed';
      const typeBadge = isFixed
        ? '<span class="badge badge-fixed">Fixed Monthly</span>'
        : '<span class="badge badge-hourly">Hourly Wage</span>';

      const rateDisplay = isFixed
        ? `<strong>${formatCurrency(emp.base_salary)}</strong> / mo`
        : `<strong>${formatCurrency(emp.base_salary)}</strong> / hr`;

      const unsettled = parseFloat(emp.unsettled_advance_total) || 0;
      const advanceBadge = unsettled > 0
        ? `<span class="badge badge-warning" title="${emp.unsettled_advance_count} unsettled advance(s)">${formatCurrency(unsettled)} Pending</span>`
        : `<span class="badge badge-neutral" style="color: #94a3b8;">None</span>`;

      const statusBadge = emp.status === 'active'
        ? '<span class="badge badge-success">Active</span>'
        : '<span class="badge badge-neutral">Inactive</span>';

      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: #0f172a;">${escapeHTML(emp.name)}</div>
            <div style="font-size: 11px; color: #64748b;">${escapeHTML(emp.phone || 'No phone')}</div>
          </td>
          <td><span style="font-weight: 500;">${escapeHTML(emp.designation)}</span></td>
          <td>${typeBadge}</td>
          <td>${rateDisplay}</td>
          <td>${emp.standard_hours_per_day || 8} hrs/day</td>
          <td>${advanceBadge}</td>
          <td>${statusBadge}</td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 6px;">
              <button class="btn btn-outline btn-sm" onclick="viewEmployeeProfile(${emp.id})" title="View Profile & Ledger">
                Profile
              </button>
              <button class="btn btn-outline btn-sm" onclick="editEmployee(${emp.id})" title="Edit Details">
                Edit
              </button>
              <button class="btn btn-outline btn-sm" style="color: #dc2626;" onclick="deleteEmployee(${emp.id}, '${escapeHTML(emp.name)}')" title="Deactivate or Remove">
                &times;
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading employees:', err);
  }
}

export function resetEmployeeForm() {
  document.getElementById('formEmployee')?.reset();
  const empId = document.getElementById('empId');
  if (empId) empId.value = '';
  const title = document.getElementById('modalEmpTitle');
  if (title) title.textContent = 'Add New Workshop Employee';
  const typeEl = document.getElementById('empType');
  if (typeEl) typeEl.value = 'fixed';
  const labelEl = document.getElementById('empSalaryLabel');
  if (labelEl) labelEl.textContent = 'Monthly Fixed Salary (₹) *';
  const hintEl = document.getElementById('empSalaryHint');
  if (hintEl) hintEl.textContent = 'Monthly salary calculated against working days.';
  const hoursEl = document.getElementById('empStandardHours');
  if (hoursEl) hoursEl.value = '8.0';
  const joinEl = document.getElementById('empJoiningDate');
  if (joinEl) joinEl.value = new Date().toISOString().split('T')[0];
  const statusEl = document.getElementById('empStatus');
  if (statusEl) statusEl.value = 'active';
  const modeEl = document.getElementById('empPaymentMode');
  if (modeEl) modeEl.value = 'Cash';
}

export async function editEmployee(id) {
  try {
    const data = await employeesApi.getAll();
    const employee = data.employees?.find(e => e.id === id);
    if (!employee) throw new Error('Employee not found');

    document.getElementById('empId').value = employee.id;
    document.getElementById('empName').value = employee.name;
    document.getElementById('empPhone').value = employee.phone || '';
    document.getElementById('empDesignation').value = employee.designation;
    document.getElementById('empType').value = employee.employment_type;
    document.getElementById('empSalary').value = employee.base_salary;
    document.getElementById('empStandardHours').value = employee.standard_hours_per_day || 8;
    document.getElementById('empJoiningDate').value = employee.joining_date ? employee.joining_date.split('T')[0] : '';
    document.getElementById('empStatus').value = employee.status;
    document.getElementById('empPaymentMode').value = employee.payment_mode || 'Cash';
    document.getElementById('empBankDetails').value = employee.bank_details || '';
    document.getElementById('empNotes').value = employee.notes || '';

    // Trigger label change
    document.getElementById('empType').dispatchEvent(new Event('change'));

    document.getElementById('modalEmpTitle').textContent = `Edit Employee: ${employee.name}`;
    openModal('modalEmployee');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

export async function deleteEmployee(id, name) {
  if (!confirm(`Are you sure you want to deactivate or remove ${name}?`)) return;

  try {
    const data = await employeesApi.delete(id);
    showToast(data.message || 'Employee removed');
    await loadEmployees();
    await loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

export async function viewEmployeeProfile(id) {
  try {
    const data = await employeesApi.getAll();
    const res = await fetch(`/api/employees/${id}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (!res.ok) throw new Error('Employee profile not found');
    const { employee, advances, recentAttendance, payrollHistory, summary } = await res.json();

    const nameEl = document.getElementById('profileEmpName');
    if (nameEl) nameEl.textContent = `${employee.name} - Profile & Ledger`;

    const body = document.getElementById('profileModalBody');
    if (body) {
      body.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
          <div>
            <div style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Employee Details</div>
            <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 4px;">${escapeHTML(employee.name)}</div>
            <div style="font-size: 13px; color: #334155;">${escapeHTML(employee.designation)}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">📞 ${escapeHTML(employee.phone || 'No phone')}</div>
            <div style="font-size: 12px; color: #64748b;">📅 Joined: ${formatDate(employee.joining_date)}</div>
          </div>
          <div>
            <div style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Wage & Advances Overview</div>
            <div style="font-size: 14px; font-weight: 700; color: #2563eb; margin-top: 4px;">
              ${employee.employment_type === 'fixed' ? `${formatCurrency(employee.base_salary)} / month` : `${formatCurrency(employee.base_salary)} / hour`}
            </div>
            <div style="font-size: 12px; margin-top: 6px;">
              Outstanding Advance: <strong style="color: #d97706;">${formatCurrency(summary.current_unsettled_advance)}</strong>
            </div>
            <div style="font-size: 12px; color: #64748b;">
              All-Time Advances Taken: ${formatCurrency(summary.total_advance_taken)}
            </div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
              Preferred Payment: <strong>${escapeHTML(employee.payment_mode || 'Cash')}</strong> (${escapeHTML(employee.bank_details || 'N/A')})
            </div>
          </div>
        </div>

        <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 10px; color: #0f172a;">Recent Advances History</h4>
        <div class="table-responsive" style="margin-bottom: 24px;">
          <table class="app-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Settled</th>
                <th>Remaining</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${advances.length === 0 ? '<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:12px;">No advances recorded.</td></tr>' : advances.map(a => `
                <tr>
                  <td>${formatDate(a.date)}</td>
                  <td><strong>${formatCurrency(a.amount)}</strong></td>
                  <td>${formatCurrency(a.settled_amount)}</td>
                  <td><strong style="color: #d97706;">${formatCurrency(a.amount - a.settled_amount)}</strong></td>
                  <td>${escapeHTML(a.reason || '-')}</td>
                  <td><span class="badge ${a.status === 'settled' ? 'badge-success' : 'badge-warning'}">${a.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 10px; color: #0f172a;">Past Payroll Settlements</h4>
        <div class="table-responsive">
          <table class="app-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Gross Wages</th>
                <th>Advance Deducted</th>
                <th>Net Salary</th>
                <th>Paid Amount</th>
                <th>Remaining</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${payrollHistory.length === 0 ? '<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:12px;">No settled payrolls found yet.</td></tr>' : payrollHistory.map(p => `
                <tr>
                  <td><strong>${p.month}</strong></td>
                  <td>${formatCurrency(p.gross_salary)}</td>
                  <td>${formatCurrency(p.advance_deduction)}</td>
                  <td>${formatCurrency(p.net_salary)}</td>
                  <td>${formatCurrency(p.paid_amount)}</td>
                  <td><strong style="color: #dc2626;">${formatCurrency(p.remaining_salary)}</strong></td>
                  <td><span class="badge ${p.payment_status === 'paid' ? 'badge-success' : 'badge-danger'}">${p.payment_status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    openModal('modalEmpProfile');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleEmployeeFormSubmit(e) {
  e.preventDefault();
  if (!validateAllSteps(document.getElementById('formEmployee'), 'emp')) return;
  const id = document.getElementById('empId').value;
  const isEdit = !!id;

  const payload = {
    name: document.getElementById('empName').value,
    phone: document.getElementById('empPhone').value,
    designation: document.getElementById('empDesignation').value,
    employment_type: document.getElementById('empType').value,
    base_salary: parseFloat(document.getElementById('empSalary').value),
    standard_hours_per_day: parseFloat(document.getElementById('empStandardHours').value) || 8,
    joining_date: document.getElementById('empJoiningDate').value,
    status: document.getElementById('empStatus').value,
    payment_mode: document.getElementById('empPaymentMode').value,
    bank_details: document.getElementById('empBankDetails').value,
    notes: document.getElementById('empNotes').value
  };

  try {
    let data;
    if (isEdit) {
      data = await employeesApi.update(id, payload);
    } else {
      data = await employeesApi.create(payload);
    }

    closeModal('modalEmployee');
    showToast(isEdit ? 'Employee updated successfully' : 'Employee added successfully');
    await loadEmployees();
    await loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.editEmployee = editEmployee;
window.deleteEmployee = deleteEmployee;
window.viewEmployeeProfile = viewEmployeeProfile;

export function initEmployeesPage() {
  // Attach window helpers for inline table button onclicks
  window.editEmployee = editEmployee;
  window.deleteEmployee = deleteEmployee;
  window.viewEmployeeProfile = viewEmployeeProfile;

  // Filter & Search
  document.getElementById('empSearchInput')?.addEventListener('input', () => loadEmployees());
  document.getElementById('empFilterType')?.addEventListener('change', () => loadEmployees());
  document.getElementById('empFilterStatus')?.addEventListener('change', () => loadEmployees());

  // Type Toggle (Fixed vs Hourly)
  document.getElementById('empType')?.addEventListener('change', (e) => {
    const isHourly = e.target.value === 'hourly';
    const label = document.getElementById('empSalaryLabel');
    const input = document.getElementById('empSalary');
    const hint = document.getElementById('empSalaryHint');

    if (isHourly) {
      if (label) label.textContent = 'Hourly Wage Rate (₹/hr) *';
      if (input) input.placeholder = 'e.g. 120';
      if (hint) hint.textContent = 'Calculated by multiplying hourly rate with recorded attendance hours.';
    } else {
      if (label) label.textContent = 'Monthly Fixed Salary (₹) *';
      if (input) input.placeholder = 'e.g. 22000';
      if (hint) hint.textContent = 'Monthly salary calculated against working days.';
    }
  });

  // Modal Open Buttons
  document.getElementById('btnOpenAddEmpModal')?.addEventListener('click', () => {
    resetEmployeeForm();
    openModal('modalEmployee');
  });

  document.getElementById('btnQuickAddEmp')?.addEventListener('click', () => {
    resetEmployeeForm();
    openModal('modalEmployee');
  });

  // Form submit & Update button
  document.getElementById('formEmployee')?.addEventListener('submit', handleEmployeeFormSubmit);
  document.getElementById('btnUpdateEmployee')?.addEventListener('click', () => {
    document.getElementById('formEmployee')?.requestSubmit();
  });
}
