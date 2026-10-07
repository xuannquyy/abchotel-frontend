import React, { useState, useEffect } from 'react';
import { Card, Typography, Table, Tag, notification, Input, Row, Col, Button, Popconfirm, Tooltip, Grid, Space, Modal, Form, Switch, Select } from 'antd';
import { MagnifyingGlass, Plus, PencilSimple, Eye, EyeSlash, FolderOpen, ListDashes } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';

import { categoryApi } from '../../api/categoryApi'; 
import { COLORS } from '../../constants/theme';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function CategoryManagementPage() {
  const navigate = useNavigate();
  const [api, contextHolder] = notification.useNotification({ placement: 'bottomRight' });
  const screens = useBreakpoint();

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form] = Form.useForm();

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await categoryApi.getCategories(false); 
      setCategories(res || []);
    } catch (error) {
      api.error({ title: 'Lỗi', description: 'Không tải được danh mục.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleSave = async (values) => {
    try {
      setLoading(true);
      if (editingCategory) {
        await categoryApi.updateCategory(editingCategory.id, values); 
        api.success({ title: 'Thành công', description: 'Đã cập nhật danh mục.' });
      } else {
        await categoryApi.createCategory(values); 
        api.success({ title: 'Thành công', description: 'Đã tạo danh mục mới.' });
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (error) {
      api.error({ title: 'Lỗi', description: 'Thao tác thất bại.' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      setLoading(true);
      await categoryApi.toggleStatus(id); 
      api.success({ title: 'Thành công', description: 'Đã đổi trạng thái danh mục.' });
      fetchCategories();
    } catch (error) {
      api.error({ title: 'Lỗi', description: 'Không thể đổi trạng thái.' });
    } finally {
      setLoading(false);
    }
  };

  const filteredData = categories
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()) && (filterActive === null || c.isActive === filterActive))
    .sort((a, b) => b.isActive === a.isActive ? 0 : a.isActive ? -1 : 1);

  const columns = [
    { title: 'Tên Danh mục', dataIndex: 'name', render: (text, record) => <Text strong style={{ color: record.isActive ? COLORS.MIDNIGHT_BLUE : COLORS.MUTED, cursor: record.isActive ? 'pointer' : 'not-allowed' }} onClick={() => record.isActive && navigate(`/admin/articles?category=${record.id}`)}>{text}</Text> },
    { title: 'Slug', dataIndex: 'slug', render: text => <Text type="secondary">/{text}</Text> },
    { title: 'Mô tả', dataIndex: 'description', ellipsis: true },
    { title: 'Trạng thái', dataIndex: 'isActive', align: 'center', render: isActive => <Tag color={isActive ? 'blue' : 'default'}>{isActive ? 'Hoạt động' : 'Đã ẩn'}</Tag> },
    { 
      title: 'Hành động', key: 'action', align: 'right', width: 180,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title={record.isActive ? "Xem bài viết" : "Đang bị ẩn"}>
            <Button icon={<FolderOpen size={16} />} onClick={() => navigate(`/admin/articles?category=${record.id}`)} disabled={!record.isActive} />
          </Tooltip>
          <Tooltip title={record.isActive ? "Sửa" : "Khóa sửa"}>
            <Button icon={<PencilSimple size={16} />} onClick={() => { setEditingCategory(record); form.setFieldsValue(record); setIsModalOpen(true); }} disabled={!record.isActive} />
          </Tooltip>
          <Tooltip title={record.isActive ? "Ẩn danh mục" : "Hiện lại danh mục"}>
            <Popconfirm title="Đổi trạng thái danh mục này?" onConfirm={() => handleToggleStatus(record.id)}>
              <Button danger={record.isActive} type={!record.isActive ? "primary" : "default"} icon={record.isActive ? <EyeSlash size={16} /> : <Eye size={16} />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div style={{ paddingBottom: 24 }}>
      {contextHolder}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <Title level={3} style={{ color: COLORS.MIDNIGHT_BLUE, margin: 0, fontFamily: '"Source Serif 4", serif' }}>
          <ListDashes size={28} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Quản lý Danh mục
        </Title>
        <Button type="primary" size="large" icon={<Plus />} style={{ backgroundColor: COLORS.MIDNIGHT_BLUE }} onClick={() => { setEditingCategory(null); form.resetFields(); setIsModalOpen(true); }}>
          Thêm Danh Mục
        </Button>
      </div>

      <Card variant="borderless" style={{ borderRadius: 12, border: `1px solid ${COLORS.LIGHTEST}` }}>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={12}><Input placeholder="Tìm kiếm danh mục..." size="large" prefix={<MagnifyingGlass color={COLORS.MUTED} />} value={search} onChange={e => setSearch(e.target.value)} allowClear /></Col>
          <Col xs={24} md={6}>
            <Select size="large" style={{ width: '100%' }} placeholder="Lọc trạng thái" allowClear value={filterActive} onChange={setFilterActive} options={[{ label: 'Hoạt động', value: true }, { label: 'Đã ẩn', value: false }]} />
          </Col>
        </Row>

        {screens.md ? (
          <Table dataSource={filteredData} rowKey="id" loading={loading} columns={columns} rowClassName={r => !r.isActive ? 'inactive-row' : ''} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredData.map(cat => (
              <Card key={cat.id} styles={{ body: { padding: 16 } }} style={{ border: `1px solid ${COLORS.LIGHTEST}`, borderRadius: 8, opacity: cat.isActive ? 1 : 0.6, background: cat.isActive ? '#fff' : '#f5f5f5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text strong style={{ color: COLORS.MIDNIGHT_BLUE, fontSize: 16 }} onClick={() => cat.isActive && navigate(`/admin/articles?category=${cat.id}`)}>{cat.name}</Text>
                  <Tag color={cat.isActive ? 'blue' : 'default'} style={{ margin: 0 }}>{cat.isActive ? 'Hoạt động' : 'Đã ẩn'}</Tag>
                </div>
                <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>{cat.description || 'Không có mô tả'}</Text>
                <Space style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                  <Button size="small" icon={<FolderOpen />} onClick={() => navigate(`/admin/articles?category=${cat.id}`)} disabled={!cat.isActive}>Mở</Button>
                  <Button size="small" icon={<PencilSimple />} onClick={() => { setEditingCategory(cat); form.setFieldsValue(cat); setIsModalOpen(true); }} disabled={!cat.isActive}>Sửa</Button>
                  <Popconfirm title="Đổi trạng thái?" onConfirm={() => handleToggleStatus(cat.id)}>
                    <Button size="small" danger={cat.isActive} type={!cat.isActive ? "primary" : "default"} icon={cat.isActive ? <EyeSlash /> : <Eye />} />
                  </Popconfirm>
                </Space>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <Modal title={<span style={{color: COLORS.MIDNIGHT_BLUE, fontSize: 18}}>{editingCategory ? "Sửa Danh Mục" : "Thêm Danh Mục Mới"}</span>} open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="Tên Danh mục" rules={[{ required: true }]}><Input size="large" /></Form.Item>
          <Form.Item name="slug" label="Đường dẫn (Slug)"><Input size="large" placeholder="VD: cam-nang-du-lich" /></Form.Item>
          <Form.Item name="description" label="Mô tả"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="isActive" label="Trạng thái hiển thị" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="Hiển thị" unCheckedChildren="Ẩn" />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block style={{ backgroundColor: COLORS.MIDNIGHT_BLUE }}>{editingCategory ? "LƯU THAY ĐỔI" : "TẠO DANH MỤC"}</Button>
        </Form>
      </Modal>

      <style>{`.inactive-row { opacity: 0.55; background-color: #f9f9f9; }`}</style>
    </div>
  );
}