import React, { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Select, Button, Row, Col, Typography, notification, Popconfirm, Descriptions, Tag, Divider } from 'antd';
import { FloppyDisk, Trash, WarningCircle } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';

import { roomApi } from '../../../api/roomApi';
import { COLORS } from '../../../constants/theme';

const { Title, Text } = Typography;

export default function TabRoomBasicInfo({ room, onRefresh }) {
  const navigate = useNavigate();
  // 🔥 Ép thông báo của hành động này xuống góc dưới bên phải
  const [manualApi, contextHolder] = notification.useNotification({ placement: 'bottomRight' });
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (room) {
      form.setFieldsValue(room);
    }
  }, [room, form]);

  const handleUpdate = async (values) => {
    try {
      setLoading(true);
      const payload = {
        roomNumber: values.roomNumber,
        floor: values.floor,
        roomTypeId: room.roomTypeId, 
        status: values.status
      };
      
      await roomApi.updateRoom(room.id, payload);
      manualApi.success({ message: 'Thành công', description: 'Đã lưu thay đổi thông tin phòng.' });
      onRefresh(); 
    } catch (error) {
      manualApi.error({ message: 'Lỗi', description: error.response?.data?.message || 'Cập nhật thất bại.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await roomApi.deleteRoom(room.id);
      manualApi.success({ message: 'Đã khóa', description: 'Phòng này đã được ngưng sử dụng.' });
      navigate(-1); 
    } catch (error) {
      manualApi.error({ message: 'Lỗi', description: 'Không thể khóa phòng này.' });
      setLoading(false);
    }
  };

  return (
    <div style={{ paddingTop: 16 }}>
      {contextHolder}
      <Row gutter={[24, 24]}>
        
        {/* CỘT TRÁI: FORM CHỈNH SỬA (GIỮ NGUYÊN) */}
        <Col xs={24} lg={14}>
          <div style={{ background: COLORS.LIGHTEST, padding: 24, borderRadius: 12 }}>
            <Title level={5} style={{ color: COLORS.DARKEST, marginTop: 0, marginBottom: 20 }}>Chỉnh sửa Phòng</Title>
            
            <Form form={form} layout="vertical" onFinish={handleUpdate}>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="roomNumber" label={<span style={{fontWeight: 600}}>Số Phòng</span>} rules={[{ required: true }]}>
                    <Input size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="floor" label={<span style={{fontWeight: 600}}>Tầng số</span>} rules={[{ required: true }]}>
                    <InputNumber size="large" min={1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="status" label={<span style={{fontWeight: 600}}>Trạng thái vật lý</span>} rules={[{ required: true }]}>
                    <Select size="large" options={[
                      { value: 'Available', label: 'Trống (Sẵn sàng phục vụ)' },
                      { value: 'Maintenance', label: 'Đang bảo trì / Sửa chữa' },
                      { value: 'Occupied', label: 'Đang có khách (Khóa chỉnh sửa)', disabled: true },
                      { value: 'Reserved', label: 'Đã đặt trước (Khóa chỉnh sửa)', disabled: true }
                    ]} />
                  </Form.Item>
                </Col>
              </Row>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <Popconfirm 
                  title="Khóa phòng này?" 
                  description="Phòng sẽ bị ẩn khỏi danh sách kinh doanh." 
                  onConfirm={handleDelete}
                  okText="Khóa ngay" cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger type="text" icon={<Trash />} disabled={!room?.isActive}>Khóa Phòng</Button>
                </Popconfirm>

                <Button type="primary" htmlType="submit" size="large" loading={loading} icon={<FloppyDisk />} style={{ backgroundColor: COLORS.MIDNIGHT_BLUE, fontWeight: 'bold' }}>
                  LƯU THAY ĐỔI
                </Button>
              </div>
            </Form>
          </div>
        </Col>

        {/* CỘT PHẢI: THÔNG TIN TỪ HẠNG PHÒNG (ĐÃ BỔ SUNG GIÁ TIỀN) */}
        <Col xs={24} lg={10}>
          <div style={{ border: `1px solid ${COLORS.LIGHTEST}`, padding: 24, borderRadius: 12, height: '100%' }}>
            <Title level={5} style={{ color: COLORS.DARKEST, marginTop: 0, marginBottom: 20 }}>Thuộc tính Hạng phòng</Title>
            <div style={{ background: '#fffbe6', padding: 12, borderRadius: 8, border: '1px solid #ffe58f', marginBottom: 24 }}>
              <Text type="warning" style={{ fontSize: 13 }}><WarningCircle style={{marginRight: 6}}/>Các thông tin dưới đây được kế thừa từ Hạng phòng. Cần ra trang Quản lý Hạng phòng để sửa.</Text>
            </div>

            <Descriptions column={1} size="small" styles={{ label: { fontWeight: 600, color: COLORS.MUTED, width: '110px' }, content: { fontWeight: 'bold', color: COLORS.DARKEST } }}>
              <Descriptions.Item label="Hạng phòng"><Tag color="cyan" style={{ fontSize: 14, margin: 0 }}>{room?.roomTypeName}</Tag></Descriptions.Item>
              
              {/* 🔥 THÊM 2 DÒNG GIÁ TIỀN VÀO ĐÂY */}
              <Descriptions.Item label="Giá qua đêm">
                <Text strong style={{ color: COLORS.ACCENT_RED, fontSize: 14 }}>
                  {new Intl.NumberFormat('vi-VN').format(room?.basePrice || 0)} ₫
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Giá theo giờ">
                <Text strong style={{ color: COLORS.ACCENT_RED, fontSize: 14 }}>
                  {new Intl.NumberFormat('vi-VN').format(room?.pricePerHour || 0)} ₫
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Sức chứa">{room?.capacityAdults} Lớn, {room?.capacityChildren} Nhỏ</Descriptions.Item>
              <Descriptions.Item label="Loại giường">{room?.bedType || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Diện tích">{room?.sizeSqm ? `${room.sizeSqm} m²` : 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Hướng nhìn">{room?.viewDirection || 'N/A'}</Descriptions.Item>
            </Descriptions>
          </div>
        </Col>

      </Row>
    </div>
  );
}