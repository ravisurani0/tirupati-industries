import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { employeesApi } from '../api';
import { X } from 'lucide-react';

export default function EmployeeModal({ employee, onSave }) {
  const { closeModal, showToast } = useApp();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    designation: '',
    employment_type: 'fixed',
    base_salary: '',
    standard_hours_per_day: '8.0',
    joining_date: new Date().toISOString().split('T')[0],
    status: 'active',
    payment_mode: 'Cash',
    bank_details: '',
    notes: ''
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || '',
        phone: employee.phone || '',
        designation: employee.designation || '',
        employment_type: employee.employment_type || 'fixed',
        base_salary: employee.base_salary || '',
        standard_hours_per_day: employee.standard_hours_per_day || '8.0',
        joining_date: employee.joining_date ? employee.joining_date.split('T')[0] : '',
        status: employee.status || 'active',
        payment_mode: employee.payment_mode || 'Cash',
        bank_details: employee.bank_details || '',
        notes: employee.notes || ''
      });
    }
  }, [employee]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (step === 1) {
      if (!formData.name.trim() || !formData.designation.trim()) {
        showToast('Please fill in employee name and designation', 'error');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.base_salary || parseFloat(formData.base_salary) <= 0) {
        showToast('Please enter a valid wage/salary rate', 'error');
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        base_salary: parseFloat(formData.base_salary),
        standard_hours_per_day: parseFloat(formData.standard_hours_per_day) || 8.0
      };

      if (employee?.id) {
        await employeesApi.update(employee.id, payload);
        showToast('Employee updated successfully');
      } else {
        await employeesApi.create(payload);
        showToast('Employee added successfully');
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
        <div className="modal-sheet-handle" />
        <div className="modal-header">
          <h3>{employee ? `Edit Employee: ${employee.name}` : 'Add New Workshop Employee'}</h3>
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
            <span>Basic Info</span>
          </div>
          <div
            className={`step-indicator ${step === 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}
            onClick={() => formData.name && formData.designation && setStep(2)}
          >
            <span className="step-num">2</span>
            <span>Wage & Shifts</span>
          </div>
          <div
            className={`step-indicator ${step === 3 ? 'active' : ''}`}
            onClick={() => formData.base_salary && setStep(3)}
          >
            <span className="step-num">3</span>
            <span>Payment & Notes</span>
          </div>
        </div>

        <form onSubmit={step === 3 ? handleSubmit : handleNext}>
          <div className="modal-body">
            {step === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="form-group sm:col-span-2">
                  <label htmlFor="empName">Full Name *</label>
                  <input
                    type="text"
                    id="empName"
                    name="name"
                    className="form-control"
                    style={{ width: '100%' }}
                    placeholder="e.g. Ramesh Patel"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="empPhone">Phone Number</label>
                  <input
                    type="tel"
                    id="empPhone"
                    name="phone"
                    className="form-control"
                    style={{ width: '100%' }}
                    placeholder="e.g. +91 98250 12345"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="empStatus">Status</label>
                  <select
                    id="empStatus"
                    name="status"
                    className="form-select"
                    style={{ width: '100%' }}
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="active">Active (Currently Working)</option>
                    <option value="inactive">Inactive / On Leave</option>
                  </select>
                </div>
                <div className="form-group sm:col-span-2">
                  <label htmlFor="empDesignation">Designation / Role *</label>
                  <input
                    type="text"
                    id="empDesignation"
                    name="designation"
                    className="form-control"
                    style={{ width: '100%' }}
                    placeholder="e.g. CNC Operator, Lathe Turner, Helper"
                    value={formData.designation}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="form-group sm:col-span-2">
                  <label htmlFor="empType">Employment / Wage Type *</label>
                  <select
                    id="empType"
                    name="employment_type"
                    className="form-select"
                    style={{ width: '100%' }}
                    value={formData.employment_type}
                    onChange={handleChange}
                  >
                    <option value="fixed">Fixed Monthly Salary (Calculated by days)</option>
                    <option value="hourly">Hourly Wage (Calculated by hours worked)</option>
                  </select>
                </div>

                <div className="form-group sm:col-span-2">
                  <label htmlFor="empSalary">
                    {formData.employment_type === 'hourly'
                      ? 'Hourly Wage Rate (₹/hr) *'
                      : 'Monthly Fixed Salary (₹) *'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    id="empSalary"
                    name="base_salary"
                    className="form-control"
                    style={{ width: '100%' }}
                    placeholder={formData.employment_type === 'hourly' ? 'e.g. 120' : 'e.g. 22000'}
                    value={formData.base_salary}
                    onChange={handleChange}
                    required
                  />
                  <div className="hint">
                    {formData.employment_type === 'hourly'
                      ? 'Multiplied directly by total verified attendance hours.'
                      : 'Calculated pro-rata against working days in the month.'}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="empStandardHours">Standard Shift Hours per Day</label>
                  <input
                    type="number"
                    step="0.5"
                    id="empStandardHours"
                    name="standard_hours_per_day"
                    className="form-control"
                    style={{ width: '100%' }}
                    min="1"
                    max="24"
                    value={formData.standard_hours_per_day}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="empJoiningDate">Joining Date</label>
                  <input
                    type="date"
                    id="empJoiningDate"
                    name="joining_date"
                    className="form-control"
                    style={{ width: '100%' }}
                    value={formData.joining_date}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="form-group">
                  <label htmlFor="empPaymentMode">Preferred Payment Mode</label>
                  <select
                    id="empPaymentMode"
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
                  <label htmlFor="empBankDetails">Bank / UPI Account Details</label>
                  <input
                    type="text"
                    id="empBankDetails"
                    name="bank_details"
                    className="form-control"
                    style={{ width: '100%' }}
                    placeholder="e.g. SBI A/c 3029... or worker@upi"
                    value={formData.bank_details}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group sm:col-span-2">
                  <label htmlFor="empNotes">Additional Notes</label>
                  <textarea
                    id="empNotes"
                    name="notes"
                    className="form-control"
                    rows="3"
                    style={{ width: '100%' }}
                    placeholder="ID proof, emergency contact or workshop skill remarks..."
                    value={formData.notes}
                    onChange={handleChange}
                  />
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
              {step < 3 ? (
                <button type="submit" className="btn btn-primary flex-1 sm:flex-initial">
                  {step === 1 ? 'Next: Wage & Shifts ▶' : 'Next: Payment & Notes ▶'}
                </button>
              ) : (
                <button type="submit" className="btn btn-success flex-1 sm:flex-initial" disabled={loading}>
                  {loading ? 'Saving...' : employee ? 'Update Employee' : 'Save Employee'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
