import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { advancesApi, formatCurrency, formatDate } from '../api';
import StatusBadge from './StatusBadge';
import {
  X,
  PlusCircle,
  Trash2,
  Calendar,
  Clock,
  TrendingUp,
  Receipt,
  Percent,
  Calculator,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function LoanDetailsModal({ loanId, onSave }) {
  const { closeModal, showToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [submittingRepayment, setSubmittingRepayment] = useState(false);
  const [loanRecord, setLoanRecord] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [repaymentForm, setRepaymentForm] = useState({
    repayment_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_mode: 'Cash',
    notes: ''
  });

  const fetchLoan = useCallback(async () => {
    try {
      const data = await advancesApi.getById(loanId);
      setLoanRecord(data.record || null);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [loanId, showToast]);

  useEffect(() => {
    if (loanId) fetchLoan();
  }, [loanId, fetchLoan]);

  const handleRepaymentChange = (e) => {
    const { name, value } = e.target;
    setRepaymentForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddRepayment = async (e) => {
    e.preventDefault();
    if (!repaymentForm.amount || parseFloat(repaymentForm.amount) <= 0) {
      showToast('Please enter a valid repayment amount', 'error');
      return;
    }

    setSubmittingRepayment(true);
    try {
      await advancesApi.addRepayment(loanId, {
        repayment_date: repaymentForm.repayment_date,
        amount: parseFloat(repaymentForm.amount),
        payment_mode: repaymentForm.payment_mode,
        notes: repaymentForm.notes
      });
      showToast(`Repayment of ${formatCurrency(repaymentForm.amount)} recorded successfully!`);
      setRepaymentForm({
        repayment_date: new Date().toISOString().split('T')[0],
        amount: '',
        payment_mode: 'Cash',
        notes: ''
      });
      setShowAddForm(false);
      await fetchLoan();
      if (onSave) onSave();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingRepayment(false);
    }
  };

  const handleDeleteRepayment = async (repId) => {
    if (!window.confirm('Are you sure you want to delete this repayment entry?')) return;
    try {
      await advancesApi.deleteRepayment(loanId, repId);
      showToast('Repayment record removed');
      await fetchLoan();
      if (onSave) onSave();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay active">
        <div className="modal-dialog" style={{ maxWidth: '640px', textAlign: 'center', padding: '40px' }}>
          <div style={{ color: '#64748b' }}>Loading loan details and daily summary...</div>
        </div>
      </div>
    );
  }

  if (!loanRecord) {
    return (
      <div className="modal-overlay active">
        <div className="modal-dialog" style={{ maxWidth: '500px', textAlign: 'center', padding: '30px' }}>
          <p style={{ color: '#dc2626' }}>Loan record not found.</p>
          <button className="btn btn-outline" onClick={closeModal} style={{ marginTop: '12px' }}>
            Close
          </button>
        </div>
      </div>
    );
  }

  const details = loanRecord.loan_details || {};
  const repayments = loanRecord.repayments || [];
  const principal = parseFloat(loanRecord.amount) || 0;
  const accruedInterest = details.totalAccruedInterest || 0;
  const totalRepaid = details.totalRepaid || 0;
  const remainingBalance = details.remainingBalance || 0;

  return (
    <div className="modal-overlay active p-2 sm:p-4">
      <div className="modal-dialog w-full max-w-3xl max-h-[92vh] flex flex-col mx-auto bg-white rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="modal-header p-3.5 sm:p-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-success" style={{ fontWeight: 700 }}>
                LOAN #{loanRecord.id}
              </span>
              <StatusBadge status={details.status || loanRecord.status} />
            </div>
            <h3 style={{ margin: '4px 0 0 0', fontSize: '18px' }}>
              {loanRecord.employee_name}
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {loanRecord.employee_designation} • {loanRecord.employee_phone || 'No phone'}
            </span>
          </div>
          <button className="modal-close" onClick={closeModal} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="modal-body overflow-y-auto flex-1 p-3.5 sm:p-5">
          {/* 4 Financial Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Actual Loan Amount
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {formatCurrency(principal)}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Disbursed Principal</div>
            </div>

            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Interest Accrued
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#1d4ed8', marginTop: '4px' }}>
                {formatCurrency(accruedInterest)}
              </div>
              <div style={{ fontSize: '11px', color: '#3b82f6', marginTop: '2px' }}>
                {loanRecord.interest_rate}% ({loanRecord.interest_type || 'monthly'})
              </div>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Repaid So Far
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
                {formatCurrency(totalRepaid)}
              </div>
              <div style={{ fontSize: '11px', color: '#22c55e', marginTop: '2px' }}>
                {repayments.length} installment{repayments.length === 1 ? '' : 's'}
              </div>
            </div>

            <div
              style={{
                background: remainingBalance > 0 ? '#fef2f2' : '#f0fdf4',
                border: remainingBalance > 0 ? '1px solid #fecaca' : '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '12px'
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  color: remainingBalance > 0 ? '#991b1b' : '#166534',
                  fontWeight: 600,
                  textTransform: 'uppercase'
                }}
              >
                Remaining Balance
              </div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: remainingBalance > 0 ? '#b91c1c' : '#15803d',
                  marginTop: '4px'
                }}
              >
                {formatCurrency(remainingBalance)}
              </div>
              <div style={{ fontSize: '11px', color: remainingBalance > 0 ? '#ef4444' : '#16a34a', marginTop: '2px' }}>
                {remainingBalance > 0 ? 'Due to settle' : 'Fully Settled'}
              </div>
            </div>
          </div>

          {/* Daily Summary & Interest Breakdown Section */}
          <div
            style={{
              background: '#fdfcfe',
              border: '1px solid #e0e7ff',
              borderRadius: '8px',
              padding: '14px 16px',
              marginBottom: '16px'
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13.5px', color: '#312e81' }}>
                <Calculator size={16} color="#4338ca" />
                <span>Daily Loan Summary & Accrual Calculator</span>
              </div>
              <span className="badge badge-neutral self-start sm:self-auto" style={{ fontSize: '11px' }}>
                As of {formatDate(details.asOfDate || new Date())}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 bg-white border border-indigo-100 rounded-md p-2.5 text-xs">
              <div>
                <span style={{ color: '#64748b' }}>Disbursed Date:</span>
                <div style={{ fontWeight: 700, color: '#1e1b4b' }}>{formatDate(loanRecord.date)}</div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Days Elapsed:</span>
                <div style={{ fontWeight: 700, color: '#4338ca' }}>{details.daysElapsed || 0} Days</div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Interest Rate:</span>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>
                  {loanRecord.interest_rate}% / {loanRecord.interest_type || 'month'}
                </div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Daily Interest Rate:</span>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>
                  {details.rates?.dailyRatePct || 0}% / day
                </div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Daily Interest Charge:</span>
                <div style={{ fontWeight: 700, color: '#b45309' }}>
                  {formatCurrency(details.dailyInterestAmount || 0)} / day
                </div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Total Payable (P + Int):</span>
                <div style={{ fontWeight: 700, color: '#047857' }}>
                  {formatCurrency(details.totalPayable || principal)}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '8px', fontSize: '11.5px', color: '#475569', lineHeight: '1.4' }}>
              ℹ️ <strong>Accrual Formula:</strong> Principal {formatCurrency(principal)} × Rate{' '}
              {loanRecord.interest_rate}% ({loanRecord.interest_type || 'monthly'}) across {details.daysElapsed || 0} active days
              with reducing balance interest credited upon each repayment.
            </div>
          </div>

          {/* Repayments Header and Add Button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
              paddingTop: '4px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Receipt size={16} color="#0284c7" />
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                Repayment Entries ({repayments.length})
              </h4>
            </div>

            <button
              type="button"
              className={`btn btn-sm ${showAddForm ? 'btn-outline' : 'btn-primary'}`}
              onClick={() => setShowAddForm(!showAddForm)}
              style={{ padding: '5px 12px', fontSize: '12px' }}
            >
              {showAddForm ? (
                <>
                  <ChevronUp size={14} />
                  <span>Cancel Entry</span>
                </>
              ) : (
                <>
                  <PlusCircle size={14} />
                  <span>Add Repayment</span>
                </>
              )}
            </button>
          </div>

          {/* Collapsible Add Repayment Form */}
          {showAddForm && (
            <div
              style={{
                background: '#f8fafc',
                border: '1.5px dashed #cbd5e1',
                borderRadius: '8px',
                padding: '14px 16px',
                marginBottom: '16px'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', marginBottom: '10px' }}>
                ➕ Add New Loan Repayment Entry
              </div>
              <form onSubmit={handleAddRepayment}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px' }}>Repayment Date *</label>
                    <input
                      type="date"
                      name="repayment_date"
                      className="form-control"
                      value={repaymentForm.repayment_date}
                      onChange={handleRepaymentChange}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px' }}>Repayment Amount (₹) *</label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      name="amount"
                      placeholder="e.g. 5000"
                      className="form-control"
                      value={repaymentForm.amount}
                      onChange={handleRepaymentChange}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px' }}>Payment Mode</label>
                    <select
                      name="payment_mode"
                      className="form-select"
                      value={repaymentForm.payment_mode}
                      onChange={handleRepaymentChange}
                    >
                      <option value="Cash">Cash in Hand</option>
                      <option value="UPI">UPI</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '10px', marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px' }}>Payment Note / Reference (Optional)</label>
                  <input
                    type="text"
                    name="notes"
                    placeholder="e.g. Cash given at workshop desk, or UPI Txn Ref"
                    className="form-control"
                    value={repaymentForm.notes}
                    onChange={handleRepaymentChange}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success btn-sm"
                    disabled={submittingRepayment}
                  >
                    {submittingRepayment ? 'Recording...' : 'Record Payment Entry'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Repayments List Table */}
          {repayments.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '24px 16px',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                color: '#64748b',
                fontSize: '13px'
              }}
            >
              No repayment entries recorded yet. Click <strong>"Add Repayment"</strong> above to log a payment.
            </div>
          ) : (
            <div className="table-responsive" style={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table className="app-table" style={{ fontSize: '12.5px', margin: 0 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Date</th>
                    <th>Amount Paid</th>
                    <th>Mode</th>
                    <th>Notes</th>
                    <th style={{ textAlign: 'right', width: '60px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {repayments.map((rep, idx) => (
                    <tr key={rep.id || `rep_${idx}`}>
                      <td style={{ color: '#94a3b8', fontWeight: 600 }}>{idx + 1}</td>
                      <td>
                        <strong>{formatDate(rep.repayment_date)}</strong>
                      </td>
                      <td>
                        <strong style={{ color: '#15803d' }}>{formatCurrency(rep.amount)}</strong>
                      </td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                          {rep.payment_mode || 'Cash'}
                        </span>
                      </td>
                      <td style={{ color: '#475569' }}>
                        {rep.notes || 'Repayment installment'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ color: '#dc2626', padding: '3px 6px' }}
                          title="Delete Repayment"
                          onClick={() => handleDeleteRepayment(rep.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '12px 20px' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            {remainingBalance <= 0 ? (
              <span style={{ color: '#16a34a', fontWeight: 700 }}>✅ This loan is fully settled.</span>
            ) : (
              <span>
                Outstanding:{' '}
                <strong style={{ color: '#b91c1c' }}>{formatCurrency(remainingBalance)}</strong>
              </span>
            )}
          </div>
          <button type="button" className="btn btn-outline" onClick={closeModal}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
