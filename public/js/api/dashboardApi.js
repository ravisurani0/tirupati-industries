import { apiJson } from './client.js';

export const dashboardApi = {
  async getStats() {
    return apiJson('/api/dashboard/stats');
  },

  async getRecentAdvances() {
    return apiJson('/api/dashboard/recent-advances');
  }
};
