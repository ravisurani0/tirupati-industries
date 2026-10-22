import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { advancesApi, employeesApi, formatCurrency } from '../api';
import { X, HandCoins, Landmark, Calculator, Percent } from 'lucide-react';

function computeNextMonth(dateStr) {
  if (!dateStr) return '';
  const [y, m] = dateStr.split('-').map(Number);
  const nextDate = new Date(y, m, 1);
  const ny = nextDate.getFullYear();
  const nm = String(nextDate.getMonth() + 1).padStart(2, '0');
  return `${ny}-${nm}`;
}

function formatMonthLabel(monthStr) {
  if (!monthStr) return '';
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function AdvanceModal({ advance, defaultType = 'advance', onSave }) {
  const { closeModal, showToast } = useApp();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);

  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    employee_id: '',
    type: defaultType || 'advance',
    amount: '',
    date: todayStr,
    deduction_month: computeNextMonth(todayStr),
    interest_rate: '2.0',
    interest_type: 'monthly',
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
      const advDate = advance.date ? advance.date.split('T')[0] : todayStr;
      setFormData({
        employee_id: advance.employee_id || '',
        type: advance.type || 'advance',
        amount: advance.amount || '',
        date: advDate,
        deduction_month: advance.deduction_month || computeNextMonth(advDate),
        interest_rate: advance.interest_rate !== undefined ? String(advance.interest_rate) : '2.0',
        interest_type: advance.interest_type || 'monthly',
        payment_mode: advance.payment_mode || 'Cash',
        reason: advance.reason || ''
      });
    }
  }, [advance, todayStr]);

  const selectedEmployee = employees.find((e) => String(e.id) === String(formData.employee_id));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      // If date changes and type is advance, auto update default deduction_month
      if (name === 'date' && next.type === 'advance') {
        next.deduction_month = computeNextMonth(value);
      }
      return next;
    });
  };

  const setType = (typeVal) => {
    setFormData((prev) => ({
      ...prev,
      type: typeVal,
      reason: prev.reason || (typeVal === 'loan' ? 'Personal Staff Loan' : 'Salary Advance')
    }));
  };

  // Live interest preview calculations
  const parsedAmt = parseFloat(formData.amount) || 0;
  const parsedRate = parseFloat(formData.interest_rate) || 0;
  let dailyRatePct = 0;
  let monthlyRatePct = 0;
  let yearlyRatePct = 0;

  if (formData.interest_type === 'daily') {
    dailyRatePct = parsedRate;
    monthlyRatePct = parsedRate * 30;
    yearlyRatePct = parsedRate * 365;
  } else if (formData.interest_type === 'yearly') {
    yearlyRatePct = parsedRate;
    monthlyRatePct = parsedRate / 12;
    dailyRatePct = parsedRate / 365;
  } else {
    // monthly default
    monthlyRatePct = parsedRate;
    dailyRatePct = parsedRate / 30;
    yearlyRatePct = parsedRate * 12;
  }

  const liveDailyInterest = Math.round((parsedAmt * (dailyRatePct / 100)) * 100) / 100;
  const liveMonthlyInterest = Math.round((parsedAmt * (monthlyRatePct / 100)) * 100) / 100;
  const liveYearlyInterest = Math.round((parsedAmt * (yearlyRatePct / 100)) * 100) / 100;

  const handleNext = (e) => {
    e.preventDefault();
    if (!formData.employee_id) {
      showToast('Please select an employee', 'error');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showToast('Please enter a valid positive amount', 'error');
      return;
    }
    if (formData.type === 'loan' && (isNaN(parsedRate) || parsedRate < 0)) {
      showToast('Please enter a valid interest rate', 'error');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        employee_id: parseInt(formData.employee_id, 10),
        type: formData.type,
        amount: parseFloat(formData.amount),
        date: formData.date,
        payment_mode: formData.payment_mode,
        reason: formData.reason ? formData.reason.trim() : (formData.type === 'loan' ? 'Staff Loan' : 'Salary Advance')
      };

      if (formData.type === 'advance') {
        payload.deduction_month = formData.deduction_month || computeNextMonth(formData.date);
      } else {
        payload.interest_rate = parseFloat(formData.interest_rate) || 0;
        payload.interest_type = formData.interest_type;
      }

      if (advance?.id) {
        await advancesApi.update(advance.id, payload);
        showToast(`${formData.type === 'loan' ? 'Loan' : 'Salary advance'} updated successfully`);
      } else {
        await advancesApi.create(payload);
        showToast(
          `${formData.type === 'loan' ? 'Staff Loan' : 'Salary Advance'} of ${formatCurrency(payload.amount)} recorded successfully`
        );
      }
      closeModal();
      if (onSave) onSave();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const isLoan = formData.type === 'loan';

  return (
    <div className="modal-overlay active p-2 sm:p-4">
      <div className="modal-dialog w-full max-w-lg mx-auto bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="modal-header p-3.5 sm:p-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div>
            <h3>
              {advance
                ? `Edit ${isLoan ? 'Loan' : 'Advance'} #${advance.id} - ${advance.employee_name}`
                : isLoan
                ? 'Issue Employee Staff Loan'
                : 'Issue Salary Advance'}
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {isLoan
                ? 'Loans support interest percentage and multiple repayment installments'
                : 'Advances will automatically adjust in the next month salary'}
            </span>
          </div>
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
            <span>Type & Financials</span>
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
          <div className="modal-body p-3.5 sm:p-5 overflow-y-auto max-h-[75vh]">
            {step === 1 && (
              <div>
                {/* Type Selection Switcher */}
                {!advance && (
                  <div className="form-group">
                    <label>Select Transaction Type *</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        className={`btn ${!isLoan ? 'btn-primary' : 'btn-outline'} flex items-center justify-center gap-2 p-3`}
                        onClick={() => setType('advance')}
                      >
                        <HandCoins size={18} />
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 700, fontSize: '13px' }}>Salary Advance</div>
                          <div style={{ fontSize: '11px', opacity: 0.85 }}>Adjusts in next salary</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        className={`btn ${isLoan ? 'btn-primary' : 'btn-outline'} flex items-center justify-center gap-2 p-3`}
                        onClick={() => setType('loan')}
                      >
                        <Landmark size={18} />
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 700, fontSize: '13px' }}>Staff Loan</div>
                          <div style={{ fontSize: '11px', opacity: 0.85 }}>Interest & multi-repayment</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

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
                    <option value="">-- Choose Staff Member --</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.designation})
                      </option>
                    ))}
                  </select>
                  {selectedEmployee && (
                    <div className="hint" style={{ marginTop: '4px' }}>
                      Active advance: <strong>{formatCurrency(selectedEmployee.unsettled_advance_total || 0)}</strong>
                      {selectedEmployee.active_loan_balance > 0 && (
                        <span>
                          {' '}• Active loan: <strong>{formatCurrency(selectedEmployee.active_loan_balance)}</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="form-group">
                    <label htmlFor="advAmount">
                      {isLoan ? 'Loan Principal Amount (₹) *' : 'Advance Amount (₹) *'}
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      id="advAmount"
                      name="amount"
                      className="form-control"
                      style={{ width: '100%' }}
                      placeholder={isLoan ? 'e.g. 50000' : 'e.g. 3000'}
                      value={formData.amount}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="advDate">Disbursement Date *</label>
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

                {/* Salary Advance Specific: Next Month Salary Adjustment */}
                {!isLoan && (
                  <div
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '14px'
                    }}
                  >
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="advDeductionMonth" style={{ color: '#166534', fontWeight: 700 }}>
                        📅 Adjust in Next Month Salary:
                      </label>
                      <input
                        type="month"
                        id="advDeductionMonth"
                        name="deduction_month"
                        className="form-control"
                        value={formData.deduction_month}
                        onChange={handleChange}
                        required
                      />
                      <div style={{ fontSize: '12px', color: '#15803d', marginTop: '4px', lineHeight: '1.4' }}>
                        ✓ <strong>Next Month Settlement:</strong> This advance will count and deduct from{' '}
                        <strong>{formatMonthLabel(formData.deduction_month)}</strong> payroll.
                      </div>
                    </div>
                  </div>
                )}

                {/* Loan Specific: Interest Rate & Basis */}
                {isLoan && (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      marginBottom: '14px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13px', color: '#1e293b', marginBottom: '8px' }}>
                      <Percent size={15} color="#4f46e5" />
                      <span>Loan Interest Configuration</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '12px' }}>Interest Rate (%) *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          name="interest_rate"
                          className="form-control"
                          placeholder="e.g. 2.0"
                          value={formData.interest_rate}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '12px' }}>Interest Rate Basis *</label>
                        <select
                          name="interest_type"
                          className="form-select"
                          value={formData.interest_type}
                          onChange={handleChange}
                        >
                          <option value="monthly">Per Month (% / month)</option>
                          <option value="yearly">Per Year (% / annum)</option>
                          <option value="daily">Per Day (% / day)</option>
                        </select>
                      </div>
                    </div>

                    {/* Live Interest Breakdown Preview */}
                    {parsedAmt > 0 && parsedRate > 0 && (
                      <div
                        style={{
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: '6px',
                          padding: '8px 10px',
                          marginTop: '10px',
                          fontSize: '12px',
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          gap: '6px',
                          textAlign: 'center'
                        }}
                      >
                        <div>
                          <span style={{ color: '#64748b', fontSize: '11px' }}>Daily Interest</span>
                          <div style={{ fontWeight: 700, color: '#1d4ed8' }}>
                            {formatCurrency(liveDailyInterest)}/day
                          </div>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '11px' }}>Monthly Interest</span>
                          <div style={{ fontWeight: 700, color: '#1d4ed8' }}>
                            {formatCurrency(liveMonthlyInterest)}/mo
                          </div>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '11px' }}>Annual Interest</span>
                          <div style={{ fontWeight: 700, color: '#1d4ed8' }}>
                            {formatCurrency(liveYearlyInterest)}/yr
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="form-group">
                  <label htmlFor="advPaymentMode">Disbursement Payment Method</label>
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
                  <label htmlFor="advReason">Purpose / Notes / Description *</label>
                  <textarea
                    id="advReason"
                    name="reason"
                    className="form-control"
                    rows="3"
                    style={{ width: '100%' }}
                    placeholder={
                      isLoan
                        ? 'e.g. Equipment loan, vehicle loan, house construction, family medical...'
                        : 'e.g. Festival advance, emergency cash advance...'
                    }
                    value={formData.reason}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Summary Card before confirmation */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '12.5px',
                    color: '#334155'
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                    Summary Confirmation:
                  </div>
                  <div>• Staff: <strong>{selectedEmployee?.name || 'Selected Employee'}</strong></div>
                  <div>• Type: <strong>{isLoan ? 'Staff Loan' : 'Salary Advance'}</strong></div>
                  <div>• Amount: <strong style={{ color: '#d97706' }}>{formatCurrency(formData.amount || 0)}</strong></div>
                  {!isLoan ? (
                    <div>
                      • Salary Adjustment: <strong>{formatMonthLabel(formData.deduction_month)}</strong>
                    </div>
                  ) : (
                    <div>
                      • Interest Rate: <strong>{formData.interest_rate}% ({formData.interest_type})</strong> (~{formatCurrency(liveDailyInterest)}/day)
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer flex flex-col sm:flex-row sm:justify-between items-stretch sm:items-center gap-2">
            <div>
              {step > 1 && (
                <button
                  type="button"
                  className="btn btn-outline w-full sm:w-auto"
                  onClick={() => setStep(step - 1)}
                >
                  ◀ Back
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button type="button" className="btn btn-outline flex-1 sm:flex-initial" onClick={closeModal}>
                Cancel
              </button>
              {step === 1 ? (
                <button type="submit" className="btn btn-primary flex-1 sm:flex-initial">
                  Next: Mode & Reason ▶
                </button>
              ) : (
                <button type="submit" className="btn btn-success flex-1 sm:flex-initial" disabled={loading}>
                  {loading
                    ? 'Saving...'
                    : advance
                    ? `Update ${isLoan ? 'Loan' : 'Advance'}`
                    : `Confirm & Issue ${isLoan ? 'Loan' : 'Advance'}`}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
