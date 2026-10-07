import axiosClient from './axiosClient';

export const mediaApi = {
  // Gửi file ảnh lên Backend (Cần dùng multipart/form-data)
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return axiosClient.post('/Media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
};