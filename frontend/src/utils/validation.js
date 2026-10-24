const EMAIL = /^\S+@\S+\.\S+$/;
const PHONE = /^\+?[0-9\s()-]{7,20}$/;

/** Client-side checks that mirror the API rules (the API remains the source of truth). */
export function validateUser(values, { requirePassword = true, checkPassword = true } = {}) {
  const e = {};
  if (!values.first_name?.trim()) e.first_name = 'First name is required';
  if (!values.last_name?.trim()) e.last_name = 'Last name is required';
  if (!values.email?.trim()) e.email = 'Email is required';
  else if (!EMAIL.test(values.email.trim())) e.email = 'Enter a valid email address';
  if (values.phone && !PHONE.test(values.phone.trim())) e.phone = 'Enter a valid phone number';

  if (checkPassword) {
    if (requirePassword && !values.password) e.password = 'Password is required';
    else if (values.password && (values.password.length < 8 || values.password.length > 72)) e.password = 'Password must be between 8 and 72 characters';
    if (values.password && values.password !== values.password_confirmation) e.password_confirmation = 'Passwords do not match';
  }
  return e;
}

export const emptyUser = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address: '',
  password: '',
  password_confirmation: '',
};
