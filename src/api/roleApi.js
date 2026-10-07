import axiosClient from './axiosClient';

export const roleApi = {
  // Lấy danh sách
  getRoles: () => axiosClient.get('/Roles'),
  getPermissions: () => axiosClient.get('/Roles/permissions'),
  
  // Các thao tác
  createRole: (data) => axiosClient.post('/Roles', data),
  updateRole: (id, data) => axiosClient.put(`/Roles/${id}`, data),
  deleteRole: (id) => axiosClient.delete(`/Roles/${id}`),
  
  // CHÚ Ý: HÀM NÀY PHẢI CÓ THÌ NÚT LƯU PHÂN QUYỀN MỚI HOẠT ĐỘNG
  assignPermissions: (data) => axiosClient.post('/Roles/assign-permission', data),
};