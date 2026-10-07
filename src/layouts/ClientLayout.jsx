import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Space, Typography, Dropdown, Avatar, Badge, Popover, Drawer, Grid, List } from 'antd';
import { 
  UserCircle, BellRinging, List as ListIcon, SignOut, CalendarCheck, 
  MapPin, Phone, EnvelopeSimple, FacebookLogo, InstagramLogo, TiktokLogo,
  Bed, Coffee, Ticket, Article, House, SquaresFour
} from '@phosphor-icons/react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSignalR } from '../hooks/useSignalR';
import { notificationApi } from '../api/notificationApi';
import logo from '../assets/logo.png'; 
import BookingSearchWidget from '../components/BookingSearchWidget';
import { Modal } from 'antd';

const { Header, Content, Footer } = Layout;
const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

const THEME = {
  NAVY_DARK: '#0D1821',
  NAVY_LIGHT: '#1C2E4A',
  DARK_RED: '#8A1538',
  GOLD: '#D4AF37', 
  WHITE: '#FFFFFF',
  GRAY_LIGHT: '#F8FAFC'
};

export default function ClientLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const screens = useBreakpoint();
  const isMobile = !screens.lg;

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      notificationApi.getMyNotifications().then(res => {
        setNotifications(res);
        setUnreadCount(res.filter(n => !n.isRead).length);
      }).catch(e => console.log(e));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (location.hash === '#booking') {
      setIsBookingModalOpen(true);
    } else {
      setIsBookingModalOpen(false);
    }
  }, [location.hash]);

  const closeBookingModal = () => {
    setIsBookingModalOpen(false);
    navigate(location.pathname, { replace: true }); // Xóa chữ #booking đi để lần sau bấm lại vẫn nhạy
  };

  useSignalR((newNotif) => {
    if (!isAuthenticated) return;
    setUnreadCount(prev => prev + 1);
    setNotifications(prev => [{ ...newNotif, isRead: false, id: Date.now() }, ...prev].slice(0, 10));
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // 🔥 ĐÃ GỘP TRỰC TIẾP ICON VÀO BÊN TRONG Link ĐỂ CHỐNG LỆCH DÒNG VÀ HỖ TRỢ CHUỘT PHẢI TUYỆT ĐỐI
  const menuItems = [
    { key: '/', label: <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><House size={20} /> TRANG CHỦ</Link> },
    { key: '/rooms', label: <Link to="/rooms" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Bed size={20} /> PHÒNG & SUITES</Link> },
    { key: '/services', label: <Link to="/services" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Coffee size={20} /> DỊCH VỤ</Link> },
    { key: '/offers', label: <Link to="/offers" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Ticket size={20} /> ƯU ĐÃI</Link> },
    { key: '/article', label: <Link to="/article" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Article size={20} /> TIN TỨC</Link> },
  ];

  // Kiểm tra bao phủ mọi trường hợp: Cả roleName và chữ hoa/chữ thường của RoleId
  const isStaff = user && user.roleName !== 'Guest' && user.roleId !== 10 && user.RoleId !== 10;

  const userDropdownItems = [
    // Chỉ chèn nút quay về CMS khi isStaff là true
    ...(isStaff ? [
      { 
        key: 'admin-cms', 
        icon: <SquaresFour size={18} color={THEME.NAVY_DARK} />, 
        label: <Link to="/admin/dashboard" style={{ color: THEME.NAVY_DARK, fontWeight: 'bold' }}>Vào Trang Quản Trị</Link> 
      },
      { type: 'divider' },
    ] : []),
    
    { key: 'profile', icon: <UserCircle size={18} />, label: <Link to="/profile">Hồ sơ cá nhân</Link> },
    { key: 'my-bookings', icon: <CalendarCheck size={18} />, label: <Link to="/my-bookings">Lịch sử đặt phòng</Link> },
    { type: 'divider' },
    { key: 'logout', icon: <SignOut size={18} color={THEME.DARK_RED} />, label: <span style={{ color: THEME.DARK_RED, fontWeight: 500 }}>Đăng xuất</span>, onClick: handleLogout },
  ];

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: THEME.WHITE }}>
      
      <style>{`
        .client-header {
          transition: all 0.3s ease;
          position: fixed;
          top: 0;
          width: 100%;
          z-index: 1000;
          display: flex;
          align-items: center; /* 🔥 Đã sửa lỗi chính tả CSS */
          justify-content: space-between;
          padding: 0 5%;
          height: 80px; /* 🔥 Ép cứng chiều cao Header để menu không bị bóp nghẹt */
          line-height: 80px;
        }
        .header-transparent { background: transparent; box-shadow: none; }
        .header-solid { 
          background: rgba(255, 255, 255, 0.95); 
          backdrop-filter: blur(10px); 
          box-shadow: 0 4px 20px rgba(0,0,0,0.05); 
        }
        .client-menu { 
          background: transparent !important; 
          border-bottom: none !important; 
          flex: 1; 
          justify-content: center; 
          line-height: 80px; 
        }
        .client-menu .ant-menu-item { 
          font-family: "Source Serif 4", serif; 
          font-weight: 600; 
          letter-spacing: 1px; 
          display: flex; 
          align-items: center; 
        }
        .client-menu .ant-menu-item a { color: inherit; text-decoration: none; }
        .client-menu .ant-menu-item:hover::after, .client-menu .ant-menu-item-selected::after {
          border-bottom-color: ${THEME.DARK_RED} !important;
        }
        .client-menu .ant-menu-item-selected { color: ${THEME.DARK_RED} !important; }
        .btn-luxury { 
          background-color: ${THEME.NAVY_DARK}; 
          color: white; 
          border-radius: 0; 
          letter-spacing: 2px; 
          font-family: "Source Serif 4", serif; 
          transition: 0.3s; 
          display: flex; 
          align-items: center; 
        }
        .btn-luxury:hover { background-color: ${THEME.DARK_RED} !important; color: white !important; }
        
        .brand-link { 
          display: flex; 
          align-items: center; /* 🔥 Đã sửa lỗi chính tả CSS */
          text-decoration: none; 
          color: inherit; 
          transition: opacity 0.3s; 
        }
        .brand-link:hover { opacity: 0.8; }
      `}</style>

      <Header className={`client-header ${scrolled ? 'header-solid' : 'header-transparent'}`}>
        
        <Link to="/" className="brand-link">
          <img src={logo} alt="Logo" style={{ height: 40, marginRight: 12 }} />
          <Title level={3} style={{ margin: 0, color: scrolled ? THEME.NAVY_DARK : (isMobile ? THEME.NAVY_DARK : THEME.DARK_RED), fontFamily: '"Source Serif 4", serif', letterSpacing: '3px' }}>
            ABCHOTEL
          </Title>
        </Link>

        {!isMobile && (
          <Menu 
            mode="horizontal" 
            selectedKeys={[location.pathname]} 
            items={menuItems} 
            className="client-menu"
            style={{ color: scrolled ? THEME.NAVY_DARK : '#000' }}
          />
        )}

        <Space size="large" align="center">
          
          {/* Nút Đặt phòng ngay trên Header */}
          {!isMobile && (
            <Button className="btn-luxury" size="large" onClick={() => navigate('#booking')}>
              ĐẶT PHÒNG NGAY
            </Button>
          )}

          {isMobile && (
            <ListIcon size={28} color={scrolled ? THEME.NAVY_DARK : '#000'} onClick={() => setMobileMenuOpen(true)} style={{ marginTop: 26 }} />
          )}

          {isAuthenticated ? (
            <Space size="middle">
              {!isMobile && (
                <Popover content={<div style={{ width: 300, padding: 10 }}><i>Chức năng thông báo đang hoàn thiện...</i></div>} trigger="click" placement="bottomRight">
                  <Badge count={unreadCount} color={THEME.DARK_RED}>
                    <BellRinging size={24} color={scrolled ? THEME.NAVY_DARK : '#000'} style={{ cursor: 'pointer' }} />
                  </Badge>
                </Popover>
              )}
              
              <Dropdown menu={{ items: userDropdownItems }} placement="bottomRight" arrow>
                  <Avatar 
                    style={{ 
                      cursor: 'pointer', 
                      backgroundColor: user?.avatarUrl ? 'transparent' : THEME.NAVY_LIGHT, 
                      color: THEME.GOLD, // Màu chữ cái
                      fontWeight: 'bold',
                      border: `2px solid ${THEME.GOLD}` 
                    }}
                    src={user?.avatarUrl || undefined}
                    icon={!user?.avatarUrl && !user?.fullName ? <UserCircle size={24} /> : null}
                  >
                    {!user?.avatarUrl && user?.fullName ? user.fullName.charAt(0).toUpperCase() : ''}
                  </Avatar>
              </Dropdown>
            </Space>
          ) : (
            !isMobile && (
              <Space style={{ display: 'flex', alignItems: 'center' }}>
                <Link to="/login"><Button type="text" style={{ color: scrolled ? THEME.NAVY_DARK : '#000', fontWeight: 600 }}>Đăng nhập</Button></Link>
                <Link to="/register"><Button style={{ borderColor: THEME.DARK_RED, color: THEME.DARK_RED, borderRadius: 0 }}>Đăng ký</Button></Link>
              </Space>
            )
          )}
        </Space>
      </Header>

      <Drawer title="ABCHOTEL" placement="left" onClose={() => setMobileMenuOpen(false)} open={mobileMenuOpen}>
        <Menu mode="vertical" items={menuItems} onClick={() => setMobileMenuOpen(false)} style={{ borderRight: 'none' }} />
        {!isAuthenticated ? (
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link to="/login" onClick={() => setMobileMenuOpen(false)}><Button block>Đăng nhập</Button></Link>
            <Link to="/register" onClick={() => setMobileMenuOpen(false)}><Button block type="primary" style={{ backgroundColor: THEME.DARK_RED }}>Đăng ký</Button></Link>
          </div>
        ) : (
          <Button block type="primary" danger style={{ marginTop: 20 }} onClick={() => { handleLogout(); setMobileMenuOpen(false); }}>Đăng xuất</Button>
        )}
      </Drawer>

      <Content style={{ paddingTop: 80, minHeight: '80vh' }}>
        <Outlet />
      </Content>

      <Footer style={{ backgroundColor: THEME.NAVY_DARK, color: '#fff', padding: '60px 5% 20px 5%', marginTop: 40 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '40px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 40 }}>
          
          <div style={{ flex: '1 1 250px' }}>
            <Link to="/" className="brand-link" style={{ marginBottom: 20 }}>
              <img src={logo} alt="Logo" style={{ height: 40, filter: 'brightness(0) invert(1)', marginRight: 12 }} />
              <Title level={3} style={{ margin: 0, color: '#fff', fontFamily: '"Source Serif 4", serif', letterSpacing: '2px' }}>ABCHOTEL</Title>
            </Link>
            <Text style={{ color: '#A0AABF', display: 'block', marginBottom: 20, lineHeight: 1.8 }}>
              Trải nghiệm kỳ nghỉ hoàn hảo với sự sang trọng, tinh tế và dịch vụ đẳng cấp 5 sao ngay tại trung tâm thành phố.
            </Text>
            <Space size="large">
              <FacebookLogo size={28} color="#fff" style={{ cursor: 'pointer' }} />
              <InstagramLogo size={28} color="#fff" style={{ cursor: 'pointer' }} />
              <TiktokLogo size={28} color="#fff" style={{ cursor: 'pointer' }} />
            </Space>
          </div>

          <div style={{ flex: '1 1 150px' }}>
            <Title level={5} style={{ color: THEME.GOLD, letterSpacing: '1px', marginBottom: 20 }}>KHÁM PHÁ</Title>
            <Space orientation="vertical" size="middle">
              <Link to="/rooms" style={{ color: '#A0AABF' }}>Phòng & Suites</Link>
              <Link to="/about" style={{ color: '#A0AABF' }}>Về chúng tôi</Link> 
              <Link to="/contact" style={{ color: '#A0AABF' }}>Liên hệ</Link>
              <Link to="/privacy-policy" style={{ color: '#A0AABF' }}>Chính sách & Điều khoản</Link>
              <Link to="/article" style={{ color: '#A0AABF' }}>Cẩm nang du lịch</Link>
            </Space>
          </div>

          <div style={{ flex: '1 1 250px' }}>
            <Title level={5} style={{ color: THEME.GOLD, letterSpacing: '1px', marginBottom: 20 }}>LIÊN HỆ</Title>
            <Space orientation="vertical" size="middle" style={{ color: '#A0AABF' }}>
              <Space><MapPin size={20} color={THEME.DARK_RED}/> 123 Nguyễn Văn Linh, Đà Nẵng, VN</Space>
              <Space><Phone size={20} color={THEME.DARK_RED}/> +84 236 123 4567</Space>
              <Space><EnvelopeSimple size={20} color={THEME.DARK_RED}/> booking@abchotel.com</Space>
            </Space>
          </div>

        </div>

        <div style={{ textAlign: 'center', paddingTop: 20 }}>
          <Text style={{ color: '#6A7A92', fontSize: 13 }}>
            © {new Date().getFullYear()} ABCHOTEL. Lập trình bởi Viên Xuân Quý. All rights reserved.
          </Text>
        </div>
      </Footer>
      {/* 🔥 KHAY TRƯỢT TÌM KIẾM KÉO TỪ BÊN PHẢI (SIDEBAR) */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarCheck size={24} color={THEME.DARK_RED} weight="fill" />
            <span style={{ color: THEME.NAVY_DARK, fontSize: 18, fontFamily: '"Source Serif 4", serif', fontWeight: 700, letterSpacing: 1 }}>TÌM PHÒNG NHANH</span>
          </div>
        }
        placement="right" // 🔥 Đổi từ top sang right
        closable={true}   // 🔥 Bật nút X có sẵn cho đẹp
        open={isBookingModalOpen}
        onClose={closeBookingModal}
        // width={screens.md ? 450 : '100%'}
        styles={{ 
            body: { padding: '24px', backgroundColor: THEME.WHITE },
            header: { borderBottom: '1px solid #f0f0f0', padding: '20px 24px' },
            mask: { backdropFilter: 'blur(6px)', backgroundColor: 'rgba(13, 24, 33, 0.4)' } // Hiệu ứng mờ nền siêu đẹp
        }}
      >
         <BookingSearchWidget />
      </Drawer>
    </Layout>
  );
}