import React, { useState, useEffect } from 'react';
import { Layout, Menu, Dropdown, Avatar, Badge, notification, Space, Typography, Button, Popover, List, Drawer, Grid } from 'antd';
import { 
  Users, Key, Bed, List as ListIcon, Article, BellRinging, SignOut, UserCircle, CaretDown, 
  House, SquaresFour, Archive, WifiHigh, Star, MapPin, WarningCircle, Clock, ChartLineUp, Door, FileText,
  Ticket, CalendarCheck, Receipt , Crown, Coffee, CalendarPlus
} from '@phosphor-icons/react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'; // 🔥 ĐÃ THÊM Link
import { useAuthStore } from '../store/authStore';
import { useSignalR } from '../hooks/useSignalR';
import { notificationApi } from '../api/notificationApi';
import logo from '../assets/logo.png';

const { Header, Sider, Content } = Layout;
const { Text, Title } = Typography;
const { useBreakpoint } = Grid; 

const ACCENT_RED = '#8A1538';
const MIDNIGHT_BLUE = '#1C2E4A';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const screens = useBreakpoint(); 
  const isMobile = !screens.lg; 

  const [collapsed, setCollapsed] = useState(false); 
  const [drawerVisible, setDrawerVisible] = useState(false); 

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [api, contextHolder] = notification.useNotification();

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await notificationApi.getMyNotifications();
        setNotifications(res);
        setUnreadCount(res.filter(n => !n.isRead).length);
      } catch (error) { console.log(error); }
    };
    fetchNotifs();
  }, []);

  useSignalR((newNotif) => {
    setUnreadCount(prev => prev + 1); 
    setNotifications(prev => [{...newNotif, isRead: false, id: Date.now()}, ...prev].slice(0, 20));
    
    api.info({
      title: newNotif.title || 'Thông báo mới',
      description: newNotif.content || newNotif.message, 
      placement: 'topRight',
      duration: 5,
      icon: <BellRinging color={ACCENT_RED} weight="fill" />, 
      style: { borderLeft: `4px solid ${ACCENT_RED}` }
    });
  });

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({...n, isRead: true})));
    } catch (error) { console.log(error); }
  };

  const userMenuItems = [
    { key: 'profile', icon: <UserCircle size={18} />, label: 'Hồ sơ cá nhân', onClick: () => navigate('/admin/profile') },
    { type: 'divider' },
    { key: 'logout', icon: <SignOut size={18} color={ACCENT_RED} />, label: <span style={{ color: ACCENT_RED, fontWeight: 500 }}>Đăng xuất</span>, onClick: () => { logout(); navigate('/login'); } },
  ];

  const notificationContent = (
    <div style={{ width: 340, maxWidth: '85vw' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong style={{ fontSize: 15, color: MIDNIGHT_BLUE }}>Thông báo mới</Text>
        <Button type="link" size="small" onClick={handleMarkAllAsRead}>Đánh dấu đã đọc</Button>
      </div>
      <div style={{ maxHeight: 380, overflowY: 'auto', padding: '0 4px' }} className="custom-sider-scroll">
        <List
          itemLayout="horizontal"
          dataSource={notifications.slice(0, 10)}
          locale={{ emptyText: 'Không có thông báo mới' }}
          renderItem={item => (
            <List.Item style={{ padding: '12px 8px', cursor: 'pointer', opacity: item.isRead ? 0.6 : 1, borderBottom: '1px solid #f5f5f5' }} className="notif-item">
              <List.Item.Meta
                avatar={<Avatar style={{ backgroundColor: item.isRead ? '#f0f0f0' : '#ffe8eb', color: item.isRead ? '#bfbfbf' : ACCENT_RED }} icon={<BellRinging />} />}
                title={<Text strong style={{ fontSize: 13, color: item.isRead ? '#8c8c8c' : '#0F1A2B' }}>{item.title || 'Hệ thống'}</Text>}
                description={<Text style={{ fontSize: 12, color: item.isRead ? '#bfbfbf' : '#52677D' }} ellipsis={{ rows: 2 }}>{item.content || item.message}</Text>}
              />
            </List.Item>
          )}
        />
      </div>
      <div style={{ padding: '8px 12px', textAlign: 'center', borderTop: '1px solid #f0f0f0', backgroundColor: '#fafafa', borderRadius: '0 0 8px 8px' }}>
        <Button type="link" block onClick={() => { navigate('/admin/notifications'); setDrawerVisible(false); }} style={{ color: ACCENT_RED, fontWeight: 500 }}>Xem toàn bộ Lịch sử</Button>
      </div>
    </div>
  );

  const renderGroupTitle = (title) => (collapsed && !isMobile) ? <div style={{ borderBottom: '1px solid #52677D', margin: '16px 8px 8px 8px' }} /> : <span style={{ color: '#52677D', fontWeight: 600, fontSize: 12 }}>{title}</span>;

  // Cấu trúc dữ liệu menu gốc
  const rawSidebarMenuItems = [
    { key: '/admin/dashboard', icon: <SquaresFour size={20} />, label: 'Tổng quan' },
    
    { key: 'grp_frontdesk_booking', label: renderGroupTitle('VẬN HÀNH & ĐIỀU PHỐI'), type: 'group', children: [
      { key: '/admin/rooms', icon: <Bed size={20} />, label: 'Sơ đồ phòng' }, 
      { key: '/admin/bookings/create', icon: <CalendarPlus size={20} />, label: 'Đặt phòng' },
      { key: '/admin/bookings', icon: <CalendarCheck size={20} />, label: 'Quản lý Đơn đặt phòng' },
      { key: '/admin/invoices', icon: <Receipt size={20} />, label: 'Hóa Đơn & Thu ngân' }, 
    ]},
    { key: 'grp_hotel_setup', label: renderGroupTitle('THIẾT LẬP KHÁCH SẠN'), type: 'group', children: [
      { key: '/admin/room-setup', icon: <Door size={20} />, label: 'Hạng Phòng' },
      { key: '/admin/inventory-setup', icon: <Archive size={20} />, label: 'Kho Vật tư' },
      { key: '/admin/amenities', icon: <WifiHigh size={20} />, label: 'Tiện ích phòng' },
      { key: '/admin/services', icon: <Coffee size={20} />, label: 'Dịch vụ & Phụ thu' },
      { key: '/admin/vouchers', icon: <Ticket size={20} />, label: 'Mã Khuyến Mãi' },
    ]},

    { key: 'grp_content_crm', label: renderGroupTitle('NỘI DUNG & CRM'), type: 'group', children: [
      { key: '/admin/memberships', icon: <Crown size={20} />, label: 'Hạng Thành Viên' },
      { key: '/admin/reviews', icon: <Star size={20} />, label: 'Đánh giá từ khách' },
      { key: '/admin/attractions', icon: <MapPin size={20} />, label: 'Điểm du lịch' },
      { key: '/admin/categories', icon: <Article size={20} />, label: 'Bài viết & Blog' },
    ]},

    { key: 'grp_system_hr', label: renderGroupTitle('HỆ THỐNG & NHÂN SỰ'), type: 'group', children: [
      { key: '/admin/users', icon: <Users size={20} />, label: 'Người dùng' },
      // { key: '/admin/shifts', icon: <Clock size={20} />, label: 'Chấm công ca làm' },
      { key: '/admin/roles', icon: <Key size={20} />, label: 'Vai trò & Quyền' },
    ]},

    { key: 'grp_reports_audit', label: renderGroupTitle('BÁO CÁO & GIÁM SÁT'), type: 'group', children: [
      { key: '/admin/loss-damages', icon: <WarningCircle size={20} />, label: 'Báo cáo Hư hỏng' },
      { key: '/admin/revenue-report', icon: <ChartLineUp size={20} />, label: 'Báo cáo Doanh thu' },
      { key: '/admin/audit-logs', icon: <ListIcon size={20} />, label: 'Lịch sử hệ thống' },
    ]},
  ];

  // 🔥 HÀM TỰ ĐỘNG BỌC LINK CHO MENU ĐỂ HỖ TRỢ CHUỘT PHẢI
  const sidebarMenuItems = rawSidebarMenuItems.map(item => {
    if (item.type === 'group') {
      return {
        ...item,
        children: item.children.map(child => ({
          ...child,
          label: <Link to={child.key} style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}>{child.label}</Link>
        }))
      };
    }
    return {
      ...item,
      label: <Link to={item.key} style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}>{item.label}</Link>
    };
  });

  const SidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#001529' }}>
      <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: (collapsed && !isMobile) ? 'center' : 'flex-start', padding: (collapsed && !isMobile) ? '0' : '0 20px', borderBottom: '1px solid #1C2E4A', flexShrink: 0 }}>
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: (collapsed && !isMobile) ? 0 : 12 }}><img src={logo} alt="Logo" style={{ width: 24, height: 24, objectFit: 'contain' }} /></div>
        {!(collapsed && !isMobile) && <Title level={4} style={{ color: '#FFFFFF', margin: 0, fontFamily: '"Source Serif 4", serif', letterSpacing: '2px' }}>ABCHOTEL</Title>}
      </div>
      <div className="custom-sider-scroll" style={{ flex: 1, overflowY: 'auto' }}>
        <Menu 
          theme="dark" 
          mode="inline" 
          selectedKeys={[location.pathname]} 
          items={sidebarMenuItems} 
          onClick={() => { if(isMobile) setDrawerVisible(false); }} 
          style={{ paddingBottom: 20 }} 
        />
      </div>
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh', overflow: 'hidden' }}>
      {contextHolder}
      
      <style>{`
        .custom-sider-scroll::-webkit-scrollbar { width: 4px; }
        .custom-sider-scroll::-webkit-scrollbar-thumb { background: #52677D; border-radius: 4px; }
        .notif-item:hover { background-color: #e9f0f8 !important; border-radius: 6px; }
        .ant-menu-dark .ant-menu-item-selected { background-color: ${ACCENT_RED} !important; border-radius: 8px !important; width: calc(100% - 16px) !important; margin: 4px 8px !important; }
        .ant-menu-dark .ant-menu-item:hover:not(.ant-menu-item-selected) { background-color: rgba(138, 21, 56, 0.2) !important; border-radius: 8px !important; width: calc(100% - 16px) !important; margin: 4px 8px !important; }
        .header-home-link { color: #52677D; font-weight: 500; display: inline-flex; align-items: center; text-decoration: none; padding: 4px 8px; border-radius: 4px; transition: background 0.3s; }
      `}</style>
      
      {!isMobile && (
        <Sider trigger={null} collapsible collapsed={collapsed} width={260} theme="dark" style={{ height: '100vh', borderRight: '1px solid #0F1A2B', zIndex: 100 }}>
          <SidebarContent />
        </Sider>
      )}

      <Drawer placement="left" closable={false} onClose={() => setDrawerVisible(false)} open={drawerVisible} styles={{ wrapper: { width: 260 }, body: { padding: 0 } }}>
        <SidebarContent />
      </Drawer>

      <Layout style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header style={{ padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottom: '1px solid #e9f0f8', flexShrink: 0 }}>
          
          <Space size="middle" align="center">
            <Button type="text" icon={<ListIcon size={24} color="#1C2E4A" />} onClick={() => isMobile ? setDrawerVisible(true) : setCollapsed(!collapsed)} style={{display: 'flex', alignItems: 'center'}} />
            {/* 🔥 ĐÃ CẬP NHẬT NÚT TRANG CHỦ THÀNH LINK */}
            {!isMobile && (
              <Link to="/" className="header-home-link" style={{ display: 'flex', gap: '8px' }}>
                <House size={20} /> Trang chủ
              </Link>
            )}
          </Space>
          
          <Space size="large" align="center" style={{ height: '100%' }}>
            <Popover content={notificationContent} trigger="click" placement={isMobile ? "bottom" : "bottomRight"} arrow={false} styles={{ body: { padding: 0, borderRadius: 8, overflow: 'hidden' } }}>
              <Badge count={unreadCount} overflowCount={99} color={ACCENT_RED} offset={[-2, 4]}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '4px' }}>
                   <BellRinging size={24} color="#1C2E4A" weight="regular" style={{ cursor: 'pointer' }} onClick={() => setUnreadCount(0)} />
                </div>
              </Badge>
            </Popover>

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
              <Space align="center" style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 8 }}>
              <Avatar src={user?.avatarUrl || undefined} icon={!user?.avatarUrl && !user?.fullName ? <UserCircle /> : null} style={{ backgroundColor: user?.avatarUrl ? 'transparent' : '#e9f0f8', color: ACCENT_RED, fontWeight: 'bold' }}>
                  {!user?.avatarUrl && user?.fullName ? user.fullName.charAt(0).toUpperCase() : ''}
                </Avatar>
                {!isMobile && (
                  <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                    <Text style={{ color: '#0F1A2B', fontWeight: 600, fontSize: '14px' }}>{user?.fullName}</Text>
                  </div>
                )}
                <CaretDown size={14} color="#0F1A2B" style={{ marginLeft: 4 }} />
              </Space>
            </Dropdown>
          </Space>

        </Header>
        
        <Content style={{ flex: 1, margin: isMobile ? '12px' : '24px', background: '#FFFFFF', borderRadius: '12px', padding: isMobile ? '16px' : '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflowY: 'auto' }}>
          <Outlet /> 
        </Content>
      </Layout>
    </Layout>
  );
}