import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Tag, Modal, Form, Input, InputNumber, notification, Tooltip, Popconfirm, Row, Col, Grid, Divider, Empty, List, Select } from 'antd';
import { Plus, PencilSimple, Trash, MagnifyingGlass, PlayCircle, PauseCircle, LockKey, Coffee, ListDashes } from '@phosphor-icons/react';

import { serviceApi } from '../api/serviceApi';
import { useSignalR } from '../hooks/useSignalR';
import { COLORS } from '../constants/theme';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function ServicesPage() {
  const screens = useBreakpoint();
  const [api, contextHolder] = notification.useNotification({ placement: 'bottomRight' });

  // Data States
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filter States
  const [selectedCategoryId, setSelectedCategoryId] = useState('ALL');
  const [searchText, setSearchText] = useState('');

  // Modal States
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [catForm] = Form.useForm();

  const [isSvcModalOpen, setIsSvcModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [svcForm] = Form.useForm();

  // Fetch Data
  const fetchData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const [catRes, svcRes] = await Promise.all([
        serviceApi.getCategories(),
        serviceApi.getServices()
      ]);
      setCategories(catRes || []);
      setServices(svcRes || []);
    } catch (error) {
      if (!isSilent) api.error({ message: 'Lỗi', description: 'Không thể tải dữ liệu dịch vụ.' });
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Realtime
  useSignalR((notification) => {
    if (notification.permission === "MANAGE_SERVICES") fetchData(true);
  });

  // ================= CATEGORY HANDLERS =================
  const openCatModal = (cat = null) => {
    setEditingCategory(cat);
    if (cat) catForm.setFieldsValue(cat);
    else catForm.resetFields();
    setIsCatModalOpen(true);
  };

  const handleCatSubmit = async (values) => {
    try {
      setLoading(true);
      if (editingCategory) await serviceApi.updateCategory(editingCategory.id, values);
      else await serviceApi.createCategory(values);
      api.success({ message: 'Thành công', description: 'Đã lưu danh mục.' });
      setIsCatModalOpen(false);
      fetchData();
    } catch (e) { api.error({ message: 'Lỗi', description: e.response?.data?.message || 'Có lỗi xảy ra.' }); }
    finally { setLoading(false); }
  };

  const handleDeleteCat = async (id) => {
    try {
      setLoading(true);
      await serviceApi.deleteCategory(id);
      api.success({ message: 'Thành công', description: 'Đã xóa danh mục.' });
      if (selectedCategoryId === id) setSelectedCategoryId('ALL');
      fetchData();
    } catch (e) { api.error({ message: 'Lỗi', description: e.response?.data?.message || 'Không thể xóa danh mục đang có dịch vụ.' }); }
    finally { setLoading(false); }
  };

  // ================= SERVICE HANDLERS =================
  const openSvcModal = (svc = null) => {
    setEditingService(svc);
    if (svc) svcForm.setFieldsValue(svc);
    else {
      svcForm.resetFields();
      svcForm.setFieldsValue({ categoryId: selectedCategoryId !== 'ALL' ? selectedCategoryId : null });
    }
    setIsSvcModalOpen(true);
  };

  const handleSvcSubmit = async (values) => {
    try {
      setLoading(true);
      if (editingService) await serviceApi.updateService(editingService.id, values);
      else await serviceApi.createService(values);
      api.success({ message: 'Thành công', description: 'Đã lưu dịch vụ.' });
      setIsSvcModalOpen(false);
      fetchData();
    } catch (e) { api.error({ message: 'Lỗi', description: e.response?.data?.message || 'Có lỗi xảy ra.' }); }
    finally { setLoading(false); }
  };

  const handleToggleSvc = async (id) => {
    try {
      setLoading(true);
      await serviceApi.toggleServiceStatus(id);
      api.success({ message: 'Thành công', description: 'Đã đổi trạng thái dịch vụ.' });
      fetchData();
    } catch (e) { api.error({ message: 'Lỗi', description: 'Có lỗi xảy ra.' }); }
    finally { setLoading(false); }
  };

  // 🔥 THUẬT TOÁN LỌC & SẮP XẾP: DỊCH VỤ KHÓA BỊ ĐẨY XUỐNG CUỐI
  const processedServices = services
    .filter(s => {
      const matchCat = selectedCategoryId === 'ALL' || s.categoryId === selectedCategoryId;
      const matchSearch = s.name.toLowerCase().includes(searchText.toLowerCase());
      return matchCat && matchSearch;
    })
    .sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1; // Active lên đầu, Inactive xuống cuối
      return a.name.localeCompare(b.name); // Cùng trạng thái thì xếp theo tên A-Z
    });

  const svcColumns = [
    {
      title: 'Tên Dịch Vụ', dataIndex: 'name', key: 'name',
      render: (text, record) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: 15, color: record.isActive ? COLORS.MIDNIGHT_BLUE : COLORS.MUTED }}>{text}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.categoryName}</Text>
        </Space>
      )
    },
    {
      title: 'Đơn giá', dataIndex: 'price', key: 'price',
      render: (price, record) => (
        <Text strong style={{ color: record.isActive ? COLORS.ACCENT_RED : COLORS.MUTED, fontSize: 15 }}>
          {new Intl.NumberFormat('vi-VN').format(price)}đ <Text type="secondary" style={{fontSize: 12}}>/ {record.unit}</Text>
        </Text>
      )
    },
    {
      title: 'Trạng thái', key: 'status', align: 'center', width: 120,
      render: (_, record) => record.isActive 
        ? <Tag color="success" style={{fontWeight: 'bold', margin: 0}}>Đang bán</Tag> 
        : <Tag color="default" style={{margin: 0}}>Tạm ngưng</Tag>
    },
    {
      title: 'Thao tác', key: 'actions', align: 'center', width: 120,
      render: (_, record) => (
        <Space size="small">
          {/* 🔥 KHÓA NÚT SỬA NẾU TẠM NGƯNG */}
          <Tooltip title={!record.isActive ? "Hãy mở bán lại để sửa" : "Sửa"}>
            <Button 
              type="text" 
              disabled={!record.isActive} 
              icon={!record.isActive ? <LockKey size={20} color={COLORS.MUTED}/> : <PencilSimple size={20} color={COLORS.MIDNIGHT_BLUE} />} 
              onClick={() => openSvcModal(record)} 
            />
          </Tooltip>
          <Tooltip title={record.isActive ? "Tạm ngưng" : "Mở bán lại"}>
            <Popconfirm title={`Bạn muốn ${record.isActive ? "tạm ngưng" : "mở bán"} dịch vụ này?`} onConfirm={() => handleToggleSvc(record.id)}>
              <Button type="text" danger={record.isActive} icon={record.isActive ? <PauseCircle size={20} /> : <PlayCircle size={20} color={COLORS.SUCCESS} />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {contextHolder}
      <Title level={3} style={{ color: COLORS.MIDNIGHT_BLUE, fontFamily: '"Source Serif 4", serif', marginBottom: 24 }}>Quản lý Dịch vụ Khách sạn</Title>

      <Row gutter={[24, 24]}>
        {/* CỘT TRÁI: QUẢN LÝ DANH MỤC */}
        <Col xs={24} lg={7} xl={6}>
          <Card 
            title={<Space><ListDashes color={COLORS.MIDNIGHT_BLUE} size={20}/><Text strong style={{color: COLORS.MIDNIGHT_BLUE, fontSize: 16}}>Phân loại Dịch vụ</Text></Space>} 
            extra={<Button type="primary" size="small" icon={<Plus />} onClick={() => openCatModal()} style={{background: COLORS.ACCENT_RED}}>Thêm</Button>}
            variant="borderless" 
            style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', height: '100%' }}
            bodyStyle={{ padding: '12px 0' }}
          >
            <List
              itemLayout="horizontal"
              dataSource={[{ id: 'ALL', name: 'Tất cả dịch vụ' }, ...categories]}
              renderItem={(item) => (
                <List.Item 
                  onClick={() => setSelectedCategoryId(item.id)}
                  style={{ 
                    padding: '12px 20px', cursor: 'pointer', borderBottom: 'none', transition: 'all 0.2s',
                    backgroundColor: selectedCategoryId === item.id ? COLORS.LIGHTEST : 'transparent',
                    borderLeft: selectedCategoryId === item.id ? `4px solid ${COLORS.ACCENT_RED}` : '4px solid transparent'
                  }}
                  className="category-list-item"
                  actions={item.id !== 'ALL' ? [
                    <Button type="text" size="small" icon={<PencilSimple/>} onClick={(e) => { e.stopPropagation(); openCatModal(item); }} />,
                    <Popconfirm title="Xóa danh mục này?" onConfirm={(e) => { e.stopPropagation(); handleDeleteCat(item.id); }} onCancel={(e)=>e.stopPropagation()}>
                      <Button type="text" size="small" danger icon={<Trash/>} onClick={(e)=>e.stopPropagation()} />
                    </Popconfirm>
                  ] : []}
                >
                  <Text strong style={{ color: selectedCategoryId === item.id ? COLORS.ACCENT_RED : COLORS.MIDNIGHT_BLUE }}>{item.name}</Text>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* CỘT PHẢI: QUẢN LÝ DỊCH VỤ CHI TIẾT */}
        <Col xs={24} lg={17} xl={18}>
          <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', padding: screens.md ? 0 : '16px 0' }}>
            <div style={{ display: 'flex', flexDirection: screens.xs ? 'column' : 'row', justifyContent: 'space-between', marginBottom: 20, gap: 16, padding: screens.md ? '0' : '0 16px' }}>
              <Input 
                placeholder="Tìm tên dịch vụ..." 
                prefix={<MagnifyingGlass color={COLORS.MUTED} />} 
                allowClear 
                onChange={e => setSearchText(e.target.value)}
                style={{ width: screens.xs ? '100%' : 300 }}
                size="large"
              />
              <Button 
                type="primary" size="large" icon={<Plus size={18} />} onClick={() => openSvcModal()} 
                style={{ backgroundColor: COLORS.MIDNIGHT_BLUE, borderRadius: 8, fontWeight: 'bold', width: screens.xs ? '100%' : 'auto' }}
              >
                THÊM DỊCH VỤ MỚI
              </Button>
            </div>

            {/* RESPONSIVE LƯỚI / BẢNG */}
            {screens.md ? (
              <Table 
                columns={svcColumns} dataSource={processedServices} rowKey="id" loading={loading}
                pagination={{ pageSize: 10 }} rowClassName={(record, index) => index % 2 === 0 ? 'table-row-light' : 'table-row-dark'}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px' }}>
                {processedServices.length === 0 ? <Empty description="Không có dịch vụ" /> : processedServices.map(record => (
                  <div key={record.id} style={{ border: `1px solid ${COLORS.LIGHTEST}`, borderRadius: 8, padding: 16, backgroundColor: record.isActive ? '#fff' : '#fafafa', opacity: record.isActive ? 1 : 0.6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <Space direction="vertical" size={0}>
                        <Text strong style={{ fontSize: 16, color: record.isActive ? COLORS.DARKEST : COLORS.MUTED }}>{record.name}</Text>
                        <Text type="secondary" style={{ fontSize: 13 }}>{record.categoryName}</Text>
                      </Space>
                      {record.isActive ? <Tag color="success" style={{margin:0}}>Đang bán</Tag> : <Tag color="default" style={{margin:0}}>Tạm ngưng</Tag>}
                    </div>
                    <Text strong style={{ color: record.isActive ? COLORS.ACCENT_RED : COLORS.MUTED, fontSize: 16 }}>
                      {new Intl.NumberFormat('vi-VN').format(record.price)}đ <Text type="secondary" style={{fontSize: 13}}>/ {record.unit}</Text>
                    </Text>
                    <Divider style={{ margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <Button size="small" icon={!record.isActive ? <LockKey/> : <PencilSimple />} disabled={!record.isActive} onClick={() => openSvcModal(record)}>Sửa</Button>
                      <Popconfirm title={`Bạn muốn ${record.isActive ? "tạm ngưng" : "mở bán"}?`} onConfirm={() => handleToggleSvc(record.id)}>
                        <Button size="small" danger={record.isActive} icon={!record.isActive ? <PlayCircle/> : null}>{record.isActive ? 'Tạm ngưng' : 'Mở bán'}</Button>
                      </Popconfirm>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* MODAL DANH MỤC */}
      <Modal title={<Title level={5} style={{ color: COLORS.MIDNIGHT_BLUE, margin: 0 }}>{editingCategory ? 'Sửa Danh mục' : 'Thêm Danh mục'}</Title>} open={isCatModalOpen} onCancel={() => setIsCatModalOpen(false)} footer={null} centered width={400}>
        <Form form={catForm} layout="vertical" onFinish={handleCatSubmit} style={{ marginTop: 20 }}>
          <Form.Item name="name" label="Tên danh mục" rules={[{ required: true, message: 'Nhập tên danh mục' }]}>
            <Input size="large" placeholder="VD: Spa, Đưa đón, Nhà hàng..." />
          </Form.Item>
          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Button size="large" type="primary" htmlType="submit" loading={loading} style={{ backgroundColor: COLORS.MIDNIGHT_BLUE }}>Lưu Danh mục</Button>
          </div>
        </Form>
      </Modal>

      {/* MODAL DỊCH VỤ */}
      <Modal title={<Title level={4} style={{ color: COLORS.MIDNIGHT_BLUE, margin: 0 }}><Coffee size={24} style={{verticalAlign: 'middle', marginRight: 8}}/> {editingService ? 'Sửa Dịch vụ' : 'Thêm Dịch vụ'}</Title>} open={isSvcModalOpen} onCancel={() => setIsSvcModalOpen(false)} footer={null} centered width={600}>
        <Form form={svcForm} layout="vertical" onFinish={handleSvcSubmit} style={{ marginTop: 20 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="categoryId" label={<Text strong>Danh mục</Text>} rules={[{ required: true, message: 'Chọn danh mục' }]}>
                <Select size="large" placeholder="Chọn phân loại..." options={categories.map(c => ({ value: c.id, label: c.name }))} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="name" label={<Text strong>Tên dịch vụ</Text>} rules={[{ required: true, message: 'Nhập tên dịch vụ' }]}>
                <Input size="large" placeholder="VD: Massage chân 60p" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="price" label={<Text strong>Đơn giá (VNĐ)</Text>} rules={[{ required: true, message: 'Nhập giá' }]}>
                <InputNumber size="large" style={{ width: '100%' }} min={0} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="unit" label={<Text strong>Đơn vị tính</Text>} rules={[{ required: true, message: 'Nhập đơn vị' }]}>
                <Input size="large" placeholder="VD: Người, Phần, Lượt..." />
              </Form.Item>
            </Col>
          </Row>
          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Button size="large" onClick={() => setIsSvcModalOpen(false)} style={{marginRight: 8}}>Hủy</Button>
            <Button size="large" type="primary" htmlType="submit" loading={loading} style={{ backgroundColor: COLORS.MIDNIGHT_BLUE, fontWeight: 'bold' }}>Lưu Dịch vụ</Button>
          </div>
        </Form>
      </Modal>

      <style>{`
        .ant-table-thead > tr > th { background-color: ${COLORS.LIGHTEST} !important; color: ${COLORS.MIDNIGHT_BLUE} !important; font-weight: 700 !important; border-bottom: 1px solid ${COLORS.LIGHT} !important; }
        .table-row-light { background-color: #ffffff; }
        .table-row-dark { background-color: #fcfcfc; }
        .ant-table-tbody > tr:hover > td { background-color: ${COLORS.LIGHTEST} !important; }
        .category-list-item:hover { background-color: #f0f4f8 !important; }
      `}</style>
    </div>
  );
}