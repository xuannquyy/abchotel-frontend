import axiosClient from './axiosClient';

export const equipmentApi = {
  // Lấy tất cả vật tư (Dùng cho dropdown/select hoặc lúc gán vật tư vào phòng)
  // onlyActive = true để chỉ lấy những hàng đang kinh doanh
  getAll: (onlyActive = false) => 
    axiosClient.get('/Equipments', { params: { onlyActive } }),

  // Lấy chi tiết 1 vật tư theo ID
  getById: (id) => 
    axiosClient.get(`/Equipments/${id}`),

  // Lấy danh sách vật tư có phân trang, lọc, tìm kiếm (Dùng cho Trang Quản lý Kho Tổng sau này)
  getEquipments: (params) => 
    axiosClient.get('/Equipments/filter', { params }),

  // Thêm mới 1 loại vật tư vào kho tổng
  create: (data) => 
    axiosClient.post('/Equipments', data),

  // Cập nhật thông tin vật tư kho tổng
  update: (id, data) => 
    axiosClient.put(`/Equipments/${id}`, data),

  // Xóa (Khóa mềm) vật tư
  delete: (id) => 
    axiosClient.delete(`/Equipments/${id}`),
};