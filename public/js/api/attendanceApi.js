import { apiJson } from './client.js';

export const attendanceApi = {
  async getDaily(date) {
    return apiJson(`/api/attendance/daily?date=${encodeURIComponent(date)}`);
  },

  async saveDaily(date, records) {
    return apiJson('/api/attendance/daily', {
      method: 'POST',
      body: JSON.stringify({ date, records })
    });
  },

  async getMonthlySummary(month) {
    return apiJson(`/api/attendance/monthly-summary?month=${encodeURIComponent(month)}`);
  }
};
