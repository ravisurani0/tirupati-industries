// Audit Reports & Exports Page Controller

import { AppState } from '../state.js';
import { showToast } from '../utils.js';

export function initReportsPage() {
  document.getElementById('btnDownloadPayrollReport')?.addEventListener('click', () => {
    const month = document.getElementById('reportPayrollMonth')?.value || AppState.currentMonth;
    showToast(`Downloading Payroll Audit CSV for ${month}...`, 'info');
    window.location.href = `/api/export/payroll?month=${encodeURIComponent(month)}`;
  });

  document.getElementById('btnDownloadAdvanceReport')?.addEventListener('click', () => {
    const filter = document.getElementById('reportAdvanceFilter')?.value || 'all';
    showToast('Downloading Worker Advance Ledger CSV...', 'info');
    window.location.href = `/api/export/advances?status=${encodeURIComponent(filter)}`;
  });

  document.getElementById('btnExportPayrollCSV')?.addEventListener('click', () => {
    showToast(`Downloading Payroll CSV for ${AppState.currentMonth}...`, 'info');
    window.location.href = `/api/export/payroll?month=${encodeURIComponent(AppState.currentMonth)}`;
  });

  document.getElementById('btnExportAdvancesCSV')?.addEventListener('click', () => {
    const status = document.getElementById('advFilterStatus')?.value || 'all';
    showToast('Downloading Advances CSV...', 'info');
    window.location.href = `/api/export/advances?status=${encodeURIComponent(status)}`;
  });
}
