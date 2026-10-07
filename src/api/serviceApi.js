import axiosClient from './axiosClient';

export const serviceApi = {
  // Categories
  getCategories: () => axiosClient.get('/Services/categories'),
  createCategory: (data) => axiosClient.post('/Services/categories', data),
  updateCategory: (id, data) => axiosClient.put(`/Services/categories/${id}`, data),
  deleteCategory: (id) => axiosClient.delete(`/Services/categories/${id}`),

  // Services
  getServices: (onlyActive = false) => axiosClient.get('/Services', { params: { onlyActive } }),
  createService: (data) => axiosClient.post('/Services', data),
  updateService: (id, data) => axiosClient.put(`/Services/${id}`, data),
  toggleServiceStatus: (id) => axiosClient.delete(`/Services/${id}`)
};