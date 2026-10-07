import axiosClient from './axiosClient';

export const lossDamageApi = {
  getReports: (params) => axiosClient.get('/LossDamages', { params }),
  
  getByBooking: (bookingDetailId) => axiosClient.get(`/LossDamages/booking/${bookingDetailId}`),
  getByRoom: (roomId) => axiosClient.get(`/LossDamages/room/${roomId}`),
  reportDamage: (data) => axiosClient.post('/LossDamages', data),
  updateStatus: (id, status) => axiosClient.patch(`/LossDamages/${id}/status`, { status }),
};