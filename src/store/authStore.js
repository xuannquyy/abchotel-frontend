import { create } from 'zustand';
import { authApi } from '../api/authApi';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false, // Biến này để chặn web load trước khi check xong Token

  setAuth: (userData, accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ user: userData, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false });
  },

  // HÀM MỚI: Tự động check token khi mở lại web
  checkAuth: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      set({ isInitialized: true });
      return;
    }
    try {
      const profile = await authApi.getMe();
      set({ user: profile, isAuthenticated: true, isInitialized: true });
    } catch (error) {
      // Token hết hạn hoặc không hợp lệ -> Xóa luôn
      localStorage.removeItem('accessToken');
      set({ user: null, isAuthenticated: false, isInitialized: true });
    }
  }
}));