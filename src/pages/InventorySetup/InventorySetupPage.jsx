import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Input, Select, Table, Tag, Modal, Form, InputNumber, Row, Col, notification, Space, Tooltip, Grid, Divider, Upload, Image } from 'antd';
import { MagnifyingGlass, Plus, PencilSimple, LockKey, LockOpen, Package, ImageSquare, UploadSimple, Trash, ArrowLeft } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';

import { equipmentApi } from '../../api/equipmentApi';
import { mediaApi } from '../../api/mediaApi'; 
import { COLORS } from '../../constants/theme';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function InventorySetupPage() {
  const navigate = useNavigate();
  // 🔥 1 Context duy nhất góc dưới phải
  const [api, contextHolder] = notification.useNotification({ placement: 'bottomRight' });
  const screens = useBreakpoint();

  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  
  const [filter, setFilter] = useState({
    search: '', category: undefined, isActive: undefined, page: 1, pageSize: 10
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();
  const [imageUrl, setImageUrl] = useState(null);

  const categoryOptions = [
    { value: 'Điện tử', label: 'Điện tử' },
    { value: 'Nội thất', label: 'Nội thất' },
    { value: 'Minibar', label: 'Minibar' },
    { value: 'Đồ vải', label: 'Đồ vải' },
    { value: 'Tiêu hao', label: 'Tiêu hao (Đồ dùng 1 lần)' },
  ];

  const fetchEquipments = async () => {
    try {
      setLoading(true);
      const res = await equipmentApi.getEquipments({
        Search: filter.search, Category: filter.category, IsActive: filter.isActive, Page: filter.page, PageSize: filter.pageSize
      });
      setEquipments(res.items || []);
      setTotalItems(res.total || 0);
    } catch (error) {
      api.error({ message: 'Lỗi', description: 'Không thể tải danh sách vật tư.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEquipments(); }, [filter]);

  const handleFilterChange = (key, value) => setFilter(prev => ({ ...prev, [key]: value, page: 1 }));

  const handleOpenModal = (record = null) => {
    setEditingItem(record);
    if (record) {
      form.setFieldsValue(record);
      setImageUrl(record.imageUrl); 
    } else {
      form.resetFields();
      form.setFieldsValue({ totalQuantity: 1, basePrice: 0, defaultPriceIfLost: 0, unit: 'Cái', category: 'Điện tử' }); 
      setImageUrl(null); 
    }
    setIsModalOpen(true);
  };

  const handleUploadImage = async (options) => {
    const { file, onSuccess, onError } = options;
    try {
      setLoading(true);
      const uploadRes = await mediaApi.uploadImage(file);
      const newUrl = uploadRes.data?.url || uploadRes.url || uploadRes;
      setImageUrl(newUrl); 
      onSuccess("ok");
      api.success({ message: 'Thành công', description: 'Tải ảnh lên thành công.' });
    } catch (error) {
      api.error({ message: 'Lỗi', description: 'Tải ảnh thất bại.' });
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values) => {
    try {
      setLoading(true);
      const payload = { 
          name: values.name, category: values.category, unit: values.unit, totalQuantity: values.totalQuantity,
          basePrice: values.basePrice || 0, defaultPriceIfLost: values.defaultPriceIfLost || 0, supplier: values.supplier || "", imageUrl: imageUrl || ""
      };

      if (editingItem) {
        payload.inUseQuantity = values.inUseQuantity;
        payload.damagedQuantity = values.damagedQuantity;
        payload.liquidatedQuantity = values.liquidatedQuantity;
        await equipmentApi.update(editingItem.id, payload);
        api.success({ message: 'Thành công', description: 'Đã cập nhật thông tin vật tư!' });
      } else {
        await equipmentApi.create(payload);
        api.success({ message: 'Thành công', description: 'Đã tạo vật tư mới!' });
      }
      setIsModalOpen(false);
      fetchEquipments();
    } catch (error) {
      api.error({ message: 'Lỗi', description: error.response?.data?.message || 'Có lỗi xảy ra.' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      setLoading(true);
      await equipmentApi.delete(id);
      api.success({ message: 'Thành công', description: `Đã ${currentStatus ? 'khóa' : 'mở lại'} vật tư.` });
      fetchEquipments();
    } catch (error) {
      api.error({ message: 'Lỗi', description: 'Không thể đổi trạng thái.' });
    } finally {
      setLoading(false);
    }
  };

  const sortedEquipments = [...equipments].sort((a, b) => {
    if (a.isActive === b.isActive) return 0;
    return a.isActive ? -1 : 1; 
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: 24 }}>
      {contextHolder}
      
      <style>{`.inactive-row { opacity: 0.65; background-color: #fafafa; } .inactive-row:hover { opacity: 0.85 !important; }`}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={3} style={{ color: COLORS.MIDNIGHT_BLUE, margin: '0 0 8px 0', fontFamily: '"Source Serif 4", serif' }}>
            <Package size={28} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Quản lý Kho Vật Tư
          </Title>
          <Text type="secondary">Quản lý danh mục, số lượng, hình ảnh và giá đền bù của các trang thiết bị.</Text>
        </div>
        <Space>
            <Button size="large" icon={<ArrowLeft />} onClick={() => navigate(-1)}>Trở lại</Button>
            <Button type="primary" size="large" icon={<Plus weight="bold" />} style={{ backgroundColor: COLORS.MIDNIGHT_BLUE, fontWeight: 'bold', borderRadius: 8 }} onClick={() => handleOpenModal()}>
            THÊM VẬT TƯ MỚI
            </Button>
        </Space>
      </div>

      <Card variant="borderless" style={{ borderRadius: 12, marginBottom: 24, backgroundColor: COLORS.LIGHTEST }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Input placeholder="Tìm tên hoặc mã vật tư..." size="large" allowClear prefix={<MagnifyingGlass color={COLORS.MUTED} />} value={filter.search} onChange={(e) => handleFilterChange('search', e.target.value)} />
          </Col>
          <Col xs={12} md={8}>
            <Select size="large" style={{ width: '100%' }} placeholder="Lọc theo Danh mục" allowClear value={filter.category} onChange={(val) => handleFilterChange('category', val)} options={categoryOptions} />
          </Col>
          <Col xs={12} md={8}>
            <Select size="large" style={{ width: '100%' }} placeholder="Trạng thái" allowClear value={filter.isActive} onChange={(val) => handleFilterChange('isActive', val)} options={[{ value: true, label: 'Đang lưu hành' }, { value: false, label: 'Đã khóa/Ngừng dùng' }]} />
          </Col>
        </Row>
      </Card>

      <Card variant="borderless" style={{ borderRadius: 12, border: `1px solid ${COLORS.LIGHTEST}`, flex: 1, padding: screens.md ? '0' : '16px 0' }}>
        {screens.md ? (
          <Table 
            dataSource={sortedEquipments} rowKey="id" loading={loading} scroll={{ x: 1100 }} 
            pagination={{ current: filter.page, pageSize: filter.pageSize, total: totalItems, showSizeChanger: true, onChange: (page, pageSize) => setFilter(prev => ({ ...prev, page, pageSize })) }}
            rowClassName={(record) => !record.isActive ? 'inactive-row' : ''} 
            columns={[
              { title: 'Ảnh', dataIndex: 'imageUrl', width: 80, align: 'center', render: url => url ? <Image src={url} width={50} height={50} style={{objectFit: 'cover', borderRadius: 4, border: '1px solid #f0f0f0'}} /> : <div style={{width: 50, height: 50, background: '#f5f5f5', borderRadius: 4, border: '1px dashed #d9d9d9', display: 'flex', alignItems:'center', justifyContent:'center'}}><ImageSquare color="#bfbfbf" size={20}/></div> },
              { title: 'Mã & Tên Vật Tư', dataIndex: 'name', width: 250, render: (text, record) => (<div><Text strong style={{ color: record.isActive ? COLORS.DARKEST : COLORS.MUTED, fontSize: 15, display: 'block' }}>{text}</Text><Text type="secondary" style={{ fontSize: 12 }}>Mã: {record.itemCode}</Text></div>) },
              { title: 'Phân loại', dataIndex: 'category', render: (cat) => <Tag color="geekblue">{cat}</Tag> },
              { title: 'Kho / Bố trí', key: 'stock', align: 'center', render: (_, record) => (<Space direction="vertical" size={0}><Tooltip title="Tổng số lượng nhập kho"><Tag color="default" style={{ width: '100%', marginBottom: 4 }}>Tổng: <b>{record.totalQuantity}</b></Tag></Tooltip><Tooltip title="Đang đặt trong các phòng"><Tag color="processing" style={{ width: '100%' }}>Bố trí: <b>{record.inUseQuantity}</b></Tag></Tooltip></Space>) },
              { title: 'Tồn kho', dataIndex: 'inStockQuantity', align: 'center', render: (stock) => <Tag color={stock > 0 ? "success" : "error"} style={{ fontWeight: 'bold', fontSize: 14 }}>{stock}</Tag> },
              { title: 'Giá đền bù', dataIndex: 'defaultPriceIfLost', align: 'right', render: (price) => <Text strong style={{ color: COLORS.ACCENT_RED }}>{new Intl.NumberFormat('vi-VN').format(price || 0)} đ</Text> },
              { title: 'Hành động', key: 'action', align: 'right', render: (_, record) => (<Space size="small"><Tooltip title={record.isActive ? "Sửa thông tin / Cập nhật kho" : "Mở khóa để sửa"}><Button icon={<PencilSimple size={18} />} onClick={() => handleOpenModal(record)} disabled={!record.isActive} /></Tooltip><Tooltip title={record.isActive ? "Khóa vật tư" : "Mở lại vật tư"}><Button danger={record.isActive} type={!record.isActive ? "primary" : "default"} style={{ backgroundColor: !record.isActive ? COLORS.DARKEST : '' }} icon={record.isActive ? <LockKey size={18} /> : <LockOpen size={18} />} onClick={() => handleToggleStatus(record.id, record.isActive)} /></Tooltip></Space>) }
            ]}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 12px' }}>
            {sortedEquipments.map(item => (
              <div key={item.id} style={{ background: item.isActive ? '#fff' : '#f5f5f5', opacity: item.isActive ? 1 : 0.65, border: `1px solid ${COLORS.LIGHTEST}`, borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  {item.imageUrl ? <Image src={item.imageUrl} width={60} height={60} style={{objectFit: 'cover', borderRadius: 8, border: '1px solid #f0f0f0'}} /> : <div style={{width: 60, height: 60, background: '#f5f5f5', borderRadius: 8, border: '1px dashed #d9d9d9', display: 'flex', alignItems:'center', justifyContent:'center'}}><ImageSquare color="#bfbfbf" size={24}/></div>}
                  <div style={{ flex: 1 }}>
                    <Text strong style={{ fontSize: 16, color: COLORS.DARKEST, display: 'block' }}>{item.name}</Text>
                    <Text type="secondary" style={{ fontSize: 13 }}>Mã: {item.itemCode}</Text>
                    <div style={{ marginTop: 4 }}><Tag color={item.inStockQuantity > 0 ? "success" : "error"} style={{ fontWeight: 'bold', margin: 0 }}>Tồn: {item.inStockQuantity}</Tag></div>
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <Text style={{ color: COLORS.ACCENT_RED, fontWeight: 600, display: 'block' }}>Đền bù: {new Intl.NumberFormat('vi-VN').format(item.defaultPriceIfLost || 0)} đ</Text>
                  <Text type="secondary" style={{ fontSize: 13 }}>Tổng nhập: {item.totalQuantity} | Đang dùng: {item.inUseQuantity}</Text>
                </div>
                <Row gutter={8}>
                  <Col span={12}><Button block icon={<PencilSimple size={18} />} onClick={() => handleOpenModal(item)} disabled={!item.isActive}>Sửa Info</Button></Col>
                  <Col span={12}><Button block danger={item.isActive} type={!item.isActive ? "primary" : "default"} style={{ backgroundColor: !item.isActive ? COLORS.DARKEST : '' }} onClick={() => handleToggleStatus(item.id, item.isActive)}>{item.isActive ? 'Khóa' : 'Mở lại'}</Button></Col>
                </Row>
              </div>
            ))}
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Button disabled={filter.page === 1} onClick={() => setFilter(p => ({ ...p, page: p.page - 1 }))} style={{ marginRight: 8 }}>Trước</Button><Text>Trang {filter.page}</Text><Button disabled={filter.page * filter.pageSize >= totalItems} onClick={() => setFilter(p => ({ ...p, page: p.page + 1 }))} style={{ marginLeft: 8 }}>Sau</Button>
            </div>
          </div>
        )}
      </Card>

      <Modal title={<span style={{color: COLORS.DARKEST, fontSize: 18}}>{editingItem ? 'Sửa Thông Tin / Kho' : 'Nhập Vật Tư Mới'}</span>} open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null} width={700}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Row gutter={16}>
            <Col xs={24} md={24}><Form.Item name="name" label={<span style={{fontWeight: 600}}>Tên Vật Tư</span>} rules={[{ required: true }]}><Input size="large" placeholder="VD: Tivi Samsung 55 inch..." /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="itemCode" label={<span style={{fontWeight: 600}}>Mã Item</span>} tooltip="Bạn có thể tự đặt mã (VD: TV-SS-55). Nếu để trống, hệ thống sẽ tự tạo mã cho bạn."><Input size="large" placeholder="Bỏ trống để tự tạo" disabled={!!editingItem} /></Form.Item></Col>
            <Col xs={12}><Form.Item name="category" label={<span style={{fontWeight: 600}}>Danh mục</span>} rules={[{ required: true }]}><Select size="large" options={categoryOptions} placeholder="Chọn..." /></Form.Item></Col>
            <Col xs={12}><Form.Item name="unit" label={<span style={{fontWeight: 600}}>Đơn vị tính</span>} rules={[{ required: true }]}><Select size="large" options={[{value: 'Cái'}, {value: 'Chiếc'}, {value: 'Bộ'}, {value: 'Chai'}, {value: 'Lon'}]} placeholder="Chọn..."/></Form.Item></Col>
            
            <Divider style={{ margin: '12px 0' }} />

            <Col xs={24} style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Ảnh đại diện vật tư</Text>
              {imageUrl ? (
                <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: 8, background: '#fafafa', width: 'fit-content' }}>
                  <Image src={imageUrl} style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 6 }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'center' }}>
                    <Upload customRequest={handleUploadImage} showUploadList={false} accept="image/*"><Button size="small" type="primary" style={{ backgroundColor: COLORS.MIDNIGHT_BLUE }} icon={<UploadSimple />}>Đổi ảnh</Button></Upload>
                    <Button size="small" danger icon={<Trash />} onClick={() => setImageUrl(null)}>Xóa</Button>
                  </div>
                </div>
              ) : (
                <Upload customRequest={handleUploadImage} showUploadList={false} accept="image/*">
                  <div style={{ border: '2px dashed #d9d9d9', borderRadius: 8, padding: '20px', textAlign: 'center', cursor: 'pointer', background: '#fafafa', width: 120, height: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <ImageSquare size={24} color="#bfbfbf" />
                    <div style={{ marginTop: 8 }}><Text type="secondary" style={{ fontSize: 12 }}>Tải ảnh lên</Text></div>
                  </div>
                </Upload>
              )}
            </Col>

            <Divider style={{ margin: '0 0 12px 0' }} />

            <Col xs={12} md={8}><Form.Item name="totalQuantity" label={<span style={{fontWeight: 600}}>Tổng nhập kho</span>} rules={[{ required: true }]}><InputNumber size="large" min={1} style={{ width: '100%' }} /></Form.Item></Col>

            {editingItem && (
              <>
                <Col xs={12} md={8}><Form.Item name="damagedQuantity" label={<span style={{fontWeight: 600}}>SL Hư hỏng</span>}><InputNumber size="large" min={0} style={{ width: '100%' }} /></Form.Item></Col>
                <Col xs={12} md={8}><Form.Item name="liquidatedQuantity" label={<span style={{fontWeight: 600}}>SL Thanh lý</span>}><InputNumber size="large" min={0} style={{ width: '100%' }} /></Form.Item></Col>
                <Form.Item name="inUseQuantity" hidden><InputNumber /></Form.Item>
              </>
            )}

            <Col xs={12} md={12}><Form.Item name="basePrice" label={<span style={{fontWeight: 600}}>Giá nhập gốc (VND)</span>}><InputNumber size="large" style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v.replace(/\$\s?|(,*)/g, '')} /></Form.Item></Col>
            <Col xs={12} md={12}><Form.Item name="defaultPriceIfLost" label={<span style={{fontWeight: 600, color: COLORS.ACCENT_RED}}>Giá đền bù cho khách (VND)</span>} rules={[{ required: true }]}><InputNumber size="large" style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v.replace(/\$\s?|(,*)/g, '')} /></Form.Item></Col>

            <Col xs={24}><Form.Item name="supplier" label="Nhà cung cấp / Nguồn gốc"><Input size="large" placeholder="VD: Điện Máy Xanh, Cty TNHH Dệt May..." /></Form.Item></Col>
          </Row>
          <Button type="primary" htmlType="submit" size="large" block loading={loading} style={{ backgroundColor: COLORS.MIDNIGHT_BLUE, fontWeight: 'bold', marginTop: 12 }}>{editingItem ? 'CẬP NHẬT KHO' : 'LƯU VẬT TƯ MỚI'}</Button>
        </Form>
      </Modal>
    </div>
  );
}