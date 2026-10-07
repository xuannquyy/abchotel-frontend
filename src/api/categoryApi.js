import axiosClient from './axiosClient';

export const categoryApi = {
  // Quản lý truyền onlyActive = false để lấy TẤT CẢ (cả ẩn và hiện)
  getCategories: (onlyActive = false) => axiosClient.get('/ArticleCategories', { params: { onlyActive } }),
  
  createCategory: (data) => axiosClient.post('/ArticleCategories', data),
  updateCategory: (id, data) => axiosClient.put(`/ArticleCategories/${id}`, data),
  
  // Backend dùng HttpDelete để Toggle trạng thái Ẩn/Hiện
  toggleStatus: (id) => axiosClient.delete(`/ArticleCategories/${id}`),
};