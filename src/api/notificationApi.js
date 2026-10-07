import axiosClient from './axiosClient';

export const notificationApi = {
  /**
   * Lấy danh sách thông báo của người dùng đang đăng nhập
   * Endpoint: GET /api/Notifications
   */
  getMyNotifications: () => axiosClient.get('/Notifications'),

  /**
   * Đánh dấu một thông báo là đã đọc
   * Endpoint: PUT /api/Notifications/{id}/read
   */
  markAsRead: (id) => axiosClient.put(`/Notifications/${id}/read`),

  /**
   * Đánh dấu tất cả thông báo của tôi là đã đọc
   * Endpoint: PUT /api/Notifications/read-all
   */
  markAllAsRead: () => axiosClient.put('/Notifications/read-all'),

  /**
   * Xóa một thông báo (Nếu sau này bạn bổ sung nút xóa ở backend)
   * Endpoint: DELETE /api/Notifications/{id}
   */
  deleteNotification: (id) => axiosClient.delete(`/Notifications/${id}`)
};