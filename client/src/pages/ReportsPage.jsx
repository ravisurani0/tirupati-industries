import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FileSpreadsheet, Download } from 'lucide-react';

export default function ReportsPage() {
  const { showToast } = useApp();
  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const [payrollMonth, setPayrollMonth] = useState(currentMonthStr);
  const [advanceFilter, setAdvanceFilter] = useState('all');
  const [advanceType, setAdvanceType] = useState('all');

  const downloadPayrollCSV = () => {
    showToast(`Downloading Payroll Audit CSV for ${payrollMonth}...`, 'info');
    window.location.href = `/api/export/payroll?month=${encodeURIComponent(payrollMonth)}`;
  };

  const downloadAdvancesCSV = () => {
    showToast('Downloading Advances & Loans Ledger CSV...', 'info');
    window.location.href = `/api/export/advances?status=${encodeURIComponent(advanceFilter)}&type=${encodeURIComponent(advanceType)}`;
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
          Audit Reports & Data Exports
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b' }}>
          Download official CSV exports for auditing, accountant records and tax documentation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Payroll Summary CSV */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Monthly Payroll Sheet (CSV)</h3>
              <p style={{ fontSize: '12px', color: '#64748b' }}>
                Full breakdown of staff base salaries, working days/hours, gross wages, advance deductions, and net pay.
              </p>
            </div>
          </div>

          <div className="form-group">
            <label>Select Target Payroll Month:</label>
            <input
              type="month"
              className="form-control"
              style={{ width: '100%' }}
              value={payrollMonth}
              onChange={(e) => setPayrollMonth(e.target.value)}
            />
          </div>

          <button className="btn btn-primary justify-center" style={{ width: '100%' }} onClick={downloadPayrollCSV}>
            <Download size={16} />
            <span>Download Payroll CSV</span>
          </button>
        </div>

        {/* Card 2: Advance Salary & Loan Ledger CSV */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                background: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Advances & Staff Loans (CSV)</h3>
              <p style={{ fontSize: '12px', color: '#64748b' }}>
                Ledger of worker advances, staff loans with accrued interest, settlement progress, and balances.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Record Type:</label>
              <select
                className="form-select"
                style={{ width: '100%' }}
                value={advanceType}
                onChange={(e) => setAdvanceType(e.target.value)}
              >
                <option value="all">All Records</option>
                <option value="advance">Salary Advances</option>
                <option value="loan">Staff Loans</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Status Filter:</label>
              <select
                className="form-select"
                style={{ width: '100%' }}
                value={advanceFilter}
                onChange={(e) => setAdvanceFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="unsettled">Active / Unsettled</option>
                <option value="settled">Settled (Fully Paid)</option>
              </select>
            </div>
          </div>

          <button className="btn btn-amber justify-center" style={{ width: '100%' }} onClick={downloadAdvancesCSV}>
            <Download size={16} />
            <span>Download Ledger CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
}
