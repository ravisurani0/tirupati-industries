import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { payrollApi, formatCurrency } from '../api';
import { X } from 'lucide-react';

export default function PaymentModal({ item, month, onSave }) {
  const { closeModal, showToast } = useApp();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    payment_amount: item.remaining_salary || '',
    payment_mode: item.payment_mode || 'Cash',
    payment_reference: '',
    notes: item.notes || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (!formData.payment_amount || parseFloat(formData.payment_amount) <= 0) {
      showToast('Please enter a valid payment amount', 'error');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        payroll_id: item.id,
        payment_amount: parseFloat(formData.payment_amount),
        payment_mode: formData.payment_mode,
        payment_reference: formData.payment_reference,
        notes: formData.notes
      };

      await payrollApi.recordPayment(payload);
      showToast(`Payment of ${formatCurrency(payload.payment_amount)} recorded successfully!`);
      closeModal();
      if (onSave) onSave();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay active">
      <div className="modal-dialog">
        <div className="modal-header">
          <h3>Record Salary Payment</h3>
          <button className="modal-close" onClick={closeModal} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Step Wizard */}
        <div className="step-wizard">
          <div
            className={`step-indicator ${step === 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}
            onClick={() => setStep(1)}
          >
            <span className="step-num">1</span>
            <span>Amount & Worker</span>
          </div>
          <div
            className={`step-indicator ${step === 2 ? 'active' : ''}`}
            onClick={() => formData.payment_amount && setStep(2)}
          >
            <span className="step-num">2</span>
            <span>Method & Voucher</span>
          </div>
        </div>

        <form onSubmit={step === 2 ? handleSubmit : handleNext}>
          <div className="modal-body">
            {step === 1 && (
              <div>
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginBottom: '16px'
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>
                    {item.name} ({item.designation})
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Settlement Month: <strong>{month}</strong>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: '16px',
                      marginTop: '8px',
                      fontSize: '13px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <span>Net Payable: <strong>{formatCurrency(item.net_salary)}</strong></span>
                    <span>Already Paid: <strong>{formatCurrency(item.paid_amount)}</strong></span>
                    <span style={{ color: '#dc2626' }}>
                      Remaining: <strong>{formatCurrency(item.remaining_salary)}</strong>
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="payAmount">Payment Amount (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    id="payAmount"
                    name="payment_amount"
                    className="form-control"
                    style={{ width: '100%' }}
                    value={formData.payment_amount}
                    onChange={handleChange}
                    required
                  />
                  <div className="hint">
                    You can disburse the full remaining balance or record a partial payment.
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="form-group">
                  <label htmlFor="payMode">Payment Mode</label>
                  <select
                    id="payMode"
                    name="payment_mode"
                    className="form-select"
                    style={{ width: '100%' }}
                    value={formData.payment_mode}
                    onChange={handleChange}
                  >
                    <option value="Cash">Cash in Hand</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="payRef">Reference / Transaction ID / Receipt No</label>
                  <input
                    type="text"
                    id="payRef"
                    name="payment_reference"
                    className="form-control"
                    style={{ width: '100%' }}
                    placeholder="e.g. Cash Voucher #44 or UPI Ref ID"
                    value={formData.payment_reference}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="payNotes">Payment Notes & Voucher Remarks</label>
                  <textarea
                    id="payNotes"
                    name="notes"
                    className="form-control"
                    rows="3"
                    style={{ width: '100%' }}
                    placeholder="Payment remarks or voucher notes..."
                    value={formData.notes}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <div>
              {step > 1 && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setStep(step - 1)}
                >
                  ◀ Back
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn btn-outline" onClick={closeModal}>
                Cancel
              </button>
              {step === 1 ? (
                <button type="submit" className="btn btn-primary">
                  Next: Payment Details ▶
                </button>
              ) : (
                <button type="submit" className="btn btn-success" disabled={loading}>
                  {loading ? 'Recording...' : 'Confirm & Save Payment'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
