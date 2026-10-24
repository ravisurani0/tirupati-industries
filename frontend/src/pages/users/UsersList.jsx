import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { rolesApi, usersApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { PageBreadcrumb } from '../../components/common/Common';
import Avatar from '../../components/ui/Avatar';
import Button, { buttonClass, Spinner } from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Alert, Badge, roleBadgeColor } from '../../components/ui/Feedback';
import { inputClass, Select } from '../../components/ui/Form';
import { PencilIcon, PlusIcon, SearchIcon, TrashIcon } from '../../components/common/icons';
import { formatDate } from '../../utils/format';

const PER_PAGE = 10;

function StatusBadge({ active }) {
  return <Badge color={active ? 'success' : 'error'}>{active ? 'Active' : 'Inactive'}</Badge>;
}

function RowActions({ user, isSelf, onDelete }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => navigate(`/users/${user.id}/edit`)}
        className="hover:text-brand-500 dark:hover:text-brand-400 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
        aria-label={`Edit ${user.full_name}`}
      >
        <PencilIcon size={18} />
      </button>
      {!isSelf && (
        <button
          type="button"
          onClick={() => onDelete(user)}
          className="hover:text-error-500 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
          aria-label={`Delete ${user.full_name}`}
        >
          <TrashIcon size={18} />
        </button>
      )}
    </div>
  );
}

export default function UsersList() {
  const { user: me } = useAuth();
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ page: 1, last_page: 1, total: 0 });
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [roleId, setRoleId] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce the search box
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    rolesApi.list().then((r) => setRoles(r.data)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    return usersApi
      .list({ page, per_page: PER_PAGE, search: query, role_id: roleId })
      .then((r) => {
        setUsers(r.data);
        setMeta(r.meta);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, query, roleId]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await usersApi.remove(toDelete.id);
      setNotice(`${toDelete.full_name} was deleted.`);
      setToDelete(null);
      if (users.length === 1 && page > 1) setPage((p) => p - 1);
      else load();
    } catch (e) {
      setError(e.message);
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageBreadcrumb title="Users" />

      <div className="space-y-4">
        {notice && (
          <Alert variant="success" onClose={() => setNotice('')}>
            {notice}
          </Alert>
        )}
        {error && <Alert variant="error">{error}</Alert>}

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between dark:border-gray-800">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">All users</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{meta.total} total</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, phone..."
                  aria-label="Search users"
                  className={inputClass(false, 'pl-11 sm:w-64')}
                />
              </div>
              <Select
                aria-label="Filter by role"
                value={roleId}
                onChange={(e) => {
                  setRoleId(e.target.value);
                  setPage(1);
                }}
                placeholder="All roles"
                options={roles.map((r) => ({ value: r.id, label: r.name }))}
                wrapperClassName="sm:w-44"
              />
              <Link to="/users/new" className={buttonClass('primary', 'sm', 'w-full sm:w-auto')}>
                <PlusIcon />
                Add user
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16 text-gray-400">
              <Spinner className="h-8 w-8" />
            </div>
          ) : users.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">No users found.</p>
          ) : (
            <>
              {/* Table on md+ */}
              <div className="hidden max-w-full overflow-x-auto md:block">
                <table className="min-w-full">
                  <thead className="border-b border-gray-100 dark:border-gray-800">
                    <tr>
                      {['User', 'Phone', 'Role', 'Status', 'Joined', ''].map((h) => (
                        <th key={h} className="text-theme-xs px-5 py-3 text-start font-medium text-gray-500 dark:text-gray-400">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar user={u} size="sm" />
                            <div>
                              <span className="text-theme-sm block font-medium text-gray-800 dark:text-white/90">
                                {u.full_name}
                                {u.id === me.id && <span className="ml-1.5 text-gray-400">(you)</span>}
                              </span>
                              <span className="text-theme-xs block text-gray-500 dark:text-gray-400">{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="text-theme-sm px-5 py-4 text-gray-500 dark:text-gray-400">{u.phone || '—'}</td>
                        <td className="px-5 py-4">
                          <Badge color={roleBadgeColor(u.role?.slug)}>{u.role?.name}</Badge>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge active={u.is_active} />
                        </td>
                        <td className="text-theme-sm px-5 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">{formatDate(u.created_at, { withTime: false })}</td>
                        <td className="px-5 py-4">
                          <RowActions user={u} isSelf={u.id === me.id} onDelete={setToDelete} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards on mobile */}
              <ul className="divide-y divide-gray-100 md:hidden dark:divide-gray-800">
                {users.map((u) => (
                  <li key={u.id} className="flex items-start gap-3 px-4 py-4">
                    <Avatar user={u} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-theme-sm truncate font-medium text-gray-800 dark:text-white/90">
                        {u.full_name}
                        {u.id === me.id && <span className="ml-1.5 text-gray-400">(you)</span>}
                      </p>
                      <p className="text-theme-xs truncate text-gray-500 dark:text-gray-400">{u.email}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge color={roleBadgeColor(u.role?.slug)}>{u.role?.name}</Badge>
                        <StatusBadge active={u.is_active} />
                      </div>
                    </div>
                    <RowActions user={u} isSelf={u.id === me.id} onDelete={setToDelete} />
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Pagination */}
          {meta.last_page > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-4 sm:px-6 dark:border-gray-800">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Page {meta.page} of {meta.last_page}
              </span>
              <Button variant="outline" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </div>
      </div>

      <Modal open={Boolean(toDelete)} onClose={() => setToDelete(null)}>
        <h4 className="mb-2 pr-10 text-xl font-semibold text-gray-800 dark:text-white/90">Delete user?</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-800 dark:text-white/90">{toDelete?.full_name}</span> will be permanently removed. This cannot be undone.
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
