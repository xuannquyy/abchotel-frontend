import axiosClient from './axiosClient';

export const amenityApi = {
  getAmenities: (onlyActive = false) => axiosClient.get('/Amenities', { params: { onlyActive } }),
  getAmenity: (id) => axiosClient.get(`/Amenities/${id}`),
  createAmenity: (data) => axiosClient.post('/Amenities', data),
  updateAmenity: (id, data) => axiosClient.put(`/Amenities/${id}`, data),
  deleteAmenity: (id) => axiosClient.delete(`/Amenities/${id}`),
  
  assignToRoomType: (data) => axiosClient.post('/Amenities/assign-to-room-type', data),
};