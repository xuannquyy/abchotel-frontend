import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Tabs, Button, Card, Space, Tag, Spin, notification } from 'antd';
import { ArrowLeft, Info, Broom, Archive, Gear, Coffee } from '@phosphor-icons/react'; 

import { roomApi } from '../../api/roomApi';
import { useAuthStore } from '../../store/authStore';
import { useSignalR } from '../../hooks/useSignalR'; 
import { COLORS } from '../../constants/theme';

import TabRoomInfo from './components/TabRoomInfo';
import TabCleaning from './components/TabCleaning';
import TabServices from './components/TabServices'; // 🔥 Đã tích hợp Tab mới
import TabRoomInventory from '../RoomSetup/components/TabRoomInventory';
import TabRoomBasicInfo from '../RoomSetup/components/TabRoomBasicInfo';

const { Title, Text } = Typography;

// BẢNG MÀU LẠNH SANG TRỌNG (KHÔNG VÀNG GOLD)
const LUXURY_COLORS = {
  NAVY: '#1C2E4A',
  RED: '#8A1538',
  LOCKED: '#0D1821',
  COOL_BLUE: '#344966',
  LIGHT_BLUE: '#B4CDED'
};

const BUSINESS_LABELS = { 
  Available: 'Phòng Trống', 
  Occupied: 'Đang Có Khách', 
  Reserved: 'Đã Đặt Trước', 
  Maintenance: 'Đang Bảo Trì' 
};

const CLEANING_LABELS = { 
  Clean: 'Sạch Sẽ', 
  Dirty: 'Cần Dọn Dẹp', 
  Cleaning: 'Đang Dọn...', 
  Inspected: 'Đã Kiểm Tra' 
};

export default function RoomDetailPage() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const perms = user?.permissions || [];

  const [api, contextHolder] = notification.useNotification();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  // PHÂN QUYỀN HIỂN THỊ CÁC TAB CHUẨN NGHIỆP VỤ
  const canUpdateRoomStatus = perms.includes('UPDATE_ROOM_STATUS') || perms.includes('MANAGE_BOOKINGS'); 
  const canUpdateCleaning = perms.includes('UPDATE_CLEANING_STATUS'); 
  const canManageInventory = perms.includes('MANAGE_INVENTORY') || perms.includes('MANAGE_ROOMS'); 
  const canManageRooms = perms.includes('MANAGE_ROOMS');
  const canManageServices = perms.includes('MANAGE_SERVICES') || perms.includes('MANAGE_BOOKINGS'); // 🔥 Quyền gọi dịch vụ

  const fetchRoomInfo = useCallback(async (isRealtime = false) => {
    if (!id || id === 'undefined') return;
    try {
      if (!isRealtime) setLoading(true);
      const data = await roomApi.getRoom(id);
      setRoom(data);
    } catch (error) { 
      if (!isRealtime) {
        api.error({ placement: 'bottomRight', title: 'Lỗi hệ thống', description: 'Không thể tải dữ liệu phòng' }); 
      }
    } 
    finally { 
      if (!isRealtime) setLoading(false); 
    }
  }, [id, api]); 

  useEffect(() => { fetchRoomInfo(false); }, [fetchRoomInfo]);
  
  // Realtime SignalR cập nhật trạng thái phòng khi có thay đổi từ thiết bị hoặc nhân viên khác
  useSignalR((notification) => {
    if (notification.permission === "UPDATE_ROOM_STATUS" || notification.permission === "UPDATE_CLEANING_STATUS") {
        fetchRoomInfo(true);
    }
  });

  const generateTabs = () => {
    const items = [];
    
    // Tab 1: Của Lễ tân (Thông tin lưu trú)
    if (canUpdateRoomStatus) items.push({ 
        key: 'info', 
        label: <Space><Info size={18}/> Trạng thái & Khách ở</Space>, 
        children: <TabRoomInfo room={room} onRefresh={() => fetchRoomInfo(false)} /> 
    });

    // Tab 2: Gọi dịch vụ (Mới thêm) - Chỉ hiện khi phòng có khách
    if (canManageServices) items.push({ 
        key: 'services', 
        label: <Space><Coffee size={18}/> Dịch vụ phòng</Space>, 
        children: <TabServices room={room} /> 
    });
    
    // Tab 3: Của Buồng phòng
    if (canUpdateCleaning) items.push({ 
        key: 'cleaning', 
        label: <Space><Broom size={18}/> Dọn phòng & Báo cáo</Space>, 
        children: <TabCleaning room={room} roomId={id} onRefreshRoom={() => fetchRoomInfo(false)} /> 
    });
    
    // Tab 4: Của Quản lý Vật tư/Kho
    if (canManageInventory) items.push({ 
        key: 'inventory', 
        label: <Space><Archive size={18}/> Kiểm kê Vật tư</Space>, 
        children: <TabRoomInventory room={room} /> 
    });
    
    // Tab 5: Của Quản trị viên (Cấu hình kỹ thuật)
    if (canManageRooms) items.push({ 
        key: 'basic', 
        label: <Space><Gear size={18}/> Cấu hình thiết bị</Space>, 
        children: <TabRoomBasicInfo room={room} onRefresh={() => fetchRoomInfo(false)} /> 
    });

    return items;
  };

  if (loading && !room) return <div style={{textAlign: 'center', padding: '100px 0'}}><Spin size="large" /></div>;
  if (!room && !loading) return <div style={{textAlign: 'center', padding: '50px 0'}}>Không tìm thấy dữ liệu phòng này!</div>;

  return (
    <div style={{ paddingBottom: 40, width: '100%', margin: '0 auto', animation: 'fadeIn 0.4s ease-out' }}>
      {contextHolder}

      {/* HEADER: THÔNG TIN PHÒNG & TRẠNG THÁI NHANH */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 24, gap: 12 }}>
        <Button 
            type="text" 
            icon={<ArrowLeft size={24} color={LUXURY_COLORS.NAVY} />} 
            onClick={() => navigate('/admin/rooms')} 
            style={{ padding: '4px 8px' }} 
        />
        <div style={{ flex: 1 }}>
          <Title level={4} style={{ margin: '0 0 4px 0', color: LUXURY_COLORS.NAVY, fontWeight: 700 }}>
            Phòng {room.roomNumber} <Text type="secondary" style={{fontSize: 14, fontWeight: 400}}>({room.roomTypeName})</Text>
          </Title>
          <Space wrap style={{ marginTop: 4 }}>
            {/* Tag Trạng thái kinh doanh */}
            <Tag color={room.status === 'Occupied' ? LUXURY_COLORS.RED : LUXURY_COLORS.LIGHT_BLUE} style={{ color: room.status === 'Occupied' ? '#fff' : LUXURY_COLORS.NAVY, border: 'none', fontWeight: 600, padding: '2px 12px', borderRadius: 4 }}>
              {BUSINESS_LABELS[room.status] || room.status}
            </Tag>
            
            {/* Tag Trạng thái dọn dẹp */}
            <Tag color={room.cleaningStatus === 'Clean' ? '#f0fdf4' : '#fef2f2'} style={{ color: room.cleaningStatus === 'Clean' ? '#166534' : LUXURY_COLORS.RED, border: `1px solid ${room.cleaningStatus === 'Clean' ? '#bbf7d0' : '#fecaca'}`, fontWeight: 600, padding: '2px 12px', borderRadius: 4 }}>
              Vệ sinh: {CLEANING_LABELS[room.cleaningStatus] || room.cleaningStatus}
            </Tag>
          </Space>
        </div>
      </div>

      {/* THÂN TRANG: CÁC TAB NGHIỆP VỤ */}
      <Card 
        variant="borderless" 
        style={{ borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', overflow: 'hidden' }} 
        styles={{ body: { padding: window.innerWidth > 768 ? '12px 24px 24px 24px' : '8px' } }}
      >
        <Tabs 
            items={generateTabs()} 
            size={window.innerWidth > 768 ? "large" : "middle"} 
            destroyOnHidden={false} 
            className="luxury-tabs"
        />
      </Card>

      <style>{`
        .luxury-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
            color: ${LUXURY_COLORS.NAVY} !important;
            font-weight: 700 !important;
        }
        .luxury-tabs .ant-tabs-ink-bar {
            background: ${LUXURY_COLORS.NAVY} !important;
            height: 3px !important;
        }
        .luxury-tabs .ant-tabs-tab:hover {
            color: ${LUXURY_COLORS.RED} !important;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}