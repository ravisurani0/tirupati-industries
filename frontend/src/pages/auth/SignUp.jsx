import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import { useAuth } from '../../context/AuthContext';
import { Checkbox, Input, PasswordInput, TextArea } from '../../components/ui/Form';
import Button from '../../components/ui/Button';
import { Alert } from '../../components/ui/Feedback';
import ProfileLogoInput from '../../components/ui/ProfileLogoInput';
import { ChevronLeftIcon } from '../../components/common/icons';
import { emptyUser, validateUser } from '../../utils/validation';

export default function SignUp() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyUser);
  const [logo, setLogo] = useState(null);
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    const er = validateUser(form);
    if (!agree) er.agree = 'Please accept the terms to continue';
    setErrors(er);
    if (Object.keys(er).length) return;

    setSubmitting(true);
    try {
      await register({ ...form, profile_logo: logo || undefined });
      navigate('/', { replace: true });
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-md pt-5 sm:pt-10">
        <Link to="/signin" className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
          <ChevronLeftIcon className="stroke-current" />
          Back to sign in
        </Link>
      </div>

      <div className="no-scrollbar mx-auto flex w-full max-w-md flex-1 flex-col justify-center overflow-y-auto py-8">
        <div className="mb-5 sm:mb-8">
          <h1 className="text-title-sm sm:text-title-md mb-2 font-semibold text-gray-800 dark:text-white/90">Sign Up</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Enter your details to create an account.</p>
        </div>

        <form onSubmit={onSubmit} noValidate>
          <div className="space-y-5">
            {message && <Alert variant="error">{message}</Alert>}

            <ProfileLogoInput user={form} onChange={(file) => setLogo(file)} error={errors.profile_logo} />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Input label="First Name" required name="first_name" autoComplete="given-name" placeholder="Enter your first name" value={form.first_name} onChange={set('first_name')} error={errors.first_name} />
              <Input label="Last Name" required name="last_name" autoComplete="family-name" placeholder="Enter your last name" value={form.last_name} onChange={set('last_name')} error={errors.last_name} />
            </div>

            <Input label="Email" required type="email" name="email" autoComplete="email" placeholder="Enter your email" value={form.email} onChange={set('email')} error={errors.email} />
            <Input label="Phone Number" type="tel" name="phone" autoComplete="tel" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} error={errors.phone} />
            <TextArea label="Address" name="address" autoComplete="street-address" rows={3} placeholder="Enter your address" value={form.address} onChange={set('address')} error={errors.address} />

            <PasswordInput label="Password" required name="password" autoComplete="new-password" placeholder="At least 8 characters" value={form.password} onChange={set('password')} error={errors.password} />
            <PasswordInput
              label="Confirm Password"
              required
              name="password_confirmation"
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={form.password_confirmation}
              onChange={set('password_confirmation')}
              error={errors.password_confirmation}
            />

            <div>
              <Checkbox
                checked={agree}
                onChange={(v) => {
                  setAgree(v);
                  setErrors((er) => ({ ...er, agree: undefined }));
                }}
                label={
                  <span className="inline-block font-normal text-gray-500 dark:text-gray-400">
                    By creating an account you agree to the <span className="text-gray-800 dark:text-white/90">Terms and Conditions</span> and our{' '}
                    <span className="text-gray-800 dark:text-white">Privacy Policy</span>
                  </span>
                }
              />
              {errors.agree && <p className="text-theme-xs text-error-500 mt-1.5">{errors.agree}</p>}
            </div>

            <Button type="submit" className="w-full" loading={submitting}>
              Sign Up
            </Button>
          </div>
        </form>

        <div className="mt-5">
          <p className="text-center text-sm font-normal text-gray-700 sm:text-start dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/signin" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
