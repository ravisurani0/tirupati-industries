import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { rolesApi, usersApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { ComponentCard, PageBreadcrumb } from '../../components/common/Common';
import Button, { Spinner } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Feedback';
import { Input, PasswordInput, Select, Switch, TextArea } from '../../components/ui/Form';
import ProfileLogoInput from '../../components/ui/ProfileLogoInput';
import { emptyUser, validateUser } from '../../utils/validation';

/** Create (/users/new) and edit (/users/:id/edit) a user with all details and a role. */
export default function UserForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user: me, setUser: setMe } = useAuth();
  const isSelf = isEdit && Number(id) === me.id;

  const [form, setForm] = useState({ ...emptyUser, role_id: '', is_active: true });
  const [existing, setExisting] = useState(null);
  const [logo, setLogo] = useState({ file: null, removed: false });
  const [roles, setRoles] = useState([]);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    rolesApi
      .list()
      .then((r) => {
        setRoles(r.data);
        // Default new users to the "manager" role
        if (!isEdit) setForm((f) => ({ ...f, role_id: f.role_id || String(r.data.find((x) => x.slug === 'manager')?.id || '') }));
      })
      .catch(() => {});
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    usersApi
      .get(id)
      .then((r) => {
        const u = r.data;
        setExisting(u);
        setForm({ ...emptyUser, first_name: u.first_name, last_name: u.last_name, email: u.email, phone: u.phone || '', address: u.address || '', role_id: String(u.role?.id || ''), is_active: u.is_active });
      })
      .catch((e) => setMessage(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    const er = validateUser(form, { requirePassword: !isEdit });
    if (!form.role_id) er.role_id = 'Select a role';
    setErrors(er);
    if (Object.keys(er).length) return;

    const payload = { ...form, profile_logo: logo.file || undefined };
    if (isEdit) {
      if (!payload.password) {
        delete payload.password;
        delete payload.password_confirmation;
      }
      if (logo.removed) payload.remove_profile_logo = true;
      if (isSelf) {
        delete payload.role_id;
        delete payload.is_active;
      }
    }

    setSaving(true);
    try {
      const res = isEdit ? await usersApi.update(id, payload) : await usersApi.create(payload);
      if (isSelf) setMe(res.data);
      navigate('/users', { state: { notice: res.message } });
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setMessage(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const title = isEdit ? 'Edit User' : 'Add User';

  return (
    <>
      <PageBreadcrumb title={title} items={[{ label: 'Users', to: '/users' }]} />

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          {message && <Alert variant="error">{message}</Alert>}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <ComponentCard title="Personal details" className="xl:col-span-2">
              <div className="space-y-5">
                <ProfileLogoInput user={existing || form} currentUrl={existing?.profile_logo_url} onChange={(file, { removed }) => setLogo({ file, removed })} error={errors.profile_logo} />
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Input label="First Name" required value={form.first_name} onChange={set('first_name')} error={errors.first_name} placeholder="First name" />
                  <Input label="Last Name" required value={form.last_name} onChange={set('last_name')} error={errors.last_name} placeholder="Last name" />
                  <Input label="Email" required type="email" value={form.email} onChange={set('email')} error={errors.email} placeholder="name@company.com" />
                  <Input label="Phone Number" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} placeholder="+91 98765 43210" />
                </div>
                <TextArea label="Address" rows={3} value={form.address} onChange={set('address')} error={errors.address} placeholder="Street, city, state, postcode" />
              </div>
            </ComponentCard>

            <div className="space-y-6">
              <ComponentCard title="Access">
                <div className="space-y-5">
                  <Select
                    label="Role"
                    required
                    value={form.role_id}
                    onChange={set('role_id')}
                    error={errors.role_id}
                    placeholder="Select a role"
                    options={roles.map((r) => ({ value: String(r.id), label: r.name }))}
                    disabled={isSelf}
                    hint={isSelf ? 'You cannot change your own role.' : undefined}
                  />
                  <Switch checked={form.is_active} onChange={(v) => setForm((f) => ({ ...f, is_active: v }))} label="Account active" disabled={isSelf} />
                </div>
              </ComponentCard>

              <ComponentCard title={isEdit ? 'Change password' : 'Password'}>
                <div className="space-y-5">
                  <PasswordInput
                    label="Password"
                    required={!isEdit}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={set('password')}
                    error={errors.password}
                    placeholder={isEdit ? 'Leave blank to keep current' : 'At least 8 characters'}
                  />
                  <PasswordInput
                    label="Confirm Password"
                    required={!isEdit}
                    autoComplete="new-password"
                    value={form.password_confirmation}
                    onChange={set('password_confirmation')}
                    error={errors.password_confirmation}
                    placeholder="Re-enter password"
                  />
                </div>
              </ComponentCard>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => navigate('/users')}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {isEdit ? 'Save changes' : 'Create user'}
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
