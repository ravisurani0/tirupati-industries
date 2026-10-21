import { apiJson } from './client.js';

export const advancesApi = {
  async getAll({ status = 'all', search = '' } = {}) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    return apiJson(`/api/advances?${params.toString()}`);
  },

  async getSummary() {
    return apiJson('/api/advances/summary');
  },

  async create(data) {
    return apiJson('/api/advances', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async update(id, data) {
    return apiJson(`/api/advances/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async delete(id) {
    return apiJson(`/api/advances/${id}`, {
      method: 'DELETE'
    });
  }
};
