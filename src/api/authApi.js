import axiosClient from './axiosClient';

export const authApi = {
  login: (data) => axiosClient.post('/Auth/login', data),
  register: (data) => axiosClient.post('/Auth/register', data),
  forgotPassword: (data) => axiosClient.post('/Auth/forgot-password', data), // API quên mật khẩu thầy thêm
  getMe: () => axiosClient.get('/Auth/me'), // Lấy thông tin cá nhân
};