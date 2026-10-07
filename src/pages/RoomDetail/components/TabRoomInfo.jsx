import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, Row, Col, Divider, Table, notification, Descriptions, Tag, Input, Grid } from 'antd';
import { BellRinging, MagnifyingGlass } from '@phosphor-icons/react';
import { roomApi } from '../../../api/roomApi';
import { roomInventoryApi } from '../../../api/roomInventoryApi';
import { COLORS } from '../../../constants/theme';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const STATUS_UI = {
  Available: { color: COLORS.LIGHT, text: COLORS.DARKEST, label: 'Trống' }, 
  Occupied: { color: COLORS.ACCENT_RED, text: '#FFFFFF', label: 'Đang Có Khách' }, 
  Reserved: { color: COLORS.MUTED, text: '#FFFFFF', label: 'Đã Đặt Trước' },
  Maintenance: { color: '#F0F2F5', text: COLORS.DARKEST, label: 'Bảo Trì' },
};

export default function TabRoomInfo({ room, onRefresh }) {
  // 🔥 CHỈ DÙNG 1 LUỒNG THÔNG BÁO TẠI GÓC DƯỚI PHẢI (CHO CÁC NÚT BẤM THỦ CÔNG)
  // Các thông báo Realtime đã được Trang cha (RoomDetailPage) xử lý ngầm rồi.
  const [manualApi, contextHolder] = notification.useNotification({ placement: 'bottomRight' });
  
  const [loading, setLoading] = useState(false);
  const [inventories, setInventories] = useState([]);
  const [searchText, setSearchText] = useState(''); 
  const screens = useBreakpoint(); 

  useEffect(() => {
    if (room?.id) {
      roomInventoryApi.getInventoryByRoom(room.id, true).then(res => setInventories(res || []));
    }
  }, [room?.id]);

  const handleUpdateStatus = async (newStatus) => {
    try {
      setLoading(true);
      await roomApi.updateStatus(room.id, newStatus);
      manualApi.success({ message: 'Thành công', description: 'Đã lưu trạng thái phòng!' });
      onRefresh(); 
    } catch (e) { 
      manualApi.error({ message: 'Lỗi', description: 'Cập nhật trạng thái thất bại.' }); 
    } 
    finally { setLoading(false); }
  };

  const handleCallHousekeeping = async () => {
    try {
      setLoading(true);
      const newStatus = room.status === 'Available' ? 'Inspected' : 'Dirty';
      await roomApi.updateCleaningStatus(room.id, newStatus); 
      manualApi.success({ message: 'Thành công', description: 'Trạng thái phòng đã chuyển thành Cần dọn dẹp!' });
      onRefresh();
    } catch (e) { 
      manualApi.error({ message: 'Lỗi', description: 'Không thể gọi buồng phòng lúc này.' }); 
    }
    finally { setLoading(false); }
  };

  const filteredInventories = inventories.filter(item => 
    item.equipmentName?.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div style={{ paddingTop: 12 }}>
      {contextHolder}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        
        {/* === PHẦN TRẠNG THÁI & VẬN HÀNH GIỮ NGUYÊN === */}
        <Col xs={24} lg={14}>
          <Card title="Trạng thái Phòng & Vận hành" variant="borderless" style={{ background: COLORS.LIGHTEST, height: '100%', borderRadius: 12 }}>
            <Title level={3} style={{ color: STATUS_UI[room?.status]?.text || COLORS.DARKEST, margin: 0 }}>
              {STATUS_UI[room?.status]?.label || room?.status}
            </Title>
            <Divider style={{ margin: '16px 0' }}/>
            
            <Space wrap size="small" style={{ marginBottom: 24 }}>
              <Button onClick={() => handleUpdateStatus('Available')}>Phòng Trống</Button>
              <Button type="primary" onClick={() => handleUpdateStatus('Occupied')} style={{ backgroundColor: COLORS.ACCENT_RED }}>Khách Nhận Phòng</Button>
              <Button onClick={() => handleUpdateStatus('Reserved')} style={{ backgroundColor: COLORS.MUTED, color: '#fff', border: 'none' }}>Đã Đặt</Button>
              <Button onClick={() => handleUpdateStatus('Maintenance')}>Bảo Trì</Button>
            </Space>

            <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>Cần dọn dẹp hoặc kiểm tra phòng?</Text>
            <Button type="primary" onClick={handleCallHousekeeping} style={{ backgroundColor: COLORS.DARKEST }} icon={<BellRinging />} block={!screens.md}>
              GỌI BUỒNG PHÒNG
            </Button>
          </Card>
        </Col>
        
        {/* === PHẦN THÔNG TIN CƠ BẢN (ĐÃ BỔ SUNG THÊM TẦNG & GIÁ) === */}
        <Col xs={24} lg={10}>
          <Card title="Thông tin cơ bản" variant="borderless" style={{ height: '100%', borderRadius: 12, border: `1px solid ${COLORS.LIGHTEST}` }}>
            <Descriptions column={1} size="small" styles={{ label: { fontWeight: 600, color: COLORS.MUTED }, content: { fontWeight: 'bold', color: COLORS.DARKEST } }}>
              <Descriptions.Item label="Số phòng">{room?.roomNumber}</Descriptions.Item>
              <Descriptions.Item label="Hạng phòng">{room?.roomTypeName}</Descriptions.Item>
              <Descriptions.Item label="Tầng">{room?.floor || 'N/A'}</Descriptions.Item>
              
              <Descriptions.Item label="Giá qua đêm">
                <Text strong style={{ color: COLORS.ACCENT_RED }}>
                  {new Intl.NumberFormat('vi-VN').format(room?.basePrice || 0)} ₫
                </Text>
              </Descriptions.Item>
              
              <Descriptions.Item label="Giá theo giờ">
                <Text strong style={{ color: COLORS.ACCENT_RED }}>
                  {new Intl.NumberFormat('vi-VN').format(room?.pricePerHour || 0)} ₫
                </Text>
              </Descriptions.Item>
              
              <Descriptions.Item label="Sức chứa">{room?.capacityAdults} Lớn, {room?.capacityChildren} Nhỏ</Descriptions.Item>
              <Descriptions.Item label="Loại giường">{room?.bedType || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Diện tích">{room?.sizeSqm ? `${room.sizeSqm} m²` : 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Hướng nhìn">{room?.viewDirection || 'N/A'}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {/* === PHẦN TÀI SẢN TRONG PHÒNG GIỮ NGUYÊN === */}
      <Card 
        title="Tài sản & Tiện ích trong phòng" 
        variant="borderless" 
        style={{ borderRadius: 12, border: `1px solid ${COLORS.LIGHTEST}` }}
      >
        <Input 
          placeholder="Tìm kiếm vật tư..." 
          prefix={<MagnifyingGlass />} 
          allowClear 
          onChange={e => setSearchText(e.target.value)} 
          style={{ marginBottom: 16 }}
        />
        
        {screens.md ? (
          <Table 
            size="small" 
            dataSource={filteredInventories} 
            rowKey="id" 
            pagination={false}
            columns={[
              { title: 'Tên Vật Tư', dataIndex: 'equipmentName', key: 'equipmentName', render: t => <Text strong style={{color: COLORS.DARKEST}}>{t}</Text> },
              { title: 'SL', dataIndex: 'quantity', align: 'center', width: 300, render: q => <Tag color="blue" style={{margin:0}}>{q}</Tag> },
              { title: 'Giá đền bù', dataIndex: 'priceIfLost', align: 'center', width: 350, render: p => `${new Intl.NumberFormat('vi-VN').format(p || 0)} đ` }
            ]}
            style={{ border: `1px solid ${COLORS.LIGHTEST}`, borderRadius: 8, overflow: 'hidden' }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredInventories.map(item => (
              <div key={item.id} style={{ background: '#fff', border: `1px solid ${COLORS.LIGHTEST}`, borderRadius: 10, padding: 16, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 15, color: COLORS.DARKEST, flex: 1, paddingRight: 12 }}>{item.equipmentName}</Text>
                  <Tag color="processing" style={{ margin: 0, fontWeight: 'bold', fontSize: 13, padding: '4px 8px', borderRadius: 6 }}>SL: {item.quantity}</Tag>
                </div>
                <div style={{ textAlign: 'left', marginTop: 4 }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Giá đền bù: <Text strong style={{ color: COLORS.ACCENT_RED }}>{new Intl.NumberFormat('vi-VN').format(item.priceIfLost || 0)} đ</Text>
                  </Text>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}