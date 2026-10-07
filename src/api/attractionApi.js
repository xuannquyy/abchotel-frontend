import axiosClient from './axiosClient';

export const attractionApi = {
  getAttractions: (onlyActive = false) => axiosClient.get('/Attractions', { params: { onlyActive } }),
  getAttraction: (id) => axiosClient.get(`/Attractions/${id}`),
  createAttraction: (data) => axiosClient.post('/Attractions', data),
  updateAttraction: (id, data) => axiosClient.put(`/Attractions/${id}`, data),
  deleteAttraction: (id) => axiosClient.delete(`/Attractions/${id}`),
};