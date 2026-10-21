// Admin Profile & Workshop Settings Controller

import { apiFetch } from '../api/client.js';
import { showToast, escapeHTML } from '../utils.js';
import { openModal, closeModal, validateAllSteps, setWizardStep } from '../wizards.js';

export function updateAdminUI(user) {
  if (!user) return;
  const nameEl = document.getElementById('adminDisplayName');
  const avatarEl = document.getElementById('adminAvatar');
  const badgeEl = document.getElementById('headerWorkshopBadge');
  const titleEl = document.getElementById('brandWorkshopTitle');
  const subEl = document.getElementById('brandWorkshopSub');

  if (nameEl) nameEl.textContent = user.fullName || user.username || 'Admin';
  if (avatarEl) {
    const initials = (user.fullName || user.username || 'AD')
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
    avatarEl.textContent = initials;
  }
  if (badgeEl && user.workshop_name) badgeEl.textContent = user.workshop_name;
  if (titleEl && user.workshop_name) {
    const parts = user.workshop_name.split(' ');
    titleEl.textContent = parts[0]?.toUpperCase() || 'TIRUPATI';
  }
}

export async function openAdminProfileModal() {
  try {
    const res = await apiFetch('/api/auth/me');
    if (!res.ok) throw new Error('Failed to load profile');
    const { user } = await res.json();

    document.getElementById('adminFullName').value = user.fullName || '';
    document.getElementById('adminUsername').value = user.username || '';
    document.getElementById('adminEmail').value = user.email || '';
    document.getElementById('adminPhone').value = user.phone || '';
    document.getElementById('adminWorkshopName').value = user.workshop_name || 'Tirupati Industries';

    document.getElementById('adminCurrentPass').value = '';
    document.getElementById('adminNewPass').value = '';
    document.getElementById('adminConfirmPass').value = '';

    openModal('modalAdminProfile');
  } catch (err) {
    showToast(err.message || 'Error loading admin details', 'error');
  }
}

async function handleAdminProfileSubmit(e) {
  if (e) e.preventDefault();

  const form = document.getElementById('formAdminProfile');
  if (!validateAllSteps(form, 'admin')) return;

  const fullName = document.getElementById('adminFullName').value.trim();
  const username = document.getElementById('adminUsername').value.trim();
  const email = document.getElementById('adminEmail').value.trim();
  const phone = document.getElementById('adminPhone').value.trim();
  const workshop_name = document.getElementById('adminWorkshopName').value.trim();

  const currentPassword = document.getElementById('adminCurrentPass').value;
  const newPassword = document.getElementById('adminNewPass').value;
  const confirmPassword = document.getElementById('adminConfirmPass').value;

  if (newPassword || confirmPassword || currentPassword) {
    if (!currentPassword) {
      setWizardStep('admin', 2);
      showToast('Please enter your current password to set a new password', 'error');
      document.getElementById('adminCurrentPass').focus();
      return;
    }
    if (newPassword.length < 6) {
      setWizardStep('admin', 2);
      showToast('New password must be at least 6 characters long', 'error');
      document.getElementById('adminNewPass').focus();
      return;
    }
    if (newPassword !== confirmPassword) {
      setWizardStep('admin', 2);
      showToast('New password and confirm password do not match', 'error');
      document.getElementById('adminConfirmPass').focus();
      return;
    }
  }

  try {
    const payload = {
      fullName,
      username,
      email,
      phone,
      workshop_name
    };
    if (newPassword) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    const res = await apiFetch('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update admin profile');

    localStorage.setItem('user', JSON.stringify(data.user));
    updateAdminUI(data.user);

    closeModal('modalAdminProfile');
    showToast('Admin profile & workshop details updated successfully!');
  } catch (err) {
    showToast(err.message || 'Error updating profile', 'error');
  }
}

export function initSettingsPage() {
  document.getElementById('adminInfoTrigger')?.addEventListener('click', openAdminProfileModal);
  document.getElementById('navOpenAdminSettings')?.addEventListener('click', (e) => {
    e.preventDefault();
    openAdminProfileModal();
  });
  document.getElementById('btnTopAdminSettings')?.addEventListener('click', openAdminProfileModal);

  document.getElementById('formAdminProfile')?.addEventListener('submit', handleAdminProfileSubmit);
  document.getElementById('btnUpdateAdminProfile')?.addEventListener('click', () => {
    document.getElementById('formAdminProfile')?.requestSubmit();
  });
  document.getElementById('btnSaveAdminProfile')?.addEventListener('click', () => {
    document.getElementById('formAdminProfile')?.requestSubmit();
  });
}
