import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { advancesApi, employeesApi, formatCurrency } from '../api';
import { X } from 'lucide-react';

export default function AdvanceModal({ advance, onSave }) {
  const { closeModal, showToast } = useApp();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);

  const [formData, setFormData] = useState({
    employee_id: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    payment_mode: 'Cash',
    reason: ''
  });

  useEffect(() => {
    async function loadActiveEmployees() {
      try {
        const data = await employeesApi.getAll({ status: 'active' });
        setEmployees(data.employees || []);
      } catch (err) {
        console.error('Failed to load active employees:', err);
      }
    }
    loadActiveEmployees();
  }, []);

  useEffect(() => {
    if (advance) {
      setFormData({
        employee_id: advance.employee_id || '',
        amount: advance.amount || '',
        date: advance.date ? advance.date.split('T')[0] : '',
        payment_mode: advance.payment_mode || 'Cash',
        reason: advance.reason || ''
      });
    }
  }, [advance]);

  const selectedEmployee = employees.find((e) => String(e.id) === String(formData.employee_id));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (!formData.employee_id) {
      showToast('Please select an employee', 'error');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showToast('Please enter a valid advance amount', 'error');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        employee_id: parseInt(formData.employee_id, 10),
        amount: parseFloat(formData.amount)
      };

      if (advance?.id) {
        await advancesApi.update(advance.id, payload);
        showToast('Advance updated successfully');
      } else {
        await advancesApi.create(payload);
        showToast(`Advance of ${formatCurrency(payload.amount)} recorded successfully`);
      }
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
          <h3>
            {advance
              ? `Edit Advance #${advance.id} - ${advance.employee_name}`
              : 'Issue Salary Advance'}
          </h3>
          <button className="modal-close" onClick={closeModal} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Step Wizard Indicator */}
        <div className="step-wizard">
          <div
            className={`step-indicator ${step === 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}
            onClick={() => setStep(1)}
          >
            <span className="step-num">1</span>
            <span>Worker & Amount</span>
          </div>
          <div
            className={`step-indicator ${step === 2 ? 'active' : ''}`}
            onClick={() => formData.employee_id && formData.amount && setStep(2)}
          >
            <span className="step-num">2</span>
            <span>Mode & Reason</span>
          </div>
        </div>

        <form onSubmit={step === 2 ? handleSubmit : handleNext}>
          <div className="modal-body">
            {step === 1 && (
              <div>
                <div className="form-group">
                  <label htmlFor="advEmployeeSelect">Select Employee *</label>
                  <select
                    id="advEmployeeSelect"
                    name="employee_id"
                    className="form-select"
                    style={{ width: '100%' }}
                    value={formData.employee_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.designation})
                      </option>
                    ))}
                  </select>
                  <div className="hint">
                    Current unsettled advance:{' '}
                    <strong>
                      {formatCurrency(selectedEmployee?.unsettled_advance_total || 0)}
                    </strong>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="advAmount">Advance Amount (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    id="advAmount"
                    name="amount"
                    className="form-control"
                    style={{ width: '100%' }}
                    placeholder="e.g. 2000"
                    value={formData.amount}
                    onChange={handleChange}
                    required
                  />
                  <div className="hint">Enter simple amount in Rupees without restrictions.</div>
                </div>

                <div className="form-group">
                  <label htmlFor="advDate">Date of Advance *</label>
                  <input
                    type="date"
                    id="advDate"
                    name="date"
                    className="form-control"
                    style={{ width: '100%' }}
                    value={formData.date}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="form-group">
                  <label htmlFor="advPaymentMode">Payment Method</label>
                  <select
                    id="advPaymentMode"
                    name="payment_mode"
                    className="form-select"
                    style={{ width: '100%' }}
                    value={formData.payment_mode}
                    onChange={handleChange}
                  >
                    <option value="Cash">Cash in Hand</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="advReason">Reason / Purpose / Description *</label>
                  <textarea
                    id="advReason"
                    name="reason"
                    className="form-control"
                    rows="3"
                    style={{ width: '100%' }}
                    placeholder="Enter reason, medical emergency, personal advance, or festive expense..."
                    value={formData.reason}
                    onChange={handleChange}
                    required
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
                  Next: Reason & Mode ▶
                </button>
              ) : (
                <button type="submit" className="btn btn-success" disabled={loading}>
                  {loading ? 'Saving...' : advance ? 'Update Advance' : 'Save Advance'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
