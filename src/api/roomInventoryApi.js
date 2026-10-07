import axiosClient from './axiosClient';

export const roomInventoryApi = {
  getInventoryByRoom: (roomId, onlyActive = false) => axiosClient.get(`/RoomInventories/room/${roomId}`, { params: { onlyActive } }),
  createInventory: (data) => axiosClient.post('/RoomInventories', data),
  updateInventory: (id, data) => axiosClient.put(`/RoomInventories/${id}`, data),
  deleteInventory: (id) => axiosClient.delete(`/RoomInventories/${id}`),
  cloneInventory: (data) => axiosClient.post('/RoomInventories/clone', data),
};