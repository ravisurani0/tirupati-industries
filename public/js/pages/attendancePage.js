// Daily Attendance & Hours Log Page Controller

import { apiFetch } from '../api/client.js';
import { AppState } from '../state.js';
import { formatDate, escapeHTML, showToast } from '../utils.js';
import { loadDashboardStats } from './dashboardPage.js';

export async function loadDailyAttendance(dateStr) {
  try {
    const res = await apiFetch(`/api/attendance/by-date?date=${encodeURIComponent(dateStr)}`);
    if (!res.ok) throw new Error('Failed to load attendance');

    const data = await res.json();
    const dateLabel = document.getElementById('attCurrentDateLabel');
    const counterBadge = document.getElementById('attCounterBadge');
    if (dateLabel) dateLabel.textContent = formatDate(dateStr);
    if (counterBadge) counterBadge.textContent = `${data.attendance.length} Staff`;

    const tbody = document.getElementById('attendanceGridBody');
    if (!tbody) return;

    if (data.attendance.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 30px;">No active employees found.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.attendance.map(row => {
      const isHourly = row.employment_type === 'hourly';
      const status = row.status || 'present';

      return `
        <tr data-emp-id="${row.employee_id}">
          <td>
            <div style="font-weight: 700; color: #0f172a;">${escapeHTML(row.name)}</div>
            <div style="font-size: 11px; color: #64748b;">${escapeHTML(row.designation)}</div>
          </td>
          <td>
            ${isHourly 
              ? '<span class="badge badge-hourly">Hourly</span>' 
              : '<span class="badge badge-fixed">Fixed Monthly</span>'}
          </td>
          <td>
            <div class="attendance-radio-group">
              <input type="radio" id="st_p_${row.employee_id}" name="status_${row.employee_id}" value="present" ${status === 'present' ? 'checked' : ''}>
              <label for="st_p_${row.employee_id}">Present</label>

              <input type="radio" id="st_h_${row.employee_id}" name="status_${row.employee_id}" value="half_day" ${status === 'half_day' ? 'checked' : ''}>
              <label for="st_h_${row.employee_id}">Half-Day (0.5)</label>

              <input type="radio" id="st_a_${row.employee_id}" name="status_${row.employee_id}" value="absent" ${status === 'absent' ? 'checked' : ''}>
              <label for="st_a_${row.employee_id}">Absent (0)</label>

              <input type="radio" id="st_l_${row.employee_id}" name="status_${row.employee_id}" value="paid_leave" ${status === 'paid_leave' ? 'checked' : ''}>
              <label for="st_l_${row.employee_id}">Paid Leave</label>
            </div>
          </td>
          <td>
            <input type="number" step="0.5" class="form-control att-hours" style="width: 85px; font-weight: 600;" 
                   value="${row.hours_worked !== null ? row.hours_worked : (isHourly ? row.standard_hours_per_day : 8)}" 
                   min="0" max="24">
          </td>
          <td>
            <input type="number" step="0.5" class="form-control att-ot" style="width: 75px;" 
                   value="${row.overtime_hours || 0}" min="0" max="16">
          </td>
          <td>
            <input type="text" class="form-control att-notes" style="width: 140px; font-size: 12px;" 
                   placeholder="Shift note..." value="${escapeHTML(row.notes || '')}">
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading daily attendance:', err);
  }
}

export function markAllPresent() {
  document.querySelectorAll('#attendanceGridBody tr').forEach(tr => {
    const radio = tr.querySelector('input[value="present"]');
    if (radio) radio.checked = true;
  });
  showToast('Marked all employees as Present for this date.');
}

export async function saveAttendance() {
  const trs = document.querySelectorAll('#attendanceGridBody tr[data-emp-id]');
  if (trs.length === 0) return;

  const records = [];
  trs.forEach(tr => {
    const empId = parseInt(tr.getAttribute('data-emp-id'), 10);
    const checkedRadio = tr.querySelector(`input[name="status_${empId}"]:checked`);
    const status = checkedRadio ? checkedRadio.value : 'present';
    const hours = parseFloat(tr.querySelector('.att-hours')?.value) || 0;
    const ot = parseFloat(tr.querySelector('.att-ot')?.value) || 0;
    const notes = tr.querySelector('.att-notes')?.value || '';

    records.push({
      employee_id: empId,
      status,
      hours_worked: hours,
      overtime_hours: ot,
      notes
    });
  });

  try {
    const res = await apiFetch('/api/attendance/bulk', {
      method: 'POST',
      body: JSON.stringify({
        date: AppState.attendanceDate,
        records
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save attendance');

    showToast(`Attendance saved for ${formatDate(AppState.attendanceDate)} (${records.length} staff)`);
    await loadDashboardStats();
    await loadMonthlyAttendanceSummary(AppState.currentMonth);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

export async function loadMonthlyAttendanceSummary(monthStr) {
  try {
    const res = await apiFetch(`/api/attendance/monthly-summary?month=${encodeURIComponent(monthStr)}`);
    if (!res.ok) throw new Error('Failed to load monthly summary');

    const data = await res.json();
    const tbody = document.getElementById('monthlyAttSummaryBody');
    if (!tbody) return;

    if (data.summary.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 20px;">No staff records for ${monthStr}.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.summary.map(s => {
      const isFixed = s.employment_type === 'fixed';
      return `
        <tr>
          <td>
            <div style="font-weight: 700;">${escapeHTML(s.name)}</div>
            <div style="font-size: 11px; color: #64748b;">${escapeHTML(s.designation)}</div>
          </td>
          <td>${isFixed ? '<span class="badge badge-fixed">Fixed</span>' : '<span class="badge badge-hourly">Hourly</span>'}</td>
          <td><strong style="color: #059669;">${s.present_days}</strong></td>
          <td><strong style="color: #d97706;">${s.half_days}</strong></td>
          <td><strong style="color: #dc2626;">${s.absent_days}</strong></td>
          <td><strong style="color: #2563eb;">${s.paid_leaves}</strong></td>
          <td>
            <span class="badge badge-neutral" style="font-size: 12px; font-weight: 800; background: #e2e8f0;">
              ${s.effective_working_days} / ${data.totalDaysInMonth} Days
            </span>
          </td>
          <td>
            <strong>${s.total_hours_worked} hrs</strong>
            ${parseFloat(s.total_overtime_hours) > 0 ? `<span style="font-size: 11px; color: #d97706;">(+${s.total_overtime_hours} OT)</span>` : ''}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading monthly attendance summary:', err);
  }
}

export function initAttendancePage() {
  const attPicker = document.getElementById('attendanceDatePicker');
  attPicker?.addEventListener('change', (e) => {
    AppState.attendanceDate = e.target.value;
    loadDailyAttendance(AppState.attendanceDate);
  });

  const monthPicker = document.getElementById('attSummaryMonthPicker');
  monthPicker?.addEventListener('change', (e) => {
    loadMonthlyAttendanceSummary(e.target.value);
  });

  document.getElementById('btnMarkAllPresent')?.addEventListener('click', markAllPresent);
  document.getElementById('btnSaveAttendance')?.addEventListener('click', saveAttendance);
}
