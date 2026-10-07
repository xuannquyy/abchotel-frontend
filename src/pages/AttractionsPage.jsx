import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Tag, Modal, Form, Input, notification, Tooltip, Popconfirm, Row, Col, InputNumber, Grid, Divider } from 'antd';
import { Plus, PencilSimple, MapPin, Compass, MapTrifold, MagnifyingGlass, Trash } from '@phosphor-icons/react';
import { attractionApi } from '../api/attractionApi';

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;
const ACCENT_RED = '#8A1538';
const MIDNIGHT_BLUE = '#1C2E4A';

export default function AttractionsPage() {
  const [api, contextHolder] = notification.useNotification({ placement: 'bottomRight' });
  const screens = useBreakpoint();

  const [searchText, setSearchText] = useState('');
  const [attractions, setAttractions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAttraction, setEditingAttraction] = useState(null);
  const [form] = Form.useForm();

  // THEO DÕI SỰ THAY ĐỔI CỦA Ô NHẬP LINK ĐỂ HIỂN THỊ PREVIEW BẢN ĐỒ
  const mapLink = Form.useWatch('mapEmbedLink', form);

  const fetchAttractions = async () => {
    try {
      setLoading(true);
      const res = await attractionApi.getAttractions(false); 
      setAttractions(res || []);
    } catch (error) {
      api.error({ message: 'Lỗi tải danh sách điểm đến' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttractions();
  }, []);

  const openModal = (attraction = null) => {
    setEditingAttraction(attraction);
    if (attraction) {
      form.setFieldsValue(attraction);
    } else {
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const onFinish = async (values) => {
    try {
      setLoading(true);
      if (editingAttraction) {
        await attractionApi.updateAttraction(editingAttraction.id, values);
        api.success({ message: 'Cập nhật điểm đến thành công!' });
      } else {
        await attractionApi.createAttraction(values);
        api.success({ message: 'Thêm điểm đến mới thành công!' });
      }
      setIsModalOpen(false);
      fetchAttractions();
    } catch (error) {
      api.error({ message: error.response?.data?.message || 'Có lỗi xảy ra' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAttraction = async (id) => {
    try {
      setLoading(true);
      await attractionApi.deleteAttraction(id);
      api.success({ message: `Đã xóa địa điểm thành công!` });
      fetchAttractions();
    } catch (error) {
      api.error({ message: 'Không thể xóa địa điểm này' });
    } finally {
      setLoading(false);
    }
  };

  const displayedAttractions = attractions.filter(item => 
    item.name.toLowerCase().includes(searchText.toLowerCase()) || 
    (item.address && item.address.toLowerCase().includes(searchText.toLowerCase()))
  );

  const columns = [
    {
      title: 'Tên Địa Điểm', dataIndex: 'name', key: 'name', width: 250,
      render: (text, record) => (
        <Space>
          <div style={{ width: 36, height: 36, backgroundColor: '#e9f0f8', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MapPin size={20} color={ACCENT_RED} weight="fill" />
          </div>
          <Text style={{ fontWeight: 600, color: MIDNIGHT_BLUE, fontSize: 15 }}>{text}</Text>
        </Space>
      )
    },
    {
      title: 'Khoảng cách', dataIndex: 'distanceKm', key: 'distanceKm', width: 120, align: 'center',
      render: (km) => <Tag color="blue" style={{ borderRadius: 12, padding: '2px 10px', fontSize: 13 }}>{km} km</Tag>
    },
    {
      title: 'Địa chỉ', dataIndex: 'address', key: 'address',
      render: (address) => <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0, color: '#52677D' }}>{address || 'Chưa cập nhật'}</Paragraph>
    },
    {
      title: 'Thao tác', key: 'actions', width: 120, align: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Sửa thông tin">
            <Button type="text" icon={<PencilSimple size={20} color="#52677D" />} onClick={() => openModal(record)} />
          </Tooltip>
          <Tooltip title="Xóa địa điểm">
            <Popconfirm 
              title="Bạn có chắc muốn xóa địa điểm này?" 
              onConfirm={() => handleDeleteAttraction(record.id)} 
              okText="Xóa" cancelText="Hủy" placement="topRight"
            >
              <Button type="text" danger icon={<Trash size={20} />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div>
      {contextHolder}
      <Title level={3} style={{ color: MIDNIGHT_BLUE, fontFamily: '"Source Serif 4", serif', marginBottom: 24 }}>Quản lý Điểm Du Lịch</Title>

      <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', padding: screens.md ? 0 : '16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20, padding: screens.md ? 0 : '0 16px' }}>
          <Space direction="vertical" size="small" style={{ width: screens.xs ? '100%' : 'auto' }}>
            <Text style={{ color: '#52677D', fontSize: 15 }}>
              Quản lý các địa điểm lân cận, khu vui chơi, nhà hàng để giới thiệu cho khách lưu trú.
            </Text>
            <Input 
              placeholder="Tìm kiếm tên hoặc địa chỉ..." 
              allowClear 
              size="large"
              prefix={<MagnifyingGlass color="#7D92AD" />}
              style={{ width: screens.xs ? '100%' : 300, marginTop: 8 }}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Space>

          <Button 
            type="primary" 
            size="large" 
            icon={<Plus size={18} />} 
            onClick={() => openModal()} 
            style={{ backgroundColor: ACCENT_RED, borderRadius: 8, fontWeight: 'bold', width: screens.xs ? '100%' : 'auto' }}
          >
            THÊM ĐIỂM ĐẾN
          </Button>
        </div>

        {screens.md ? (
          <Table 
            columns={columns} 
            dataSource={displayedAttractions} 
            rowKey="id" 
            loading={loading}
            pagination={{ pageSize: 10 }}
            rowClassName={(record, index) => index % 2 === 0 ? 'table-row-light' : 'table-row-dark'}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px' }}>
            {displayedAttractions.map(item => (
              <div key={item.id} style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 16, backgroundColor: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Space align="start">
                    <div style={{ width: 36, height: 36, backgroundColor: '#e9f0f8', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MapPin size={20} color={ACCENT_RED} weight="fill" />
                    </div>
                    <div>
                      <Text strong style={{ fontSize: 16, color: MIDNIGHT_BLUE, display: 'block' }}>{item.name}</Text>
                      <Tag color="blue" style={{ marginTop: 4 }}>Cách {item.distanceKm} km</Tag>
                    </div>
                  </Space>
                </div>
                
                <div style={{ marginTop: 12 }}>
                  <Paragraph ellipsis={{ rows: 2 }} style={{ color: '#52677D', margin: 0 }}>{item.address || 'Chưa có địa chỉ'}</Paragraph>
                </div>

                <Divider style={{ margin: '12px 0' }} />
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <Button size="small" icon={<PencilSimple />} onClick={() => openModal(item)}>Sửa</Button>
                  <Popconfirm title="Xóa địa điểm này?" onConfirm={() => handleDeleteAttraction(item.id)} okText="Xóa" cancelText="Hủy">
                    <Button size="small" danger icon={<Trash />}>Xóa</Button>
                  </Popconfirm>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal 
        title={<Space><Compass size={24} color={ACCENT_RED}/><Title level={4} style={{ color: MIDNIGHT_BLUE, margin: 0 }}>{editingAttraction ? 'Sửa Thông Tin Địa Điểm' : 'Thêm Địa Điểm Mới'}</Title></Space>} 
        open={isModalOpen} 
        onCancel={() => setIsModalOpen(false)} 
        footer={null} 
        width={800}
        centered
      >
        <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 20 }}>
          <Row gutter={16}>
            <Col xs={24} md={18}>
              <Form.Item name="name" label="Tên địa điểm" rules={[{ required: true, message: 'Vui lòng nhập tên địa điểm' }]}>
                <Input size="large" placeholder="VD: Bãi biển Mỹ Khê, Vinpearl Land..." />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="distanceKm" label="Cách KS (km)">
                <InputNumber size="large" style={{ width: '100%' }} min={0} step={0.1} placeholder="VD: 2.5" />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item name="address" label="Địa chỉ chi tiết">
                <Input size="large" prefix={<MapTrifold color="#bfbfbf" />} placeholder="Nhập địa chỉ cụ thể..." />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item name="description" label="Mô tả ngắn gọn">
                <Input.TextArea rows={3} placeholder="Giới thiệu vài nét nổi bật về địa điểm này để thu hút du khách..." />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ backgroundColor: '#f9fbfd', padding: '20px', borderRadius: 8, marginBottom: 24, border: '1px solid #e9f0f8' }}>
            <Text strong style={{ color: MIDNIGHT_BLUE, display: 'block', marginBottom: 12 }}>Bản đồ Google Maps (Khuyên dùng)</Text>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="mapEmbedLink" label="Đường dẫn nhúng (Embed Link) iframe" help="Lên Google Maps > Tìm điểm đến > Chia sẻ > Nhúng bản đồ > Copy đoạn link bên trong thuộc tính src='...'">
                  <Input size="large" placeholder='VD: https://www.google.com/maps/embed?pb=...' />
                </Form.Item>
                
                {/* TÍNH NĂNG PREVIEW BẢN ĐỒ TỰ ĐỘNG */}
                {mapLink && mapLink.includes('http') && (
                  <div style={{ marginTop: 12, borderRadius: 8, overflow: 'hidden', border: '1px solid #d9d9d9', height: 250 }}>
                    <iframe src={mapLink} width="100%" height="100%" style={{ border: 0 }} allowFullScreen="" loading="lazy" referrerPolicy="no-referrer"></iframe>
                  </div>
                )}
              </Col>
              
              <Col span={24} style={{ marginTop: 16 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>* Tọa độ Latitude/Longitude bên dưới có thể để trống (Dành cho việc mở rộng tính năng API sau này).</Text>
              </Col>
              <Col xs={24} md={12} style={{ marginTop: 8 }}>
                <Form.Item name="latitude" label="Vĩ độ (Latitude)">
                  <InputNumber style={{ width: '100%' }} placeholder="VD: 16.0544" step={0.000001} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12} style={{ marginTop: 8 }}>
                <Form.Item name="longitude" label="Kinh độ (Longitude)">
                  <InputNumber style={{ width: '100%' }} placeholder="VD: 108.2022" step={0.000001} />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div style={{ textAlign: 'right' }}>
            <Space style={{ width: screens.xs ? '100%' : 'auto', justifyContent: screens.xs ? 'flex-end' : 'flex-start' }}>
              <Button size="large" onClick={() => setIsModalOpen(false)}>Hủy</Button>
              <Button size="large" type="primary" htmlType="submit" loading={loading} style={{ backgroundColor: ACCENT_RED }}>
                {editingAttraction ? 'Lưu Thay Đổi' : 'Thêm Địa Điểm'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      <style>{`
        .ant-table-thead > tr > th { background-color: #e9f0f8 !important; color: #1C2E4A !important; font-weight: 700 !important; }
        .table-row-light { background-color: #ffffff; }
        .table-row-dark { background-color: #fcfcfc; }
        .ant-table-tbody > tr:hover > td { background-color: #f0f4f8 !important; }
      `}</style>
    </div>
  );
}