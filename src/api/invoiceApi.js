import axiosClient from './axiosClient';

export const invoiceApi = {
  getAll: (status) => axiosClient.get('/Invoices', { params: { status } }),
  getById: (id) => axiosClient.get(`/Invoices/${id}`),
  recalculate: (id) => axiosClient.post(`/Invoices/${id}/recalculate`),
  payCash: (data) => axiosClient.post('/Invoices/pay', data),
  markRefunded: (id) => axiosClient.post(`/Invoices/${id}/mark-refunded`),

  createVnPayUrl: (id, isDeposit = false, amount = null) => {
    let url = `/Invoices/${id}/create-vnpay-url?isDeposit=${isDeposit}`;
    if (amount) url += `&amount=${amount}`;
    return axiosClient.post(url);
  },
  
  createMoMoUrl: (id, isDeposit = false, amount = null) => {
    let url = `/Invoices/${id}/create-momo-url?isDeposit=${isDeposit}`;
    if (amount) url += `&amount=${amount}`;
    return axiosClient.post(url);
  },
  
  addService: (invoiceId, data) => axiosClient.post(`/Invoices/${invoiceId}/add-service`, data),
  addDamage: (invoiceId, data) => axiosClient.post(`/Invoices/${invoiceId}/add-damage`, data),
  getByBookingCode: (code) => axiosClient.get(`/Invoices/by-booking/${code}`),
};