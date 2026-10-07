import dayjs from 'dayjs';

// Format tiền tệ VNĐ (VD: 150000 -> 150,000 ₫)
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '0 ₫';
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
};

// Format ngày tháng cơ bản (VD: 25/03/2026)
export const formatDate = (dateString, format = 'DD/MM/YYYY') => {
  if (!dateString) return '';
  return dayjs(dateString).format(format);
};

// Format ngày tháng có giờ phút (VD: 14:30 - 25/03/2026)
export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  return dayjs(dateString).format('HH:mm - DD/MM/YYYY');
};