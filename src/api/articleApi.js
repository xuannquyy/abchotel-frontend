import axiosClient from './axiosClient';

export const articleApi = {
  // Bỏ qua bộ lọc categoryId nếu không dùng tới, lấy tất cả (kể cả bản nháp: onlyPublished=false)
  getArticles: (onlyPublished = false, categoryId = null) => 
    axiosClient.get('/Articles', { params: { onlyPublished, categoryId } }),
  
  getArticleBySlug: (slug) => axiosClient.get(`/Articles/${slug}`),
  createArticle: (data) => axiosClient.post('/Articles', data),
  updateArticle: (id, data) => axiosClient.put(`/Articles/${id}`, data),
  deleteArticle: (id) => axiosClient.delete(`/Articles/${id}`),
  togglePublish: (id) => axiosClient.patch(`/Articles/${id}/status`),
  updateThumbnail: (id, data) => axiosClient.post(`/Articles/${id}/thumbnail`, data),
};