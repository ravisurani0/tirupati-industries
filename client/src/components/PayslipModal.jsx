import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { payrollApi, formatCurrency, formatDate } from '../api';
import { X, Printer } from 'lucide-react';

export default function PayslipModal({ payrollId }) {
  const { closeModal, showToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [slipData, setSlipData] = useState(null);

  useEffect(() => {
    async function loadSlip() {
      try {
        const data = await payrollApi.getSlip(payrollId);
        setSlipData(data);
      } catch (err) {
        showToast(err.message, 'error');
        closeModal();
      } finally {
        setLoading(false);
      }
    }
    if (payrollId) {
      loadSlip();
    }
  }, [payrollId, closeModal, showToast]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="modal-overlay active">
        <div className="modal-dialog" style={{ padding: '30px', textAlign: 'center' }}>
          Loading salary voucher...
        </div>
      </div>
    );
  }

  if (!slipData) return null;

  const { slip, advancesDeducted = [] } = slipData;
  const isFixed = slip.employment_type === 'fixed';

  return (
    <div className="modal-overlay active">
      <div className="modal-dialog" style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <h3>Salary Payment Voucher • {slip.month}</h3>
          <button className="modal-close" onClick={closeModal} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" id="payslipPrintArea">
          <div
            style={{
              textAlign: 'center',
              borderBottom: '2px solid #0f172a',
              paddingBottom: '14px',
              marginBottom: '16px'
            }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
              TIRUPATI INDUSTRIES
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b' }}>
              Plot No. 42, GIDC Industrial Estate, Rajkot - 360003, Gujarat
            </p>
            <p style={{ fontWeight: 700, marginTop: '4px', fontSize: '13px', color: '#2563eb' }}>
              WORKER SALARY VOUCHER • {slip.month}
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              fontSize: '13px'
            }}
          >
            <div>
              <div><strong>Worker Name:</strong> {slip.name}</div>
              <div><strong>Designation:</strong> {slip.designation}</div>
              <div><strong>Wage Type:</strong> {isFixed ? 'Fixed Monthly' : 'Hourly Wage'}</div>
            </div>
            <div>
              <div><strong>Voucher Date:</strong> {formatDate(slip.payment_date || new Date())}</div>
              <div><strong>Disbursement:</strong> {slip.payment_mode || 'Cash'}</div>
              <div><strong>Voucher No:</strong> #{slip.id}</div>
            </div>
          </div>

          <table className="app-table" style={{ marginBottom: '16px', border: '1px solid #e2e8f0' }}>
            <thead>
              <tr>
                <th>Description</th>
                <th>Calculation Units</th>
                <th style={{ textAlign: 'right' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Base Wage Rate</td>
                <td>{isFixed ? `${formatCurrency(slip.base_rate)}/mo` : `${formatCurrency(slip.base_rate)}/hr`}</td>
                <td style={{ textAlign: 'right' }}>-</td>
              </tr>
              <tr>
                <td>Working Units</td>
                <td>
                  {isFixed
                    ? `${slip.total_working_days} Days (out of ${slip.month_total_days})`
                    : `${slip.total_hours_worked} Hours worked`}
                </td>
                <td style={{ textAlign: 'right' }}><strong>{formatCurrency(slip.gross_salary)}</strong></td>
              </tr>
              {parseFloat(slip.bonus_allowance) > 0 && (
                <tr>
                  <td>Incentives / Overtime Bonus</td>
                  <td>Additional allowance</td>
                  <td style={{ textAlign: 'right', color: '#2563eb' }}>
                    + {formatCurrency(slip.bonus_allowance)}
                  </td>
                </tr>
              )}
              {parseFloat(slip.advance_deduction) > 0 && (
                <tr>
                  <td>Advance Salary Deduction</td>
                  <td>Recovered from advances</td>
                  <td style={{ textAlign: 'right', color: '#d97706' }}>
                    - {formatCurrency(slip.advance_deduction)}
                  </td>
                </tr>
              )}
              <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                <td>NET EARNED WAGE</td>
                <td>Total Net Payable</td>
                <td style={{ textAlign: 'right', color: '#059669', fontSize: '15px' }}>
                  {formatCurrency(slip.net_salary)}
                </td>
              </tr>
              <tr>
                <td>Amount Disbursed / Paid</td>
                <td>Paid to worker</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(slip.paid_amount)}</td>
              </tr>
              <tr
                style={{
                  fontWeight: 700,
                  color: parseFloat(slip.remaining_salary) > 0 ? '#dc2626' : '#059669'
                }}
              >
                <td>Remaining Balance</td>
                <td>Pending settlement</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(slip.remaining_salary)}</td>
              </tr>
            </tbody>
          </table>

          {advancesDeducted.length > 0 && (
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '24px' }}>
              * Advance Recoveries: {advancesDeducted.map((a) => `₹${a.amount_deducted} (${formatDate(a.advance_date)})`).join(', ')}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '40px',
              paddingTop: '20px',
              borderTop: '1px dashed #cbd5e1'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #334155', width: '150px', marginBottom: '4px' }}></div>
              <div style={{ fontSize: '12px', fontWeight: 700 }}>Worker Signature</div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>Received with thanks</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #334155', width: '180px', marginBottom: '4px' }}></div>
              <div style={{ fontSize: '12px', fontWeight: 700 }}>For Tirupati Industries</div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>Authorized Signatory</div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={closeModal}>
            Close
          </button>
          <button type="button" className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} />
            <span>Print Salary Slip</span>
          </button>
        </div>
      </div>
    </div>
  );
}
