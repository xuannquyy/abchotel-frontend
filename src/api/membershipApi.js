import axiosClient from './axiosClient';

export const membershipApi = {
  getAll: () => axiosClient.get('/Memberships'),
  getById: (id) => axiosClient.get(`/Memberships/${id}`),
  create: (data) => axiosClient.post('/Memberships', data),
  update: (id, data) => axiosClient.put(`/Memberships/${id}`, data),
  delete: (id) => axiosClient.delete(`/Memberships/${id}`)
};