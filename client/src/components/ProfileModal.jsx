import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { employeesApi, formatCurrency, formatDate } from '../api';
import { X, Phone, Calendar, Wallet } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function ProfileModal({ employeeId }) {
  const { closeModal, showToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await employeesApi.getById(employeeId);
        setProfile(data);
      } catch (err) {
        showToast(err.message, 'error');
        closeModal();
      } finally {
        setLoading(false);
      }
    }
    if (employeeId) {
      loadProfile();
    }
  }, [employeeId, closeModal, showToast]);

  if (loading) {
    return (
      <div className="modal-overlay active">
        <div className="modal-dialog" style={{ padding: '30px', textAlign: 'center' }}>
          Loading worker profile...
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const { employee, advances = [], payrollHistory = [], summary } = profile;
  const isFixed = employee.employment_type === 'fixed';

  return (
    <div className="modal-overlay active">
      <div className="modal-dialog" style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <h3>{employee.name} - Profile & Ledger</h3>
          <button className="modal-close" onClick={closeModal} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Summary Box */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px'
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Employee Details
              </div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {employee.name}
              </div>
              <div style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                {employee.designation}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={13} /> {employee.phone || 'No phone'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={13} /> Joined: {formatDate(employee.joining_date)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Wage & Advances Status
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>
                {isFixed ? `${formatCurrency(employee.base_salary)} / month` : `${formatCurrency(employee.base_salary)} / hour`}
              </div>
              <div style={{ fontSize: '12.5px', marginTop: '6px' }}>
                Outstanding Advance: <strong style={{ color: '#d97706' }}>{formatCurrency(summary.current_unsettled_advance)}</strong>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                All-Time Advances: {formatCurrency(summary.total_advance_taken)}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Payment Method: <strong>{employee.payment_mode || 'Cash'}</strong> ({employee.bank_details || 'N/A'})
              </div>
            </div>
          </div>

          {/* Advances Ledger */}
          <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', color: '#0f172a' }}>
            Advances History
          </h4>
          <div className="table-responsive" style={{ marginBottom: '24px' }}>
            <table className="app-table">
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
                {advances.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: '#94a3b8', padding: '16px' }}>
                      No advances recorded for this worker.
                    </td>
                  </tr>
                ) : (
                  advances.map((a) => (
                    <tr key={a.id}>
                      <td>{formatDate(a.date)}</td>
                      <td><strong>{formatCurrency(a.amount)}</strong></td>
                      <td>{formatCurrency(a.settled_amount)}</td>
                      <td>
                        <strong style={{ color: '#d97706' }}>
                          {formatCurrency(a.amount - a.settled_amount)}
                        </strong>
                      </td>
                      <td>{a.reason || '-'}</td>
                      <td><StatusBadge status={a.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Payroll History */}
          <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', color: '#0f172a' }}>
            Past Payroll Settlements
          </h4>
          <div className="table-responsive">
            <table className="app-table">
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
                {payrollHistory.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: '#94a3b8', padding: '16px' }}>
                      No payroll records found yet.
                    </td>
                  </tr>
                ) : (
                  payrollHistory.map((p) => (
                    <tr key={p.id}>
                      <td><strong>{p.month}</strong></td>
                      <td>{formatCurrency(p.gross_salary)}</td>
                      <td>{formatCurrency(p.advance_deduction)}</td>
                      <td>{formatCurrency(p.net_salary)}</td>
                      <td>{formatCurrency(p.paid_amount)}</td>
                      <td>
                        <strong style={{ color: parseFloat(p.remaining_salary) > 0 ? '#dc2626' : '#059669' }}>
                          {formatCurrency(p.remaining_salary)}
                        </strong>
                      </td>
                      <td><StatusBadge status={p.payment_status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={closeModal}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
