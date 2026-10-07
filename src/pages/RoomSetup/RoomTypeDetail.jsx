import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Input, Select, Table, Tag, Modal, Form, InputNumber, Row, Col, notification, Space, Tooltip, Grid } from 'antd';
import { MagnifyingGlass, Plus, PencilSimple, LockKey, LockOpen, ArrowLeft, Gear } from '@phosphor-icons/react';
import { useParams, useNavigate } from 'react-router-dom';

import { roomApi } from '../../api/roomApi';
import { roomTypeApi } from '../../api/roomTypeApi';
import { COLORS } from '../../constants/theme';
import { useSignalR } from '../../hooks/useSignalR'; 

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const STATUS_UI = {
  Available: { color: 'green', label: 'Trống (Sẵn sàng)' }, 
  Occupied: { color: COLORS.ACCENT_RED, label: 'Đang Có Khách' }, 
  Reserved: { color: COLORS.MUTED, label: 'Đã Đặt Trước' },
  Maintenance: { color: 'default', label: 'Bảo Trì' },
};

export default function RoomTypeDetail() {
  const { typeId } = useParams();
  const navigate = useNavigate();
  const screens = useBreakpoint();

  // 🔥 Chỉ giữ lại 1 luồng thông báo cá nhân ở góc dưới bên phải
  const [api, contextHolder] = notification.useNotification({
    placement: 'bottomRight'
  });

  const [roomTypeInfo, setRoomTypeInfo] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomForm] = Form.useForm();

  // Load dữ liệu (Nếu là realtime thì sẽ không hiện loading xoay xoay)
  const fetchData = async (isRealtime = false) => {
    try {
      if (!isRealtime) setLoading(true);
      
      const typeData = await roomTypeApi.getRoomType(typeId);
      setRoomTypeInfo(typeData);

      const allRooms = await roomApi.getRooms(false); 
      const filteredRooms = allRooms.filter(r => r.roomTypeId === Number(typeId));
      setRooms(filteredRooms);

      // 🔥 ĐÃ GỠ BỎ POP-UP REALTIME GÂY RỐI MẮT Ở ĐÂY
      // Hệ thống giờ sẽ âm thầm tự động làm mới giao diện
    } catch (error) {
      if (!isRealtime) {
        api.error({ message: 'Lỗi', description: 'Không thể tải dữ liệu phòng.' });
      }
    } finally {
      if (!isRealtime) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(false);
  }, [typeId]);

  // Lắng nghe SignalR để tự làm mới dữ liệu
  useSignalR(() => {
    fetchData(true); 
  });

  const handleSubmitRoom = async (values) => {
    try {
      setLoading(true);
      const payload = {
        roomNumber: values.roomNumber,
        floor: values.floor,
        roomTypeId: Number(typeId),
        status: values.status || 'Available'
      };

      if (editingRoom) {
        await roomApi.updateRoom(editingRoom.id, payload);
        api.success({ message: 'Thành công', description: `Đã cập nhật phòng ${values.roomNumber}` });
      } else {
        await roomApi.createRoom(payload);
        api.success({ message: 'Thành công', description: `Đã thêm phòng ${values.roomNumber}` });
      }
      
      setIsModalOpen(false);
      fetchData(false);
    } catch (error) {
      api.error({ message: 'Lỗi', description: error.response?.data?.message || 'Số phòng có thể đã tồn tại.' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      setLoading(true);
      await roomApi.deleteRoom(id); 
      api.success({ message: 'Thành công', description: `Đã ${currentStatus ? 'khóa' : 'mở lại'} phòng!` });
      fetchData(false);
    } catch (error) {
      api.error({ message: 'Lỗi', description: 'Không thể thay đổi trạng thái.' });
    } finally {
      setLoading(false);
    }
  };

  const openModal = (record = null) => {
    setEditingRoom(record);
    if (record) {
      roomForm.setFieldsValue(record);
    } else {
      roomForm.resetFields();
      roomForm.setFieldsValue({ status: 'Available', floor: 1 });
    }
    setIsModalOpen(true);
  };

  const filteredData = rooms.filter(r => {
    const matchName = r.roomNumber?.toLowerCase().includes(searchText.toLowerCase());
    const matchStatus = filterStatus === 'all' ? true : r.status === filterStatus;
    return matchName && matchStatus;
  }).sort((a, b) => {
    if (a.isActive === b.isActive) return 0;
    return a.isActive ? -1 : 1; 
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: 24 }}>
      {/* HIỂN THỊ CÁC POPUP THÔNG BÁO TỪ GÓC DƯỚI */}
      {contextHolder}
      
      <style>{`
        .inactive-row { opacity: 0.65; background-color: #fafafa; }
        .inactive-row:hover { opacity: 0.85 !important; }
      `}</style>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Button type="text" icon={<ArrowLeft size={24} color={COLORS.MIDNIGHT_BLUE} />} onClick={() => navigate('/admin/room-setup')} style={{ marginRight: 8 }} />
          <div>
            <Title level={3} style={{ color: COLORS.MIDNIGHT_BLUE, margin: '0 0 4px 0', fontFamily: '"Source Serif 4", serif' }}>
              {roomTypeInfo ? `Phòng vật lý: ${roomTypeInfo.name}` : 'Đang tải...'}
            </Title>
            <Text type="secondary">Quản lý các phòng cụ thể thuộc hạng phòng này.</Text>
          </div>
        </div>
        
        <Button 
          type="primary" 
          size="large"
          icon={<Plus weight="bold" />} 
          style={{ backgroundColor: COLORS.ACCENT_RED, fontWeight: 'bold', borderRadius: 8 }}
          onClick={() => openModal()}
        >
          THÊM 1 PHÒNG
        </Button>
      </div>

      {/* BỘ LỌC */}
      <Card variant="borderless" style={{ borderRadius: 12, marginBottom: 24, backgroundColor: COLORS.LIGHTEST }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12} lg={8}>
            <Input 
              placeholder="Tìm theo số phòng (VD: 101)..." 
              size="large" 
              allowClear
              prefix={<MagnifyingGlass color={COLORS.MUTED} />}
              value={searchText} 
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Col>
          <Col xs={24} md={12} lg={6}>
            <Select
              size="large" 
              style={{ width: '100%' }} 
              value={filterStatus} 
              onChange={setFilterStatus}
              options={[
                { value: 'all', label: 'Tất cả trạng thái' },
                { value: 'Available', label: 'Trống (Sẵn sàng)' },
                { value: 'Occupied', label: 'Đang có khách' },
                { value: 'Reserved', label: 'Đã đặt trước' },
                { value: 'Maintenance', label: 'Đang bảo trì' }
              ]}
            />
          </Col>
        </Row>
      </Card>

      {/* DANH SÁCH PHÒNG */}
      <Card variant="borderless" style={{ borderRadius: 12, border: `1px solid ${COLORS.LIGHTEST}`, flex: 1, padding: screens.md ? '0' : '16px 0' }}>
        
        {screens.md ? (
          <Table 
            dataSource={filteredData} 
            rowKey="id" 
            loading={loading}
            pagination={{ pageSize: 12 }}
            rowClassName={(record) => !record.isActive ? 'inactive-row' : ''}
            columns={[
              { 
                title: 'Số Phòng', 
                dataIndex: 'roomNumber', 
                render: (text) => <Text strong style={{ color: COLORS.DARKEST, fontSize: 16 }}>{text}</Text>
              },
              { 
                title: 'Tầng', 
                dataIndex: 'floor', 
                align: 'center',
                render: (f) => <Tag color="blue" style={{ fontSize: 14 }}>Tầng {f}</Tag>
              },
              { 
                title: 'Trạng thái Hiện tại', 
                dataIndex: 'status', 
                align: 'center',
                render: (status) => {
                  const ui = STATUS_UI[status] || STATUS_UI.Available;
                  return <Tag color={ui.color} style={{ fontWeight: 600 }}>{ui.label}</Tag>
                }
              },
              { 
                title: 'Hành động', 
                key: 'action', 
                align: 'right',
                render: (_, record) => (
                  <Space size="small">
                    <Tooltip title={record.isActive ? "Cấu hình Vật tư & Chi tiết" : "Mở khóa để xem"}>
                      <Button 
                        type="primary" 
                        style={{ backgroundColor: record.isActive ? COLORS.MIDNIGHT_BLUE : COLORS.MUTED }} 
                        icon={<Gear size={18} />} 
                        onClick={() => navigate(`/admin/room-setup/room/${record.id}`)}
                        disabled={!record.isActive}
                      >
                        Cấu hình
                      </Button>
                    </Tooltip>
                    <Tooltip title={record.isActive ? "Sửa thông tin" : "Mở khóa để sửa"}>
                      <Button 
                        icon={<PencilSimple size={18} />} 
                        onClick={() => openModal(record)}
                        disabled={!record.isActive} 
                      />
                    </Tooltip>
                    <Tooltip title={record.isActive ? "Khóa (Tạm ngưng dùng)" : "Mở lại (Dùng phòng)"}>
                      <Button 
                        danger={record.isActive} 
                        type={!record.isActive ? "primary" : "default"}
                        style={{ backgroundColor: !record.isActive ? COLORS.DARKEST : '' }}
                        icon={record.isActive ? <LockKey size={18} /> : <LockOpen size={18} />} 
                        onClick={() => handleToggleStatus(record.id, record.isActive)}
                      />
                    </Tooltip>
                  </Space>
                )
              }
            ]}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 12px' }}>
            {filteredData.map(item => {
              const ui = STATUS_UI[item.status] || STATUS_UI.Available;
              return (
                <div 
                  key={item.id} 
                  style={{ 
                    background: item.isActive ? '#fff' : '#f5f5f5',
                    opacity: item.isActive ? 1 : 0.65,
                    border: `1px solid ${COLORS.LIGHTEST}`, 
                    borderRadius: 12, 
                    padding: 16, 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)' 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text strong style={{ fontSize: 18, color: COLORS.DARKEST }}>Phòng {item.roomNumber}</Text>
                    <Tag color={ui.color} style={{ fontWeight: 600, margin: 0 }}>{ui.label}</Tag>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <Tag color="blue">Tầng {item.floor}</Tag>
                    {!item.isActive && <Tag color="default">Đã bị khóa</Tag>}
                  </div>

                  <Row gutter={8}>
                    <Col span={10}>
                      <Button 
                        block 
                        type="primary" 
                        style={{ backgroundColor: item.isActive ? COLORS.MIDNIGHT_BLUE : COLORS.MUTED }}
                        icon={<Gear size={18} />} 
                        onClick={() => navigate(`/admin/room-setup/room/${item.id}`)}
                        disabled={!item.isActive} 
                      >
                        Cấu hình
                      </Button>
                    </Col>
                    <Col span={7}>
                      <Button block icon={<PencilSimple size={18} />} onClick={() => openModal(item)} disabled={!item.isActive}>
                        Sửa
                      </Button>
                    </Col>
                    <Col span={7}>
                      <Button 
                        block 
                        danger={item.isActive} 
                        type={!item.isActive ? "primary" : "default"}
                        style={{ backgroundColor: !item.isActive ? COLORS.DARKEST : '' }}
                        onClick={() => handleToggleStatus(item.id, item.isActive)}
                      >
                        {item.isActive ? 'Khóa' : 'Mở'}
                      </Button>
                    </Col>
                  </Row>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal 
        title={<span style={{color: COLORS.DARKEST, fontSize: 18}}>{editingRoom ? 'Sửa thông tin Phòng' : 'Thêm Phòng mới'}</span>} 
        open={isModalOpen} 
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form form={roomForm} layout="vertical" onFinish={handleSubmitRoom} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="roomNumber" label={<span style={{fontWeight: 600}}>Số Phòng (VD: 101)</span>} rules={[{ required: true }]}>
                <Input size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="floor" label={<span style={{fontWeight: 600}}>Tầng số</span>} rules={[{ required: true }]}>
                <InputNumber size="large" min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="status" label={<span style={{fontWeight: 600}}>Trạng thái hiện tại</span>}>
                <Select size="large" options={[
                  { value: 'Available', label: 'Trống (Sẵn sàng)' },
                  { value: 'Maintenance', label: 'Bảo trì (Đang sửa chữa)' },
                  { value: 'Occupied', label: 'Đang có khách (Khóa chỉnh sửa)', disabled: true },
                  { value: 'Reserved', label: 'Đã đặt trước (Khóa chỉnh sửa)', disabled: true }
                ]} />
              </Form.Item>
            </Col>
          </Row>

          <Button type="primary" htmlType="submit" size="large" block loading={loading} style={{ backgroundColor: COLORS.ACCENT_RED, fontWeight: 'bold', marginTop: 12 }}>
            {editingRoom ? 'LƯU THAY ĐỔI' : 'TẠO PHÒNG'}
          </Button>
        </Form>
      </Modal>
    </div>
  );
}