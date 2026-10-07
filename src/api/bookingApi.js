import axiosClient from './axiosClient';

export const bookingApi = {
  getAll: (status = '') => axiosClient.get('/Bookings', { params: { status } }),
  getMyBookings: () => axiosClient.get('/Bookings/my-bookings'),
  getByCode: (code) => axiosClient.get(`/Bookings/${code}`),
  updateStatus: (id, status, reason = '') => axiosClient.patch(`/Bookings/${id}/status`, { status, reason }),
  
  // 🔥 THÊM LẠI: API tự hủy
  cancelMyBooking: (id, reason) => axiosClient.post(`/Bookings/my-bookings/${id}/cancel`, { reason }),
  
  searchRooms: (data) => axiosClient.post('/Bookings/search', data),
  createBooking: (data) => axiosClient.post('/Bookings/create', data),
  getSpecificRooms: (roomTypeId, checkIn, checkOut) => 
      axiosClient.get('/Bookings/specific-rooms', { params: { roomTypeId, checkIn, checkOut } }),
};

