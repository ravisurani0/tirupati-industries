// React API Client Services

export function getAuthToken() {
  return localStorage.getItem('token');
}

export function setAuthSession(token, user) {
  if (token) localStorage.setItem('token', token);
  if (user) localStorage.setItem('user', JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export async function apiFetch(url, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers
  });

  if (res.status === 401 || res.status === 403) {
    clearAuthSession();
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }

  return res;
}

export async function apiJson(url, options = {}) {
  const res = await apiFetch(url, options);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed (${res.status})`);
  }
  return data;
}

// Utility Formatters
export function formatCurrency(num) {
  const val = parseFloat(num) || 0;
  return '₹' + val.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Module API Services
export const authApi = {
  async login(username, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  async getMe() {
    return apiJson('/api/auth/me');
  },

  async updateProfile(payload) {
    return apiJson('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    clearAuthSession();
    window.location.href = '/login';
  }
};

export const dashboardApi = {
  getStats: () => apiJson('/api/dashboard/stats'),
  getRecentAdvances: () => apiJson('/api/dashboard/recent-advances')
};

export const employeesApi = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiJson(`/api/employees${q ? '?' + q : ''}`);
  },
  getById: (id) => apiJson(`/api/employees/${id}`),
  create: (payload) => apiJson('/api/employees', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) => apiJson(`/api/employees/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  delete: (id) => apiJson(`/api/employees/${id}`, { method: 'DELETE' })
};

export const attendanceApi = {
  getByDate: (date) => apiJson(`/api/attendance/by-date?date=${encodeURIComponent(date)}`),
  saveBulk: (date, records) => apiJson('/api/attendance/bulk', { method: 'POST', body: JSON.stringify({ date, records }) }),
  getMonthlySummary: (month) => apiJson(`/api/attendance/monthly-summary?month=${encodeURIComponent(month)}`)
};

export const advancesApi = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiJson(`/api/advances${q ? '?' + q : ''}`);
  },
  getById: (id) => apiJson(`/api/advances/${id}`),
  getSummary: () => apiJson('/api/advances/summary'),
  create: (payload) => apiJson('/api/advances', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) => apiJson(`/api/advances/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  delete: (id) => apiJson(`/api/advances/${id}`, { method: 'DELETE' }),
  addRepayment: (id, payload) => apiJson(`/api/advances/${id}/repayments`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteRepayment: (id, repaymentId) => apiJson(`/api/advances/${id}/repayments/${repaymentId}`, { method: 'DELETE' })
};

export const payrollApi = {
  calculate: (month) => apiJson(`/api/payroll/calculate?month=${encodeURIComponent(month)}`),
  saveAll: (month, records) => apiJson('/api/payroll/save', { method: 'POST', body: JSON.stringify({ month, records }) }),
  recordPayment: (payload) => apiJson('/api/payroll/record-payment', { method: 'POST', body: JSON.stringify(payload) }),
  getSlip: (payrollId) => apiJson(`/api/payroll/slip/${payrollId}`)
};

export const expensesApi = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiJson(`/api/expenses${q ? '?' + q : ''}`);
  },
  getById: (id) => apiJson(`/api/expenses/${id}`),
  getSummary: () => apiJson('/api/expenses/summary'),
  create: (payload) => apiJson('/api/expenses', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) => apiJson(`/api/expenses/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  delete: (id) => apiJson(`/api/expenses/${id}`, { method: 'DELETE' }),
  getCsvUrl: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return `/api/export/expenses${q ? '?' + q : ''}`;
  }
};

export const reportsApi = {
  getPayrollCsvUrl: (month) => `/api/export/payroll?month=${encodeURIComponent(month)}`,
  getAdvancesCsvUrl: (status = 'all', type = 'all') => `/api/export/advances?status=${encodeURIComponent(status)}&type=${encodeURIComponent(type)}`,
  getExpensesCsvUrl: (month = '', category = 'all') => `/api/export/expenses?month=${encodeURIComponent(month)}&category=${encodeURIComponent(category)}`
};
