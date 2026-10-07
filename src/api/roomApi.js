import axiosClient from './axiosClient';

export const roomApi = {
  getRooms: (onlyActive = false) => axiosClient.get('/Rooms', { params: { onlyActive } }),
  getRoom: (id) => axiosClient.get(`/Rooms/${id}`),
  createRoom: (data) => axiosClient.post('/Rooms', data),
  bulkCreateRooms: (data) => axiosClient.post('/Rooms/bulk-create', data),
  updateRoom: (id, data) => axiosClient.put(`/Rooms/${id}`, data),
  deleteRoom: (id) => axiosClient.delete(`/Rooms/${id}`),
  updateStatus: (id, status) => axiosClient.patch(`/Rooms/${id}/status`, { status }),
  updateCleaningStatus: (id, cleaningStatus) => axiosClient.patch(`/Rooms/${id}/cleaning-status`, { cleaningStatus }),
};