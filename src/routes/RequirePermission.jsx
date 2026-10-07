import React from 'react';
import { useAuthStore } from '../store/authStore';
import Error403 from '../pages/Errors/Error403';

export default function RequirePermission({ children, requiredPermissions }) {
  const { user } = useAuthStore();

  // Đảm bảo requiredPermissions luôn là một mảng để dễ xử lý (phòng hờ con chỉ truyền 1 chữ)
  const permissionsToCheck = Array.isArray(requiredPermissions) 
    ? requiredPermissions 
    : [requiredPermissions];

  // Kiểm tra xem trong mảng Permissions của user có chứa ÍT NHẤT 1 quyền mà trang này yêu cầu không
  // Dùng .some() sẽ trả về true nếu có ít nhất 1 điều kiện khớp
  const hasPermission = user?.permissions?.some(p => permissionsToCheck.includes(p));

  // Nếu không có bất kỳ quyền nào hợp lệ -> Hiển thị trang 403 (Không có quyền)
  if (!hasPermission) {
    return <Error403 />;
  }

  // Nếu có quyền, cho phép hiển thị nội dung trang đó
  return children;
}