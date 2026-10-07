import axiosClient from './axiosClient';

export const roomTypeApi = {
  getRoomTypes: (onlyActive = false) => axiosClient.get('/RoomTypes', { params: { onlyActive } }),
  getRoomType: (id) => axiosClient.get(`/RoomTypes/${id}`),
  createRoomType: (data) => axiosClient.post('/RoomTypes', data),
  updateRoomType: (id, data) => axiosClient.put(`/RoomTypes/${id}`, data),
  deleteRoomType: (id) => axiosClient.delete(`/RoomTypes/${id}`),

  // API cho Hình ảnh
  addRoomImage: (id, data) => axiosClient.post(`/RoomTypes/${id}/images`, data),
  deleteRoomImage: (imageId) => axiosClient.delete(`/RoomTypes/images/${imageId}`),
  setPrimaryImage: (roomTypeId, imageId) => axiosClient.patch(`/RoomTypes/${roomTypeId}/images/${imageId}/set-primary`),
};