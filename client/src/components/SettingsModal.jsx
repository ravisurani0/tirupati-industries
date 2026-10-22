import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { authApi } from '../api';
import { X, ShieldCheck } from 'lucide-react';

export default function SettingsModal() {
  const { user, updateUser } = useAuth();
  const { closeModal, showToast } = useApp();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    workshop_name: user?.workshop_name || 'Tirupati Industries',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.username.trim()) {
      showToast('Please enter your full name and login username', 'error');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = formData;

    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) {
        showToast('Please enter your current password to set a new password', 'error');
        setStep(2);
        return;
      }
      if (newPassword.length < 6) {
        showToast('New password must be at least 6 characters long', 'error');
        setStep(2);
        return;
      }
      if (newPassword !== confirmPassword) {
        showToast('New password and confirm password do not match', 'error');
        setStep(2);
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        fullName: formData.fullName.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        workshop_name: formData.workshop_name.trim()
      };
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const data = await authApi.updateProfile(payload);
      updateUser(data.user);
      showToast('Admin profile & workshop settings updated successfully!');
      closeModal();
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
          <h3>Admin Profile & Workshop Settings</h3>
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
            <span>Admin & Workshop</span>
          </div>
          <div
            className={`step-indicator ${step === 2 ? 'active' : ''}`}
            onClick={() => formData.fullName && formData.username && setStep(2)}
          >
            <span className="step-num">2</span>
            <span>Security & Password</span>
          </div>
        </div>

        <form onSubmit={step === 2 ? handleSubmit : handleNext}>
          <div className="modal-body">
            {step === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="form-group">
                  <label htmlFor="adminFullName">Admin Full Name *</label>
                  <input
                    type="text"
                    id="adminFullName"
                    name="fullName"
                    className="form-control"
                    style={{ width: '100%' }}
                    placeholder="e.g. Workshop Admin"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="adminUsername">Username (Login ID) *</label>
                  <input
                    type="text"
                    id="adminUsername"
                    name="username"
                    className="form-control"
                    style={{ width: '100%' }}
                    placeholder="e.g. admin"
                    value={formData.username}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="adminEmail">Email Address</label>
                  <input
                    type="email"
                    id="adminEmail"
                    name="email"
                    className="form-control"
                    style={{ width: '100%' }}
                    placeholder="e.g. admin@tirupati-industries.com"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="adminPhone">Phone / Mobile</label>
                  <input
                    type="tel"
                    id="adminPhone"
                    name="phone"
                    className="form-control"
                    style={{ width: '100%' }}
                    placeholder="e.g. +91 98250 12345"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group sm:col-span-2">
                  <label htmlFor="adminWorkshopName">Workshop / Business Name</label>
                  <input
                    type="text"
                    id="adminWorkshopName"
                    name="workshop_name"
                    className="form-control"
                    style={{ width: '100%' }}
                    placeholder="e.g. Tirupati Industries"
                    value={formData.workshop_name}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  className="sm:col-span-2"
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '8px',
                    fontSize: '12px',
                    color: '#475569'
                  }}
                >
                  ℹ️ Leave password fields blank if you only want to update your profile name and details.
                </div>

                <div className="form-group sm:col-span-2">
                  <label htmlFor="adminCurrentPass">Current Password</label>
                  <input
                    type="password"
                    id="adminCurrentPass"
                    name="currentPassword"
                    className="form-control"
                    style={{ width: '100%' }}
                    placeholder="Enter current password"
                    value={formData.currentPassword}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="adminNewPass">New Password</label>
                  <input
                    type="password"
                    id="adminNewPass"
                    name="newPassword"
                    className="form-control"
                    style={{ width: '100%' }}
                    placeholder="Minimum 6 characters"
                    value={formData.newPassword}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="adminConfirmPass">Confirm New Password</label>
                  <input
                    type="password"
                    id="adminConfirmPass"
                    name="confirmPassword"
                    className="form-control"
                    style={{ width: '100%' }}
                    placeholder="Re-enter new password"
                    value={formData.confirmPassword}
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
              {step === 1 ? (
                <button type="submit" className="btn btn-primary flex-1 sm:flex-initial">
                  Next: Security ▶
                </button>
              ) : (
                <button type="submit" className="btn btn-success flex-1 sm:flex-initial" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Settings'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
