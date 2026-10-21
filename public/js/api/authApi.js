import { apiJson, apiFetch } from './client.js';

export const authApi = {
  async getMe() {
    return apiJson('/api/auth/me');
  },

  async updateProfile(data) {
    return apiJson('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async logout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore network errors on logout
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
};
