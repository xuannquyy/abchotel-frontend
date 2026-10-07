import React, { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Row, Col, Input, Select, Badge, Spin, notification } from 'antd';
import { MagnifyingGlass, Funnel } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { roomApi } from '../api/roomApi';
import { roomTypeApi } from '../api/roomTypeApi';
import { useSignalR } from '../hooks/useSignalR'; 

const { Title, Text } = Typography;

// 🔥 BẢNG TÔNG MÀU LẠNH (Cool Tones)
const PALETTE = {
  darkest: '#0D1821',   
  dark: '#1C2E4A',      
  muted: '#64748B',     
  light: '#E2E8F0',     
  lightest: '#D3D3D3',  
  white: '#FFFFFF',     
  locked: '#334155',    
  badgeClean: '#0284C7',
  blue: '#7292AD',
  lightblue: '#e9f0f8',
  badgeDirty: '#8A1538' 
};

const STATUS_THEME = {
  Available: { bg: PALETTE.lightblue, text: PALETTE.darkest, label: 'Trống', border: PALETTE.light }, 
  Occupied: { bg: PALETTE.dark, text: PALETTE.white, label: 'Có Khách', border: PALETTE.dark }, 
  Reserved: { bg: PALETTE.blue, text: PALETTE.white, label: 'Đặt Trước', border: PALETTE.muted },
  Maintenance: { bg: PALETTE.white, text: PALETTE.muted, label: 'Bảo Trì', border: '#CBD5E1' },
  Locked: { bg: PALETTE.locked, text: '#CBD5E1', label: 'Bị Khóa', border: PALETTE.locked } 
};

const CLEANING_LABELS = {
  Clean: 'Sạch sẽ',   
  Dirty: 'Dơ (Cần dọn)',   
  Cleaning: 'Đang dọn',
  Inspected: 'Chờ kiểm tra'
};

export default function RoomsPage() {
  const navigate = useNavigate();
  
  // 🔥 FIX LỖI SẬP TRANG: Đã để trống useNotification()
  const [api, contextHolder] = notification.useNotification();
  
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(false);

  const [searchNumber, setSearchNumber] = useState('');
  const [filterBusiness, setFilterBusiness] = useState(''); 
  const [filterCleaning, setFilterCleaning] = useState(''); 
  const [filterRoomType, setFilterRoomType] = useState(''); 

  const fetchData = useCallback(async (isRealtime = false) => {
    try {
      if (!isRealtime) setLoading(true);
      const [roomsData, typesData] = await Promise.all([
        roomApi.getRooms(true),
        roomTypeApi.getRoomTypes(true)
      ]);
      setRooms(roomsData || []);
      setRoomTypes(typesData || []);
    } catch (error) {
      if (!isRealtime) {
        // 🔥 Ép thông báo rớt xuống góc dưới ở đây
        api.error({ placement: 'bottomRight', message: 'Lỗi tải dữ liệu', description: 'Không thể lấy sơ đồ phòng.' });
      }
    } finally { 
      if (!isRealtime) setLoading(false); 
    }
  }, []); // Bỏ api ra khỏi mảng dependency để an toàn tuyệt đối

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  useSignalR(() => {
    fetchData(true); 
  });

  const displayedRooms = rooms.filter(room => {
    const matchNumber = room.roomNumber.toLowerCase().includes(searchNumber.toLowerCase());
    const matchBusiness = filterBusiness ? room.status === filterBusiness : true;
    const matchCleaning = filterCleaning ? room.cleaningStatus === filterCleaning : true;
    const matchType = filterRoomType ? room.roomTypeId === filterRoomType : true;
    return matchNumber && matchBusiness && matchCleaning && matchType;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {contextHolder}

      <Title level={3} style={{ color: PALETTE.darkest, margin: '0 0 24px 0', fontFamily: '"Source Serif 4", serif' }}>
        Dọn Phòng & Giám Sát Trạng Thái
      </Title>

      <Card variant="borderless" style={{ borderRadius: 12, marginBottom: 24, backgroundColor: '#F0F4F8' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} lg={6}>
            <Input 
              placeholder="Gõ số phòng cần tìm..." size="large" allowClear
              prefix={<MagnifyingGlass color={PALETTE.muted} />}
              value={searchNumber} onChange={(e) => setSearchNumber(e.target.value)}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Select
              size="large" style={{ width: '100%' }} placeholder="Lọc theo Hạng phòng" allowClear
              value={filterRoomType} onChange={setFilterRoomType}
              options={[
                { value: '', label: 'Tất cả hạng phòng' },
                ...roomTypes.map(rt => ({ value: rt.id, label: rt.name }))
              ]}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Select
              size="large" style={{ width: '100%' }} placeholder="Trạng thái Phòng" 
              value={filterBusiness} onChange={setFilterBusiness}
              options={[
                { value: '', label: 'Tất cả trạng thái' },
                ...Object.keys(STATUS_THEME).filter(k => k !== 'Locked').map(key => ({ value: key, label: STATUS_THEME[key].label }))
              ]}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Select
              size="large" style={{ width: '100%' }} placeholder="Trạng thái Dọn dẹp"
              value={filterCleaning} onChange={setFilterCleaning}
              options={[
                { value: '', label: 'Tất cả dọn dẹp' },
                ...Object.keys(CLEANING_LABELS).map(key => ({ value: key, label: CLEANING_LABELS[key] }))
              ]}
            />
          </Col>
        </Row>
      </Card>

      <div style={{ flex: 1 }}>
        {loading ? (
           <div style={{ textAlign: 'center', padding: '60px 0' }}><Spin size="large" /></div>
        ) : displayedRooms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', background: '#F0F4F8', borderRadius: 12 }}>
            <Funnel size={48} weight="light" color={PALETTE.muted} style={{ marginBottom: 16 }} />
            <Title level={5} style={{ color: PALETTE.darkest }}>Không tìm thấy phòng nào phù hợp với bộ lọc</Title>
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            {displayedRooms.map(room => {
              const theme = STATUS_THEME[room.status] || STATUS_THEME['Maintenance'];
              const cleaningText = CLEANING_LABELS[room.cleaningStatus] || room.cleaningStatus;

              return (
                <Col xs={12} sm={8} md={6} lg={4} xl={3} key={room.id}>
                  <Badge.Ribbon 
                    text={<span style={{fontWeight: 600}}>{cleaningText}</span>} 
                    color={room.cleaningStatus === 'Clean' ? PALETTE.badgeClean : PALETTE.badgeDirty}
                    style={{ fontSize: 10, padding: '0 8px', top: -5, right: -5 }}
                  >
                    <Card 
                      hoverable
                      onClick={() => navigate(`/admin/rooms/${room.id}`)}
                      styles={{ body: { padding: '24px 12px 16px 12px', textAlign: 'center' } }}
                      style={{ 
                        borderRadius: 10, 
                        backgroundColor: theme.bg, 
                        border: `1px solid ${theme.border}`, 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.04)', 
                        height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center'
                      }}
                    >
                      <Title level={2} style={{ color: theme.text, margin: '8px 0 4px 0', fontFamily: '"Source Serif 4", serif' }}>
                        {room.roomNumber}
                      </Title>
                      
                      <Text style={{ display: 'block', fontSize: 12, color: theme.text, opacity: 0.8, marginBottom: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {room.roomTypeName}
                      </Text>
                      
                      <div style={{ marginTop: 'auto' }}>
                        <span style={{ color: theme.text, fontWeight: 'bold', fontSize: 14 }}>
                           {theme.label}
                        </span>
                      </div>
                    </Card>
                  </Badge.Ribbon>
                </Col>
              );
            })}
          </Row>
        )}
      </div>
    </div>
  );
}