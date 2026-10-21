import { apiFetch } from './client.js';

export const reportsApi = {
  async downloadPayrollCsv(month) {
    const res = await apiFetch(`/api/export/payroll-csv?month=${encodeURIComponent(month)}`);
    if (!res.ok) throw new Error('Failed to download payroll CSV');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tirupati_Payroll_${month}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  async downloadAdvanceLedgerCsv(status = 'all') {
    const res = await apiFetch(`/api/export/advances-csv?status=${encodeURIComponent(status)}`);
    if (!res.ok) throw new Error('Failed to download advance ledger CSV');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tirupati_Advance_Ledger_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
};
