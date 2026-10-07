import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  // Lấy thông tin đường dẫn hiện tại
  const { pathname } = useLocation();

  useEffect(() => {
    // Mỗi khi pathname (đường dẫn) thay đổi, cuộn về đầu trang (0, 0)
    window.scrollTo(0, 0);
  }, [pathname]);

  return null; // Component này không cần hiển thị gì cả
};

export default ScrollToTop;