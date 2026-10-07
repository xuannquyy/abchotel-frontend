import axiosClient from './axiosClient';

export const profileApi = {
  getMyProfile: () => axiosClient.get('/UserProfile/my-profile'),
  updateProfile: (data) => axiosClient.put('/UserProfile/update-profile', data),
  changePassword: (data) => axiosClient.put('/UserProfile/change-password', data),
  uploadAvatar: (data) => axiosClient.post('/UserProfile/upload-avatar', data)
};