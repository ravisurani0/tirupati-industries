import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { categoriesApi } from '../../api';
import { PageBreadcrumb } from '../../components/common/Common';
import Button, { buttonClass, Spinner } from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Alert, Badge } from '../../components/ui/Feedback';
import { inputClass, Select } from '../../components/ui/Form';
import { PencilIcon, PlusIcon, SearchIcon, TagIcon, TrashIcon } from '../../components/common/icons';
import { formatMoney } from '../../utils/format';

export default function CategoriesList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    return categoriesApi
      .list({ search: query, status })
      .then((r) => setRows(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [query, status]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await categoriesApi.remove(toDelete.id);
      setNotice(`Category "${toDelete.title}" deleted.`);
      setToDelete(null);
      load();
    } catch (e) {
      setError(e.message);
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const actions = (c) => (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => navigate(`/expense-categories/${c.id}/edit`)}
        className="hover:text-brand-500 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
        aria-label={`Edit ${c.title}`}
      >
        <PencilIcon size={18} />
      </button>
      <button
        type="button"
        onClick={() => setToDelete(c)}
        disabled={c.expenses_count > 0}
        title={c.expenses_count > 0 ? 'Used by expenses. Mark it inactive instead.' : undefined}
        className="hover:text-error-500 rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-500 dark:text-gray-400 dark:hover:bg-white/5"
        aria-label={`Delete ${c.title}`}
      >
        <TrashIcon size={18} />
      </button>
    </div>
  );

  return (
    <>
      <PageBreadcrumb title="Expense Categories" />
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

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between dark:border-gray-800">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Categories</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Group daily expenses by type of spend.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-gray-400" />
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search categories..." aria-label="Search categories" className={inputClass(false, 'pl-11 sm:w-56')} />
              </div>
              <Select
                aria-label="Filter by status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="All"
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                wrapperClassName="sm:w-36"
              />
              <Link to="/expense-categories/new" className={buttonClass('primary', 'sm', 'w-full sm:w-auto')}>
                <PlusIcon />
                Add category
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16 text-gray-400">
              <Spinner className="h-8 w-8" />
            </div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">{query || status ? 'No categories match these filters.' : 'No categories yet.'}</p>
              {!query && !status && (
                <Link to="/expense-categories/new" className={buttonClass('primary', 'sm', 'mt-4')}>
                  <PlusIcon />
                  Add your first category
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="hidden max-w-full overflow-x-auto md:block">
                <table className="min-w-full">
                  <thead className="border-b border-gray-100 dark:border-gray-800">
                    <tr>
                      {['Category', 'Expenses', 'Total spent', 'Status', ''].map((h) => (
                        <th key={h} className="text-theme-xs px-5 py-3 text-start font-medium text-gray-500 dark:text-gray-400">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {rows.map((c) => (
                      <tr key={c.id}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                              <TagIcon size={18} />
                            </span>
                            <div className="min-w-0">
                              <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">{c.title}</p>
                              {c.description && <p className="text-theme-xs max-w-[380px] truncate text-gray-500 dark:text-gray-400">{c.description}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="text-theme-sm px-5 py-3.5 text-gray-500 dark:text-gray-400">
                          {c.expenses_count > 0 ? (
                            <Link to={`/expenses`} state={{ categoryId: c.id }} className="hover:text-brand-500">
                              {c.expenses_count}
                            </Link>
                          ) : (
                            0
                          )}
                        </td>
                        <td className="text-theme-sm px-5 py-3.5 whitespace-nowrap text-gray-800 dark:text-white/90">{formatMoney(c.total_debits)}</td>
                        <td className="px-5 py-3.5">
                          <Badge color={c.is_active ? 'success' : 'error'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>
                        </td>
                        <td className="px-5 py-3.5">{actions(c)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-gray-100 md:hidden dark:divide-gray-800">
                {rows.map((c) => (
                  <li key={c.id} className="flex items-start gap-3 px-4 py-4">
                    <span className="bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                      <TagIcon size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">{c.title}</p>
                      {c.description && <p className="text-theme-xs text-gray-500 dark:text-gray-400">{c.description}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge color={c.is_active ? 'success' : 'error'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>
                        <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                          {c.expenses_count} expense{c.expenses_count === 1 ? '' : 's'} · {formatMoney(c.total_debits)}
                        </span>
                      </div>
                    </div>
                    {actions(c)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <Modal open={Boolean(toDelete)} onClose={() => setToDelete(null)}>
        <h4 className="mb-2 pr-10 text-xl font-semibold text-gray-800 dark:text-white/90">Delete category?</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-800 dark:text-white/90">{toDelete?.title}</span> will be permanently removed.
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
