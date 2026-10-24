import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import { useAuth } from '../../context/AuthContext';
import { Checkbox, Input, PasswordInput } from '../../components/ui/Form';
import Button from '../../components/ui/Button';
import { Alert } from '../../components/ui/Feedback';

export default function SignIn() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const validate = () => {
    const er = {};
    if (!form.email.trim()) er.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) er.email = 'Enter a valid email address';
    if (!form.password) er.password = 'Password is required';
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      await login(form.email.trim(), form.password, remember);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
        <div className="mb-5 sm:mb-8">
          <h1 className="text-title-sm sm:text-title-md mb-2 font-semibold text-gray-800 dark:text-white/90">Sign In</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Enter your email and password to sign in!</p>
        </div>

        <form onSubmit={onSubmit} noValidate>
          <div className="space-y-5">
            {message && <Alert variant="error">{message}</Alert>}

            <Input
              label="Email"
              required
              type="email"
              name="email"
              autoComplete="email"
              placeholder="info@gmail.com"
              value={form.email}
              onChange={set('email')}
              error={errors.email}
            />
            <PasswordInput
              label="Password"
              required
              name="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={form.password}
              onChange={set('password')}
              error={errors.password}
            />

            <div className="flex items-center justify-between">
              <Checkbox checked={remember} onChange={setRemember} label="Keep me logged in" />
            </div>

            <Button type="submit" className="w-full" loading={submitting}>
              Sign In
            </Button>
          </div>
        </form>

        <div className="mt-5">
          <p className="text-center text-sm font-normal text-gray-700 sm:text-start dark:text-gray-400">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
