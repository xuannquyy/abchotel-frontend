import axiosClient from './axiosClient';

export const orderApi = {
  // Lấy danh sách order theo ID chi tiết phòng đang ở
  getByBookingDetail: (bookingDetailId) => axiosClient.get(`/OrderServices/booking-detail/${bookingDetailId}`),
  
  // Tạo yêu cầu dịch vụ mới
  create: (data) => axiosClient.post('/OrderServices', data),
  
  // Cập nhật trạng thái (Pending -> Processing -> Completed -> Cancelled)
  updateStatus: (id, status) => axiosClient.patch(`/OrderServices/${id}/status`, `"${status}"`, {
    headers: { 'Content-Type': 'application/json' }
  })
};