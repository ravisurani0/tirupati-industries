import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api';
import { PageBreadcrumb } from '../components/common/Common';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Alert, Badge, roleBadgeColor } from '../components/ui/Feedback';
import { Input, PasswordInput, TextArea } from '../components/ui/Form';
import ProfileLogoInput from '../components/ui/ProfileLogoInput';
import { PencilIcon } from '../components/common/icons';
import { validateUser } from '../utils/validation';

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-sm font-medium break-words text-gray-800 dark:text-white/90">{value || '—'}</p>
    </div>
  );
}

function EditButton({ onClick, children = 'Edit' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shadow-theme-xs flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-800 lg:inline-flex lg:w-auto dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
    >
      <PencilIcon size={18} />
      {children}
    </button>
  );
}

export default function Profile() {
  const { user, setUser } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [notice, setNotice] = useState('');

  return (
    <>
      <PageBreadcrumb title="My Profile" />
      {notice && (
        <div className="mb-6">
          <Alert variant="success" onClose={() => setNotice('')}>
            {notice}
          </Alert>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Meta card (partials/profile) */}
        <div className="mb-6 rounded-2xl border border-gray-200 p-5 lg:p-6 dark:border-gray-800">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex w-full flex-col items-center gap-6 xl:flex-row">
              <Avatar user={user} size="lg" className="border border-gray-200 dark:border-gray-800" />
              <div className="order-3 xl:order-2">
                <h4 className="mb-2 text-center text-lg font-semibold text-gray-800 xl:text-left dark:text-white/90">{user.full_name}</h4>
                <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                  <Badge color={roleBadgeColor(user.role?.slug)}>{user.role?.name}</Badge>
                  <div className="hidden h-3.5 w-px bg-gray-300 xl:block dark:bg-gray-700" />
                  <p className="text-sm break-all text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row xl:shrink-0">
              <EditButton onClick={() => setPwOpen(true)}>Change password</EditButton>
            </div>
          </div>
        </div>

        {/* Info card */}
        <div className="rounded-2xl border border-gray-200 p-5 lg:p-6 dark:border-gray-800">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-gray-800 lg:mb-6 dark:text-white/90">Personal Information</h4>
              <div className="mt-6 grid grid-cols-1 gap-4 lg:mt-0 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                <InfoItem label="First Name" value={user.first_name} />
                <InfoItem label="Last Name" value={user.last_name} />
                <InfoItem label="Email address" value={user.email} />
                <InfoItem label="Phone" value={user.phone} />
                <InfoItem label="Address" value={user.address} />
                <InfoItem label="Role" value={user.role?.name} />
              </div>
            </div>
            <EditButton onClick={() => setEditOpen(true)} />
          </div>
        </div>
      </div>

      <EditProfileModal
        open={editOpen}
        user={user}
        onClose={() => setEditOpen(false)}
        onSaved={(u) => {
          setUser(u);
          setEditOpen(false);
          setNotice('Profile updated successfully.');
        }}
      />
      <ChangePasswordModal
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        onSaved={() => {
          setPwOpen(false);
          setNotice('Password changed successfully.');
        }}
      />
    </>
  );
}

function EditProfileModal({ open, user, onClose, onSaved }) {
  const initial = () => ({ first_name: user.first_name, last_name: user.last_name, email: user.email, phone: user.phone || '', address: user.address || '' });
  const [form, setForm] = useState(initial);
  const [logo, setLogo] = useState({ file: null, removed: false });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset the form whenever the modal opens
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(initial());
      setLogo({ file: null, removed: false });
      setErrors({});
      setMessage('');
    }
  }

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const er = validateUser(form, { checkPassword: false });
    setErrors(er);
    if (Object.keys(er).length) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await authApi.updateProfile({ ...form, profile_logo: logo.file || undefined, remove_profile_logo: logo.removed || undefined });
      onSaved(res.data.user);
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} className="max-w-[700px]">
      <form onSubmit={onSubmit} noValidate className="flex flex-col">
        <div className="pr-10">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Edit Personal Information</h4>
          <p className="mb-6 text-sm text-gray-500 lg:mb-7 dark:text-gray-400">Update your details to keep your profile up-to-date.</p>
        </div>
        <div className="custom-scrollbar max-h-[60vh] space-y-5 overflow-y-auto px-1 pb-3">
          {message && <Alert variant="error">{message}</Alert>}
          <ProfileLogoInput user={user} currentUrl={user.profile_logo_url} onChange={(file, { removed }) => setLogo({ file, removed })} error={errors.profile_logo} />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Input label="First Name" required value={form.first_name} onChange={set('first_name')} error={errors.first_name} />
            <Input label="Last Name" required value={form.last_name} onChange={set('last_name')} error={errors.last_name} />
            <Input label="Email Address" required type="email" value={form.email} onChange={set('email')} error={errors.email} />
            <Input label="Phone" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} />
          </div>
          <TextArea label="Address" rows={3} value={form.address} onChange={set('address')} error={errors.address} />
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="submit" loading={saving}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ChangePasswordModal({ open, onClose, onSaved }) {
  const empty = { current_password: '', password: '', password_confirmation: '' };
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(empty);
      setErrors({});
      setMessage('');
    }
  }

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!form.current_password) er.current_password = 'Current password is required';
    if (form.password.length < 8) er.password = 'Password must be at least 8 characters';
    if (form.password !== form.password_confirmation) er.password_confirmation = 'Passwords do not match';
    setErrors(er);
    if (Object.keys(er).length) return;
    setSaving(true);
    setMessage('');
    try {
      await authApi.changePassword(form);
      onSaved();
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={onSubmit} noValidate>
        <h4 className="mb-6 pr-10 text-2xl font-semibold text-gray-800 dark:text-white/90">Change Password</h4>
        <div className="space-y-5">
          {message && <Alert variant="error">{message}</Alert>}
          <PasswordInput label="Current Password" required autoComplete="current-password" value={form.current_password} onChange={set('current_password')} error={errors.current_password} />
          <PasswordInput label="New Password" required autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} />
          <PasswordInput label="Confirm New Password" required autoComplete="new-password" value={form.password_confirmation} onChange={set('password_confirmation')} error={errors.password_confirmation} />
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Update Password
          </Button>
        </div>
      </form>
    </Modal>
  );
}
