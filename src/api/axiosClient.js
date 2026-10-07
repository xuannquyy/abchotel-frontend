import axios from 'axios';

const axiosClient = axios.create({
  baseURL: 'https://xuuxuu-001-site1.dtempurl.com/api', 
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==========================================
// 1. TRƯỚC KHI GỬI ĐI (Tự động nhét Token)
// ==========================================
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Cờ báo hiệu hệ thống đang bận đi đổi thẻ
let isRefreshing = false;
// Hàng đợi chứa các request bị kẹt lại trong lúc chờ đổi thẻ
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) { prom.reject(error); } 
    else { prom.resolve(token); }
  });
  failedQueue = [];
};

// ==========================================
// 2. KHI NHẬN KẾT QUẢ VỀ (Bắt lỗi 401 & Cấp lại Token)
// ==========================================
axiosClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // 🌟 THÊM ĐOẠN NÀY: Bỏ qua interceptor nếu là API đăng nhập
    // Nếu URL có chứa '/Auth/login', không xử lý refresh token mà ném lỗi thẳng ra AuthPage
    if (originalRequest.url.includes('/Auth/login')) {
      return Promise.reject(error);
    }

    // Nếu mã lỗi là 401 (Hết hạn Token) và request này chưa từng được thử lại
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      
      // Trường hợp 1: Có người khác đang đi đổi thẻ rồi -> Mình xếp hàng chờ
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = 'Bearer ' + token;
          return axiosClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      // Trường hợp 2: Mình là người đầu tiên phát hiện thẻ hết hạn -> Đi đổi thẻ
      originalRequest._retry = true;
      isRefreshing = true;

      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      // Nếu không có cả RefreshToken -> Bó tay, bắt đăng nhập lại
      if (!refreshToken) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        // Dùng axios thuần để gọi API cấp lại, không dùng axiosClient để tránh bị lặp vô tận
        const res = await axios.post('https://xuuxuu-001-site1.dtempurl.com/api/Auth/refresh-token', {
          accessToken: accessToken,
          refreshToken: refreshToken
        });

        // Đổi thẻ thành công!
        const newAccessToken = res.data.accessToken || res.data.token;
        const newRefreshToken = res.data.refreshToken;

        // Lưu vào két sắt
        localStorage.setItem('accessToken', newAccessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        // Phát thẻ mới cho mọi người trong hàng đợi
        axiosClient.defaults.headers.common['Authorization'] = 'Bearer ' + newAccessToken;
        originalRequest.headers.Authorization = 'Bearer ' + newAccessToken;
        processQueue(null, newAccessToken);

        // Gửi lại cái request đang bị lỗi lúc nãy
        return axiosClient(originalRequest);

      } catch (refreshError) {
        // Đổi thẻ thất bại (RefreshToken cũng đã hết hạn) -> Đuổi ra ngoài đăng nhập
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false; // Mở chốt chặn
      }
    }

    return Promise.reject(error); // Các lỗi khác (400, 403, 500...) thì ném ra bình thường
  }
);

export default axiosClient;