import axiosClient from './axiosClient';

export const userApi = {
  // Lấy danh sách (có phân trang, search, filter)
  getUsers: (params) => axiosClient.get('/UserManagement', { params }),
  
  // Tạo user mới (Backend tự sinh pass và gửi email)
  createUser: (data) => axiosClient.post('/UserManagement', data),
  
  // Sửa thông tin user
  updateUser: (id, data) => axiosClient.put(`/UserManagement/${id}`, data),
  
  // Khóa/Mở khóa tài khoản (Soft Delete)
  toggleStatus: (id) => axiosClient.delete(`/UserManagement/${id}`),
  
  // Đổi chức vụ (Role)
  changeRole: (id, newRoleId) => axiosClient.put(`/UserManagement/${id}/change-role`, { newRoleId }),
  resetPassword: (id) => axiosClient.post('/UserManagement/'+id+'/reset-password'),
};