import axiosClient from './axiosClient';

export const reportApi = {
  getAuditLogs: (params) => axiosClient.get('/AuditReports/audit-logs', { params }),
  getStaffPerformance: (params) => axiosClient.get('/AuditReports/staff-performance', { params })
};