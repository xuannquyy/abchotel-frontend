import axiosClient from './axiosClient';

export const shiftApi = {
  checkIn: () => axiosClient.post('/Shifts/check-in'),
  checkOut: () => axiosClient.post('/Shifts/check-out'),
  handover: (data) => axiosClient.post('/Shifts/handover', data),
  
  // Lấy ca đang chạy của bản thân
  getCurrentShift: () => axiosClient.get('/Shifts/current'),
  
  // (Dành cho Quản lý) Lấy danh sách chấm công
  getShifts: (params) => axiosClient.get('/Shifts', { params }),
};