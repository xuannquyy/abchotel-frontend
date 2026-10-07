import { ConfigProvider } from 'antd';
import { BrowserRouter } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1C2E4A', // Midnight Blue - Nút chính
          colorInfo: '#52677D',    // Dusty Blue - Tag, Nhấn
          colorBgBase: '#e9f0f8',  // Xanh dương nhạt sáng - Nền tổng thể
          colorBgContainer: '#FFFFFF', // Nền trắng cho Bảng/Card
          fontFamily: '"Source Serif 4", serif',
          colorTextBase: '#0F1A2B', // Deep Navy - Màu chữ
          colorBorder: '#BDC4D4',  // Ivory - Màu viền
        },
        components: {
          Layout: {
            headerBg: '#FFFFFF', // Header màu trắng cho sáng sủa
            siderBg: '#0F1A2B',  // Sidebar màu Deep Navy cực đậm
          },
          Menu: {
            darkItemBg: '#0F1A2B', // Nền menu
            darkItemSelectedBg: '#1C2E4A', // Nền khi click chọn
            darkItemColor: '#D1CFC9', // Buttercream - Chữ menu
            darkItemSelectedColor: '#FFFFFF',
          }
        }
      }}
    >
      <BrowserRouter>
        <ScrollToTop />
        <AppRoutes />
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;