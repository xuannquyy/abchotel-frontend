import React from 'react';
import { useAuthStore } from '../store/authStore';
import Error403 from '../pages/Errors/Error403';
import Error401 from '../pages/Errors/Error401'; // Import file 401

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { isAuthenticated, user } = useAuthStore();

  // 1. Chưa đăng nhập -> Bắn ra lỗi 401 (Toàn màn hình)
  if (!isAuthenticated) {
    return <Error401 />;
  }

  // 2. Nếu route cấm Guest mà user lại là Guest -> Bắn lỗi 403 (Toàn màn hình vì nó nằm ngoài Layout)
  if (requireAdmin && user?.roleName === 'Guest') {
    return <Error403 />;
  }

  return children;
}