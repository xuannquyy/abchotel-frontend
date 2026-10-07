import axiosClient from './axiosClient';

export const reviewApi = {
  // Lấy tất cả đánh giá cho Admin (có thể truyền isVisible = true/false để lọc)
  getAllAdminReviews: (isVisible = '') => axiosClient.get('/Reviews', { params: { isVisible } }),
  
  // Duyệt hiển thị
  approveReview: (id) => axiosClient.patch(`/Reviews/${id}/approve`),
  
  // Trả lời khách
  replyToReview: (id, replyComment) => axiosClient.patch(`/Reviews/${id}/reply`, { replyComment }),
  
  // Xóa / Ẩn bài (Spam)
  deleteReview: (id) => axiosClient.delete(`/Reviews/${id}`),
  // Lấy Top review cho trang chủ/About
  getTopReviews: (count = 3) => axiosClient.get('/Reviews/top', { params: { count } }),

  createReview: (data) => axiosClient.post('/Reviews', data),
  // Lấy danh sách đánh giá theo ID Hạng phòng
  getReviewsByRoomTypeId: (roomTypeId) => axiosClient.get(`/Reviews/room-type/${roomTypeId}`)
};