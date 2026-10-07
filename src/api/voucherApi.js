import axiosClient from './axiosClient';

export const voucherApi = {
  getAll: (onlyActive = false) => axiosClient.get('/vouchers', { params: { onlyActive } }),
  getById: (id) => axiosClient.get(`/vouchers/${id}`),
  create: (data) => axiosClient.post('/vouchers', data),
  update: (id, data) => axiosClient.put(`/vouchers/${id}`, data),
  toggleStatus: (id) => axiosClient.delete(`/vouchers/${id}`),
  apply: (data) => axiosClient.post('/vouchers/apply', data),
   
  getBirthdayVouchers: () => axiosClient.get('/vouchers/birthday'),
  getVipVouchers: () => axiosClient.get('/vouchers/vip'),

  // Lấy danh sách voucher dành cho các trò chơi (WHEEL, BOX, SCRATCH...)
  getGameVouchers: () => axiosClient.get('/vouchers/game-pool'),

  // Lưu voucher vào kho của người dùng (khi nhấn "Thu thập")
  collect: (voucherId) => axiosClient.post(`/vouchers/collect/${voucherId}`),

  // Lấy danh sách voucher người dùng đang sở hữu (thay cho localStorage)
  getMyVouchers: () => axiosClient.get('/vouchers/my-vouchers'),
  
  // Kiểm tra xem người dùng có phải khách hàng mới không (dành cho Tab "Khách mới")
  checkNewCustomerStatus: () => axiosClient.get('/vouchers/check-new-status'),

};