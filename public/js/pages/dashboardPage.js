// Dashboard Page Controller

import { dashboardApi } from '../api/dashboardApi.js';
import { apiFetch } from '../api/client.js';
import { formatCurrency, formatDate, escapeHTML } from '../utils.js';
import { openModal } from '../wizards.js';
import { Router } from '../router.js';

export async function loadDashboardStats() {
  try {
    const data = await dashboardApi.getStats();

    // 1. Staff KPI
    const staffEl = document.getElementById('dashActiveStaff');
    const breakdownEl = document.getElementById('dashStaffBreakdown');
    if (staffEl) staffEl.textContent = data.employeeCounts.active_employees;
    if (breakdownEl) {
      breakdownEl.textContent = `${data.employeeCounts.fixed_count} Fixed • ${data.employeeCounts.hourly_count} Hourly`;
    }

    // 2. Attendance KPI
    const presentEl = document.getElementById('dashTodayPresent');
    const attStatusEl = document.getElementById('dashTodayAttStatus');
    if (presentEl) presentEl.textContent = data.todayAttendance.present_today;
    if (attStatusEl) {
      attStatusEl.textContent = `${data.todayAttendance.half_day_today} Half • ${data.todayAttendance.absent_today} Absent • ${data.todayAttendance.unmarked_today} Pending`;
    }

    // 3. Advances KPI
    const advTotalEl = document.getElementById('dashAdvancesTotal');
    const advMonthEl = document.getElementById('dashAdvancesMonth');
    if (advTotalEl) advTotalEl.textContent = formatCurrency(data.advanceStats.total_unsettled_advance);
    if (advMonthEl) advMonthEl.textContent = `Given this Month: ${formatCurrency(data.advanceStats.month_advance_given)}`;

    // 4. Payroll KPI
    const remSalary = parseFloat(data.payrollStats.total_remaining_salary);
    const grossSalary = parseFloat(data.payrollStats.total_gross_salary);
    const netSalary = parseFloat(data.payrollStats.total_net_salary);

    const remEl = document.getElementById('dashRemainingSalary');
    const payNetEl = document.getElementById('dashPayrollNet');
    if (remEl) remEl.textContent = formatCurrency(remSalary);
    if (payNetEl) payNetEl.textContent = `Gross: ${formatCurrency(grossSalary)} • Net: ${formatCurrency(netSalary)}`;

    // 5. Today's Attendance Table
    const todayTable = document.getElementById('dashTodayAttendanceTable');
    if (todayTable) {
      const attRes = await apiFetch(`/api/attendance/by-date?date=${data.today}`);
      if (attRes.ok) {
        const attData = await attRes.json();
        const dateBadge = document.getElementById('dashTodayDateBadge');
        if (dateBadge) dateBadge.textContent = formatDate(data.today);

        if (attData.attendance.length === 0) {
          todayTable.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 20px;">No active employees found.</td></tr>`;
        } else {
          todayTable.innerHTML = attData.attendance.map(row => {
            let statusBadge = '<span class="badge badge-neutral">Unmarked</span>';
            if (row.status === 'present') statusBadge = '<span class="badge badge-success">Present</span>';
            else if (row.status === 'half_day') statusBadge = '<span class="badge badge-warning">Half-Day</span>';
            else if (row.status === 'absent') statusBadge = '<span class="badge badge-danger">Absent</span>';
            else if (row.status === 'paid_leave') statusBadge = '<span class="badge badge-fixed">Paid Leave</span>';

            const typeBadge = row.employment_type === 'fixed'
              ? '<span class="badge badge-fixed">Fixed</span>'
              : '<span class="badge badge-hourly">Hourly</span>';

            return `
              <tr>
                <td>
                  <div style="font-weight: 600;">${escapeHTML(row.name)}</div>
                  <div style="font-size: 11px; color: #64748b;">${escapeHTML(row.designation)}</div>
                </td>
                <td>${typeBadge}</td>
                <td>${statusBadge}</td>
                <td><strong>${row.hours_worked || 0} hrs</strong></td>
              </tr>
            `;
          }).join('');
        }
      }
    }

    // 6. Recent Advances Table
    const advancesTable = document.getElementById('dashRecentAdvancesTable');
    if (advancesTable && data.recentAdvances) {
      if (data.recentAdvances.length === 0) {
        advancesTable.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 20px;">No advances recorded yet.</td></tr>`;
      } else {
        advancesTable.innerHTML = data.recentAdvances.map(a => {
          const remaining = parseFloat(a.amount) - parseFloat(a.settled_amount);
          return `
            <tr>
              <td>
                <div style="font-weight: 600;">${escapeHTML(a.employee_name)}</div>
                <div style="font-size: 11px; color: #64748b;">${escapeHTML(a.reason || 'Personal')}</div>
              </td>
              <td><strong style="color: #d97706;">${formatCurrency(a.amount)}</strong></td>
              <td>${formatDate(a.date)}</td>
              <td>
                ${remaining > 0 
                  ? `<span class="badge badge-warning">${formatCurrency(remaining)}</span>` 
                  : `<span class="badge badge-success">Settled</span>`}
              </td>
            </tr>
          `;
        }).join('');
      }
    }
  } catch (err) {
    console.error('Error loading dashboard stats:', err);
  }
}

export function initDashboardPage() {
  document.getElementById('btnGoToAttendance')?.addEventListener('click', () => Router.navigate('/attendance'));
  document.getElementById('btnGoToAdvances')?.addEventListener('click', () => Router.navigate('/advances'));
  document.getElementById('btnQuickAttendance')?.addEventListener('click', () => Router.navigate('/attendance'));
  document.getElementById('btnQuickAdvance')?.addEventListener('click', () => {
    Router.navigate('/advances');
    openModal('modalAdvance');
  });
  document.getElementById('btnQuickPayroll')?.addEventListener('click', () => Router.navigate('/payroll'));
}
