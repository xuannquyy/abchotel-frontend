import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, Tag, Modal, Form, Input, notification, Tooltip, Row, Col, Dropdown, Upload, Image } from 'antd';
import { Plus, WifiHigh, PencilSimple, Trash, UploadSimple, MagnifyingGlass, Gear, LockKey, LockOpen } from '@phosphor-icons/react';
import { amenityApi } from '../api/amenityApi';
import { mediaApi } from '../api/mediaApi';

const { Title, Text } = Typography;

// 🎨 BẢNG MÀU
const ACCENT_RED = '#8A1538';
const PALETTE = {
  darkest: '#0D1821',
  dark: '#344966',
  muted: '#7D92AD',
  light: '#B4CDED',
  lightest: '#E9F0F8',
  locked: '#1f2937' // Xám than chì khi bị khóa
};

export default function AmenitiesPage() {
  const [searchText, setSearchText] = useState('');
  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState(null);
  const [form] = Form.useForm();
  
  // State lưu tạm ảnh được up lên Cloudinary trước khi Form submit
  const [tempIconUrl, setTempIconUrl] = useState('');

  const fetchAmenities = async () => {
    try {
      setLoading(true);
      const res = await amenityApi.getAmenities(false); // Lấy cả tiện ích bị ẩn
      setAmenities(res || []);
    } catch (error) {
      notification.error({ message: 'Lỗi tải danh sách tiện ích', placement: 'bottomRight' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAmenities();
  }, []);

  const openModal = (amenity = null) => {
    setEditingAmenity(amenity);
    if (amenity) {
      form.setFieldsValue(amenity);
      setTempIconUrl(amenity.iconUrl || '');
    } else {
      form.resetFields();
      setTempIconUrl('');
    }
    setIsModalOpen(true);
  };

  const onFinish = async (values) => {
    try {
      setLoading(true);
      // Gắn thêm ảnh vào payload
      const payload = { ...values, iconUrl: tempIconUrl };

      if (editingAmenity) {
        await amenityApi.updateAmenity(editingAmenity.id, payload);
        notification.success({ message: 'Cập nhật tiện ích thành công!', placement: 'bottomRight' });
      } else {
        await amenityApi.createAmenity(payload);
        notification.success({ message: 'Tạo tiện ích mới thành công!', placement: 'bottomRight' });
      }
      setIsModalOpen(false);
      fetchAmenities();
    } catch (error) {
      notification.error({ message: error.response?.data?.message || 'Lỗi xử lý tiện ích', placement: 'bottomRight' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLock = async (id, currentStatus) => {
    try {
      await amenityApi.deleteAmenity(id);
      notification.success({ message: `Đã ${currentStatus ? 'khóa' : 'mở khóa'} tiện ích thành công!`, placement: 'bottomRight' });
      fetchAmenities();
    } catch (error) {
      notification.error({ message: 'Lỗi khóa/mở tiện ích', placement: 'bottomRight' });
    }
  };

  const handleUploadIcon = async (options) => {
    const { file, onSuccess, onError } = options;
    try {
      setLoading(true);
      const uploadRes = await mediaApi.uploadImage(file);
      setTempIconUrl(uploadRes.data.url);
      notification.success({ message: 'Tải ảnh lên thành công!', placement: 'bottomRight' });
      onSuccess("ok");
    } catch (error) {
      notification.error({ message: 'Lỗi tải ảnh lên', placement: 'bottomRight' });
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  const displayedAmenities = amenities.filter(a => 
    a.name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div>
      <Title level={3} style={{ color: PALETTE.darkest, fontFamily: '"Source Serif 4", serif', marginBottom: 24 }}>Quản lý Tiện Ích Phòng</Title>

      <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <Space direction="vertical" size="small">
            <Input 
              placeholder="Tìm kiếm tiện ích..." 
              allowClear 
              size="large"
              prefix={<MagnifyingGlass color={PALETTE.muted} />}
              style={{ width: 250, marginTop: 8 }}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Space>

          <Button type="primary" size="large" icon={<Plus size={18} />} onClick={() => openModal(null)} style={{ backgroundColor: ACCENT_RED, fontWeight: 'bold' }}>
            TẠO TIỆN ÍCH MỚI
          </Button>
        </div>
      </Card>

      {/* SƠ ĐỒ LƯỚI CARD TIỆN ÍCH */}
      <Row gutter={[16, 16]}>
        {displayedAmenities.map(amenity => (
          <Col xs={12} sm={8} md={6} lg={4} xl={3} key={amenity.id}>
            <Card 
              hoverable
              styles={{ body: { padding: '20px 10px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' } }}
              style={{ 
                borderRadius: 12, 
                backgroundColor: amenity.isActive ? '#fff' : PALETTE.locked,
                opacity: amenity.isActive ? 1 : 0.6,
                border: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                position: 'relative'
              }}
            >
              {/* NÚT QUẢN LÝ (CỜ LÊ) GÓC TRÊN PHẢI */}
              <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}>
                <Dropdown 
                  menu={{ 
                    items: [
                      { key: 'edit', label: 'Sửa thông tin', icon: <PencilSimple size={16}/>, onClick: () => openModal(amenity) },
                      { 
                        key: 'lock', 
                        label: amenity.isActive ? <Text type="danger">Khóa (Ẩn)</Text> : <Text type="success">Mở khóa</Text>, 
                        icon: amenity.isActive ? <LockKey color="#ff4d4f" size={16}/> : <LockOpen color="#52c41a" size={16}/>,
                        onClick: () => handleToggleLock(amenity.id, amenity.isActive) 
                      },
                    ] 
                  }} 
                  trigger={['click']}
                >
                  <Gear size={18} color={amenity.isActive ? PALETTE.muted : '#fff'} weight="fill" style={{ cursor: 'pointer' }} />
                </Dropdown>
              </div>

              {/* KHU VỰC ICON */}
              <div style={{ width: 48, height: 48, backgroundColor: amenity.isActive ? PALETTE.lightest : '#374151', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                {amenity.iconUrl ? (
                  <img src={amenity.iconUrl} alt={amenity.name} style={{ width: 24, height: 24, objectFit: 'contain', filter: !amenity.isActive ? 'grayscale(100%) brightness(200%)' : 'none' }} />
                ) : (
                  <WifiHigh size={24} color={amenity.isActive ? PALETTE.dark : '#9ca3af'} />
                )}
              </div>

              <Text strong style={{ fontSize: 14, color: amenity.isActive ? PALETTE.darkest : '#fff' }}>
                {amenity.name}
              </Text>
              {!amenity.isActive && <Tag color="error" style={{ border: 'none', marginTop: 8, fontSize: 10, padding: '0 4px' }}>BỊ KHÓA</Tag>}
            </Card>
          </Col>
        ))}
      </Row>

      {/* MODAL TẠO/SỬA TIỆN ÍCH */}
      <Modal 
        title={<Space><WifiHigh size={24} color={ACCENT_RED}/><Title level={4} style={{ color: PALETTE.darkest, margin: 0 }}>{editingAmenity ? 'Sửa Tiện Ích' : 'Tạo Tiện Ích'}</Title></Space>} 
        open={isModalOpen} 
        onCancel={() => setIsModalOpen(false)} 
        footer={null} 
        centered
        width={450}
      >
        <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 20 }}>
          <Form.Item name="name" label="Tên tiện ích" rules={[{ required: true, message: 'Vui lòng nhập tên tiện ích' }]}>
            <Input size="large" placeholder="VD: Bồn tắm, Wifi miễn phí..." />
          </Form.Item>

          <div style={{ textAlign: 'center', padding: '20px 0', backgroundColor: '#f9fbfd', borderRadius: 8, border: '1px dashed #d9d9d9', marginBottom: 24 }}>
            <Text strong style={{ display: 'block', marginBottom: 12, color: PALETTE.dark }}>Icon Tiện Ích (Tùy chọn)</Text>
            
            {tempIconUrl ? (
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
                <img src={tempIconUrl} alt="Preview" style={{ width: 64, height: 64, objectFit: 'contain', backgroundColor: '#fff', padding: 8, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                <Button size="small" danger icon={<Trash />} onClick={() => setTempIconUrl('')} style={{ position: 'absolute', top: -10, right: -30 }} shape="circle" />
              </div>
            ) : (
              <div style={{ width: 64, height: 64, backgroundColor: '#fff', borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <WifiHigh size={32} color="#bfbfbf" />
              </div>
            )}

            <div style={{ display: 'block' }}>
              <Upload customRequest={handleUploadIcon} showUploadList={false} accept="image/*">
                <Button icon={<UploadSimple size={16} />} loading={loading}>
                  {tempIconUrl ? 'Đổi Icon Khác' : 'Tải Icon Lên'}
                </Button>
              </Upload>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button size="large" onClick={() => setIsModalOpen(false)}>Hủy</Button>
              <Button size="large" type="primary" htmlType="submit" loading={loading} style={{ backgroundColor: ACCENT_RED }}>
                {editingAmenity ? 'Lưu Thay Đổi' : 'Lưu Tiện Ích'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

    </div>
  );
}