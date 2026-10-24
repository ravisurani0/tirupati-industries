import { request, toFormData } from './client';

export const authApi = {
  login: (email, password, remember) =>
    request('/auth/login', { method: 'POST', body: { email, password, remember }, auth: false }),
  register: (values) => request('/auth/register', { method: 'POST', body: toFormData(values), auth: false }),
  me: () => request('/auth/me'),
  updateProfile: (values) => request('/auth/profile', { method: 'PUT', body: toFormData(values) }),
  changePassword: (values) => request('/auth/change-password', { method: 'PUT', body: values }),
  logout: () => request('/auth/logout', { method: 'POST' }),
};

export const usersApi = {
  list: (params) => request('/users', { params }),
  stats: () => request('/users/stats'),
  get: (id) => request(`/users/${id}`),
  create: (values) => request('/users', { method: 'POST', body: toFormData(values) }),
  update: (id, values) => request(`/users/${id}`, { method: 'PUT', body: toFormData(values) }),
  remove: (id) => request(`/users/${id}`, { method: 'DELETE' }),
};

export const rolesApi = {
  list: () => request('/roles'),
  create: (values) => request('/roles', { method: 'POST', body: values }),
  update: (id, values) => request(`/roles/${id}`, { method: 'PUT', body: values }),
  remove: (id) => request(`/roles/${id}`, { method: 'DELETE' }),
};

export const employeesApi = {
  list: (params) => request('/employees', { params }),
  stats: () => request('/employees/stats'),
  get: (id) => request(`/employees/${id}`),
  create: (values) => request('/employees', { method: 'POST', body: values }),
  update: (id, values) => request(`/employees/${id}`, { method: 'PUT', body: values }),
  remove: (id) => request(`/employees/${id}`, { method: 'DELETE' }),
};

export const attendanceApi = {
  daily: (params) => request('/attendance/daily', { params }),
  calendar: (params) => request('/attendance/calendar', { params }),
  list: (params) => request('/attendance', { params }),
  get: (id) => request(`/attendance/${id}`),
  create: (values) => request('/attendance', { method: 'POST', body: values }),
  update: (id, values) => request(`/attendance/${id}`, { method: 'PUT', body: values }),
  remove: (id) => request(`/attendance/${id}`, { method: 'DELETE' }),
  generate: (date) => request('/attendance/generate', { method: 'POST', body: { date } }),
};

export const accountsApi = {
  list: (params) => request('/accounts', { params }),
  get: (id) => request(`/accounts/${id}`),
  transactions: (id, params) => request(`/accounts/${id}/transactions`, { params }),
  create: (values) => request('/accounts', { method: 'POST', body: values }),
  update: (id, values) => request(`/accounts/${id}`, { method: 'PUT', body: values }),
  remove: (id) => request(`/accounts/${id}`, { method: 'DELETE' }),
};

export const expensesApi = {
  list: (params) => request('/expenses', { params }),
  get: (id) => request(`/expenses/${id}`),
  create: (values) => request('/expenses', { method: 'POST', body: toFormData(values) }),
  update: (id, values) => request(`/expenses/${id}`, { method: 'PUT', body: toFormData(values) }),
  remove: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
};

export const categoriesApi = {
  list: (params) => request('/expense-categories', { params }),
  get: (id) => request(`/expense-categories/${id}`),
  create: (values) => request('/expense-categories', { method: 'POST', body: values }),
  update: (id, values) => request(`/expense-categories/${id}`, { method: 'PUT', body: values }),
  remove: (id) => request(`/expense-categories/${id}`, { method: 'DELETE' }),
};

export const advancesApi = {
  list: (params) => request('/advances', { params }),
  get: (id) => request(`/advances/${id}`),
  create: (values) => request('/advances', { method: 'POST', body: values }),
  update: (id, values) => request(`/advances/${id}`, { method: 'PUT', body: values }),
  remove: (id) => request(`/advances/${id}`, { method: 'DELETE' }),
};

export const payrollApi = {
  list: (params) => request('/payroll', { params }),
  get: (employeeId, month) => request(`/payroll/${employeeId}`, { params: { month } }),
};
