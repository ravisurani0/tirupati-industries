import { apiJson } from './client.js';

export const employeesApi = {
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiJson(`/api/employees${query ? '?' + query : ''}`);
  },

  async create(data) {
    return apiJson('/api/employees', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async update(id, data) {
    return apiJson(`/api/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async delete(id) {
    return apiJson(`/api/employees/${id}`, {
      method: 'DELETE'
    });
  }
};
