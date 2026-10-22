import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { expensesApi } from '../api';
import { X, DollarSign, Calendar, Clock, Tag, CreditCard, FileText } from 'lucide-react';

const CATEGORIES = [
  'General',
  'Factory Maintenance',
  'Raw Materials',
  'Tools & Machinery',
  'Utilities & Electricity',
  'Tea & Refreshments',
  'Transport & Fuel',
  'Office & Stationery',
  'Worker Welfare',
  'Miscellaneous'
];

const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque'];

export default function ExpenseModal({ expense, onSave }) {
  const { closeModal, showToast } = useApp();
  const [loading, setLoading] = useState(false);

  // Helper for current time HH:mm
  const getCurrentTime = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    time: getCurrentTime(),
    category: 'General',
    payment_mode: 'Cash'
  });

  useEffect(() => {
    if (expense) {
      setFormData({
        title: expense.title || '',
        description: expense.description || '',
        amount: expense.amount || '',
        date: expense.date ? expense.date.split('T')[0] : new Date().toISOString().split('T')[0],
        time: expense.time || getCurrentTime(),
        category: expense.category || 'General',
        payment_mode: expense.payment_mode || 'Cash'
      });
    }
  }, [expense]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      showToast('Please enter an expense title', 'error');
      return;
    }

    const parsedAmount = parseFloat(formData.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('Please enter a valid expense amount greater than 0', 'error');
      return;
    }

    setLoading(true);
    try {
      if (expense && expense.id) {
        await expensesApi.update(expense.id, formData);
        showToast('Expense updated successfully!', 'success');
      } else {
        await expensesApi.create(formData);
        showToast('Daily expense recorded successfully!', 'success');
      }

      if (onSave) onSave();
      closeModal();
    } catch (err) {
      showToast(err.message || 'Failed to save expense', 'error');
    } finally {
      setLoading(false);
    }
  };

  const isEdit = Boolean(expense && expense.id);

  return (
    <div className="modal-overlay active" onClick={closeModal}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Mobile bottom sheet drag handle */}
        <div className="modal-sheet-handle" />

        <div className="modal-header">
          <div>
            <h3>{isEdit ? 'Edit Daily Expense' : 'Record Daily Workshop Expense'}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Log workshop purchases, utility payments, maintenance and operational costs
            </p>
          </div>
          <button className="modal-close" onClick={closeModal} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="modal-body space-y-3.5">
            {/* Title */}
            <div className="form-group mb-0">
              <label className="flex items-center gap-1.5 font-semibold text-slate-800">
                <FileText size={14} className="text-blue-600" />
                <span>Expense Title *</span>
              </label>
              <input
                type="text"
                name="title"
                className="form-control"
                placeholder="e.g. Lathe machine coolant oil, Factory electricity bill, Tea & snacks..."
                value={formData.title}
                onChange={handleChange}
                required
                autoFocus
              />
            </div>

            {/* Amount & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="form-group mb-0">
                <label className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <DollarSign size={14} className="text-amber-600" />
                  <span>Amount (₹) *</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  name="amount"
                  className="form-control font-bold text-amber-700"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group mb-0">
                <label className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <Tag size={14} className="text-indigo-600" />
                  <span>Category</span>
                </label>
                <select
                  name="category"
                  className="form-select"
                  value={formData.category}
                  onChange={handleChange}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="form-group mb-0">
                <label className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <Calendar size={14} className="text-emerald-600" />
                  <span>Expense Date *</span>
                </label>
                <input
                  type="date"
                  name="date"
                  className="form-control"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group mb-0">
                <label className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <Clock size={14} className="text-purple-600" />
                  <span>Expense Time *</span>
                </label>
                <input
                  type="time"
                  name="time"
                  className="form-control"
                  value={formData.time}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Payment Mode */}
            <div className="form-group mb-0">
              <label className="flex items-center gap-1.5 font-semibold text-slate-800">
                <CreditCard size={14} className="text-slate-600" />
                <span>Payment Mode</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {PAYMENT_MODES.map((mode) => (
                  <label
                    key={mode}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 border rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      formData.payment_mode === mode
                        ? 'border-blue-600 bg-blue-50/80 text-blue-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_mode"
                      value={mode}
                      checked={formData.payment_mode === mode}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span>{mode}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Description / Notes */}
            <div className="form-group mb-0">
              <label className="flex items-center gap-1.5 font-semibold text-slate-800">
                <span>Description / Notes (Optional)</span>
              </label>
              <textarea
                name="description"
                rows="3"
                className="form-control"
                placeholder="Vendor details, bill number, machine unit, purpose of expense..."
                value={formData.description}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="modal-footer flex items-center justify-between gap-3">
            <button
              type="button"
              className="btn btn-outline btn-sm w-full sm:w-auto"
              onClick={closeModal}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm w-full sm:w-auto"
              disabled={loading}
            >
              {loading ? 'Saving...' : isEdit ? 'Update Expense' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
