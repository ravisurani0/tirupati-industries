import { apiJson } from './client.js';

export const payrollApi = {
  async getPayroll(month) {
    return apiJson(`/api/payroll?month=${encodeURIComponent(month)}`);
  },

  async calculate(month) {
    return apiJson('/api/payroll/calculate', {
      method: 'POST',
      body: JSON.stringify({ month })
    });
  },

  async recordPayment(data) {
    return apiJson('/api/payroll/pay', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updatePayment(id, data) {
    return apiJson(`/api/payroll/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deletePayment(id) {
    return apiJson(`/api/payroll/payments/${id}`, {
      method: 'DELETE'
    });
  }
};
