import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { categoriesApi } from '../../api';
import { ComponentCard, PageBreadcrumb } from '../../components/common/Common';
import Button, { buttonClass, Spinner } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Feedback';
import { Input, Switch, TextArea } from '../../components/ui/Form';
import { formatMoney } from '../../utils/format';

/** Full-page create (/expense-categories/new) and edit (/expense-categories/:id/edit). */
export default function CategoryForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', is_active: true });
  const [category, setCategory] = useState(null);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    categoriesApi
      .get(id)
      .then(({ data }) => {
        setCategory(data);
        setForm({ title: data.title, description: data.description || '', is_active: data.is_active });
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
    if (!form.title.trim()) return setErrors({ title: 'Title is required' });
    setSaving(true);
    setMessage('');
    try {
      const res = isEdit ? await categoriesApi.update(id, form) : await categoriesApi.create(form);
      navigate('/expense-categories', { state: { notice: `${res.message}: ${res.data.title}.` } });
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageBreadcrumb title={isEdit ? 'Edit Category' : 'Add Category'} items={[{ label: 'Expense Categories', to: '/expense-categories' }]} />
      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          {message && <Alert variant="error">{message}</Alert>}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <ComponentCard title="Category details" className="xl:col-span-2">
              <div className="space-y-5">
                <Input label="Title" required value={form.title} onChange={set('title')} error={errors.title} placeholder="e.g. Travel, Utilities, Office supplies" maxLength={100} />
                <TextArea label="Description" rows={3} value={form.description} onChange={set('description')} error={errors.description} placeholder="What kind of expenses go here?" />
              </div>
            </ComponentCard>
            <div className="space-y-6">
              <ComponentCard title="Status">
                <Switch checked={form.is_active} onChange={(v) => setForm((f) => ({ ...f, is_active: v }))} label="Active" />
                <p className="text-theme-xs mt-1.5 text-gray-500 dark:text-gray-400">Inactive categories stay on past expenses but can&apos;t be picked for new ones.</p>
              </ComponentCard>
              {category && (
                <ComponentCard title="Usage">
                  <p className="text-2xl font-bold text-gray-800 dark:text-white/90">{formatMoney(category.total_debits)}</p>
                  <p className="text-theme-xs mt-1 text-gray-500 dark:text-gray-400">
                    spent across {category.expenses_count} expense{category.expenses_count === 1 ? '' : 's'}
                  </p>
                </ComponentCard>
              )}
            </div>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link to="/expense-categories" className={buttonClass('outline')}>
              Cancel
            </Link>
            <Button type="submit" loading={saving}>
              {isEdit ? 'Save changes' : 'Create category'}
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
