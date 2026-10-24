import { useCallback, useEffect, useState } from 'react';
import { rolesApi } from '../../api';
import { ComponentCard, PageBreadcrumb } from '../../components/common/Common';
import Button, { Spinner } from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Alert, Badge, roleBadgeColor } from '../../components/ui/Feedback';
import { Input, TextArea } from '../../components/ui/Form';
import { PencilIcon, PlusIcon, TrashIcon } from '../../components/common/icons';

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null); // null = closed, {} = new, role = edit
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    return rolesApi
      .list()
      .then((r) => setRoles(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const confirmDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await rolesApi.remove(toDelete.id);
      setNotice(`Role "${toDelete.name}" deleted.`);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  return (
    <>
      <PageBreadcrumb title="Roles" />
      <div className="space-y-4">
        {notice && (
          <Alert variant="success" onClose={() => setNotice('')}>
            {notice}
          </Alert>
        )}
        {error && (
          <Alert variant="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <ComponentCard
          title="Roles"
          description="Roles control what each user can access."
          action={
            <Button startIcon={<PlusIcon />} onClick={() => setEditing({})}>
              Add role
            </Button>
          }
        >
          {loading ? (
            <div className="flex justify-center py-10 text-gray-400">
              <Spinner className="h-8 w-8" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {roles.map((role) => (
                <div key={role.id} className="flex flex-col rounded-xl border border-gray-200 p-5 dark:border-gray-800">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-semibold text-gray-800 dark:text-white/90">{role.name}</h4>
                        {role.is_system && <Badge color="light">System</Badge>}
                      </div>
                      <p className="text-theme-xs mt-1 font-mono text-gray-400">{role.slug}</p>
                    </div>
                    <Badge color={roleBadgeColor(role.slug)}>
                      {role.users_count} {role.users_count === 1 ? 'user' : 'users'}
                    </Badge>
                  </div>
                  <p className="mt-3 flex-1 text-sm text-gray-500 dark:text-gray-400">{role.description || 'No description'}</p>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" startIcon={<PencilIcon size={16} />} onClick={() => setEditing(role)}>
                      Edit
                    </Button>
                    {!role.is_system && (
                      <Button variant="ghost" className="hover:!text-error-500" startIcon={<TrashIcon size={16} />} onClick={() => setToDelete(role)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ComponentCard>
      </div>

      <RoleModal
        role={editing}
        onClose={() => setEditing(null)}
        onSaved={(msg) => {
          setEditing(null);
          setNotice(msg);
          load();
        }}
      />

      <Modal open={Boolean(toDelete)} onClose={() => setToDelete(null)}>
        <h4 className="mb-2 pr-10 text-xl font-semibold text-gray-800 dark:text-white/90">Delete role?</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          The <span className="font-medium text-gray-800 dark:text-white/90">{toDelete?.name}</span> role will be removed. Roles that are assigned to users cannot be deleted.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setToDelete(null)}>
            Cancel
          </Button>
          <Button variant="danger" loading={deleting} onClick={confirmDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}

function RoleModal({ role, onClose, onSaved }) {
  const open = Boolean(role);
  const isEdit = Boolean(role?.id);
  const [form, setForm] = useState({ name: '', description: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const [lastRole, setLastRole] = useState(role);
  if (role !== lastRole) {
    setLastRole(role);
    if (role) {
      setForm({ name: role.name || '', description: role.description || '' });
      setErrors({});
      setMessage('');
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setErrors({ name: 'Role name is required' });
    setSaving(true);
    setMessage('');
    try {
      const res = isEdit ? await rolesApi.update(role.id, form) : await rolesApi.create(form);
      onSaved(res.message);
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
        <h4 className="mb-6 pr-10 text-2xl font-semibold text-gray-800 dark:text-white/90">{isEdit ? 'Edit role' : 'Add role'}</h4>
        <div className="space-y-5">
          {message && <Alert variant="error">{message}</Alert>}
          <Input
            label="Role name"
            required
            value={form.name}
            onChange={(e) => {
              setForm((f) => ({ ...f, name: e.target.value }));
              setErrors({});
            }}
            error={errors.name}
            placeholder="e.g. HR Executive"
            hint={isEdit ? `Slug: ${role.slug}` : 'A URL-friendly slug is generated from the name.'}
          />
          <TextArea
            label="Description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            error={errors.description}
            placeholder="What can this role do?"
          />
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {isEdit ? 'Save changes' : 'Create role'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
