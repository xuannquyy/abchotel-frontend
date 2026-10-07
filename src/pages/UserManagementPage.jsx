import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Input, Select, Button, Space, Typography, Tag, Modal, Form, notification, Tooltip, Popconfirm, Switch, Row, Col, Divider, Grid, Pagination, Empty } from 'antd';
import { Plus, MagnifyingGlass, PencilSimple, IdentificationCard, FunnelX, Eye, CheckCircle, LockKey, Key } from '@phosphor-icons/react';
import { userApi } from '../api/userApi';
import { roleApi } from '../api/roleApi';
import { useAuthStore } from '../store/authStore';
import { useSignalR } from '../hooks/useSignalR';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const ACCENT_RED = '#8A1538';
const MIDNIGHT_BLUE = '#1C2E4A';

export default function UserManagementPage() {
  const screens = useBreakpoint();
  const { user: currentUser } = useAuthStore();
  const canManage = currentUser?.permissions?.includes("MANAGE_USERS");

  const [api, contextHolder] = notification.useNotification();

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const [filters, setFilters] = useState({
    search: '',
    roleId: null,
    isActive: null,
    pageSize: 8
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  const [form] = Form.useForm();
  const [roleForm] = Form.useForm();

  const fetchUsers = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const res = await userApi.getUsers({ ...filters, page });
      setUsers(res.items || res.$values || []);
      setTotalRecords(res.totalRecords || 0);
      setCurrentPage(page);
    } catch (error) {
      api.error({ message: 'Lỗi', description: 'Không thể lấy danh sách người dùng.' });
    } finally {
      setLoading(false);
    }
  }, [filters, api]);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await roleApi.getRoles();
      setRoles(res || []);
    } catch (error) {
      console.log('Lỗi tải Role', error);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  useSignalR((data) => {
    if (data && data.title && data.title.includes("Tài khoản")) {
      fetchUsers(currentPage);
    }
  });

  const handleCreateOrUpdate = async (values) => {
    try {
      setLoading(true);
      if (editingUser) {
        await userApi.updateUser(editingUser.id, values);
        api.success({ message: 'Thành công', description: 'Cập nhật thông tin thành công.' });
      } else {
        await userApi.createUser(values);
        api.success({ message: 'Thành công', description: 'Tạo tài khoản thành công. Mật khẩu đã được gửi vào Email.' });
      }
      setIsModalOpen(false);
      fetchUsers(currentPage);
    } catch (error) {
      api.error({ message: 'Lỗi', description: error.response?.data?.message || 'Có lỗi xảy ra.' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await userApi.toggleStatus(id);
      api.success({ message: 'Thành công', description: currentStatus ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.' });
      fetchUsers(currentPage);
    } catch (error) {
      api.error({ message: 'Lỗi', description: 'Không thể thay đổi trạng thái.' });
    }
  };

  const handleResetPassword = async (id) => {
    try {
      setResetLoading(true);
      await userApi.resetPassword(id);
      api.success({ message: 'Thành công', description: 'Mật khẩu mới đã được gửi vào Email nhân viên.' });
    } catch (error) {
      api.error({ message: 'Lỗi', description: 'Không thể cấp lại mật khẩu.' });
    } finally {
      setResetLoading(false);
    }
  };

  const onChangeRoleSubmit = async (values) => {
    try {
      setLoading(true);
      await userApi.changeRole(editingUser.id, values.newRoleId);
      api.success({ message: 'Thành công', description: 'Đã thay đổi chức vụ thành công.' });
      setIsRoleModalOpen(false);
      fetchUsers(currentPage);
    } catch (error) {
      api.error({ message: 'Lỗi', description: error.response?.data?.message || 'Không thể đổi chức vụ.' });
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    form.setFieldsValue(user);
    setIsModalOpen(true);
  };

  const openRoleModal = (user) => {
    setEditingUser(user);
    const roleId = roles.find(r => r.name === user.roleName)?.id;
    roleForm.setFieldsValue({ newRoleId: roleId });
    setIsRoleModalOpen(true);
  };

  const columns = [
    {
      title: 'Tài khoản',
      key: 'user',
      render: (_, record) => (
        <Space>
          <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: MIDNIGHT_BLUE, fontWeight: 'bold' }}>
            {record.fullName.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Text strong style={{ color: MIDNIGHT_BLUE, fontSize: 15 }}>{record.fullName}</Text>
            <Text type="secondary" style={{ fontSize: 13 }}>{record.email}</Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => phone || <Text type="secondary" italic>Chưa cập nhật</Text>
    },
    {
      title: 'Chức vụ',
      dataIndex: 'roleName',
      key: 'roleName',
      render: (role) => {
        let color = 'default';
        if (role === 'Admin') color = 'red';
        else if (role === 'Manager') color = 'volcano';
        else if (role === 'Receptionist') color = 'blue';
        else if (role === 'Guest') color = 'green';
        return <Tag color={color} style={{ fontWeight: 600 }}>{role}</Tag>;
      }
    },
    {
      title: 'Trạng thái',
      key: 'status',
      align: 'center',
      render: (_, record) => (
        <Tag color={record.isActive ? 'success' : 'error'} icon={record.isActive ? <CheckCircle /> : <LockKey />}>
          {record.isActive ? 'Hoạt động' : 'Đã khóa'}
        </Tag>
      )
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right',
      render: (_, record) => canManage ? (
        <Space size="small">
          <Tooltip title="Đổi chức vụ">
             <Button type="text" icon={<IdentificationCard size={20} />} onClick={() => openRoleModal(record)} />
          </Tooltip>
          <Tooltip title="Sửa thông tin">
             <Button type="text" icon={<PencilSimple size={20} />} onClick={() => openEditModal(record)} />
          </Tooltip>
          <Tooltip title="Cấp lại Mật khẩu">
             <Popconfirm title="Gửi mật khẩu mới vào Email?" onConfirm={() => handleResetPassword(record.id)}>
                <Button type="text" icon={<Key size={20} />} loading={resetLoading} />
             </Popconfirm>
          </Tooltip>
          <Tooltip title={record.isActive ? "Khóa tài khoản" : "Mở khóa"}>
             <Popconfirm title={record.isActive ? "Xác nhận khóa?" : "Mở khóa tài khoản này?"} onConfirm={() => handleToggleStatus(record.id, record.isActive)}>
                <Switch checked={record.isActive} size="small" style={{ marginLeft: 8 }} />
             </Popconfirm>
          </Tooltip>
        </Space>
      ) : <Text type="secondary">Chỉ xem</Text>
    }
  ];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {contextHolder}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={3} style={{ color: MIDNIGHT_BLUE, margin: 0, fontWeight: 700 }}>Nhân sự & Tài khoản</Title>
          <Text type="secondary">Quản lý phân quyền và hồ sơ nhân viên trong hệ thống</Text>
        </div>
        {canManage && (
          <Button type="primary" size="large" icon={<Plus size={20} />} onClick={openCreateModal} style={{ backgroundColor: ACCENT_RED }}>
            Thêm tài khoản mới
          </Button>
        )}
      </div>

      <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(13,24,33,0.05)', backgroundColor: '#fff', marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={8}>
            <Input size="large" placeholder="Tìm theo Tên, Email hoặc SĐT..." prefix={<MagnifyingGlass color="#94A3B8" />} onChange={(e) => setFilters({ ...filters, search: e.target.value })} allowClear />
          </Col>
          <Col xs={12} md={6}>
            <Select size="large" style={{ width: '100%' }} placeholder="Lọc theo Chức vụ" allowClear onChange={(val) => setFilters({ ...filters, roleId: val })} options={roles.map(r => ({ value: r.id, label: r.name }))} />
          </Col>
          <Col xs={12} md={6}>
            <Select size="large" style={{ width: '100%' }} placeholder="Lọc trạng thái" allowClear onChange={(val) => setFilters({ ...filters, isActive: val })} options={[{ value: true, label: 'Đang hoạt động' }, { value: false, label: 'Đã khóa' }]} />
          </Col>
          <Col xs={24} md={4} style={{ textAlign: 'right' }}>
            <Button size="large" icon={<FunnelX />} onClick={() => setFilters({ search: '', roleId: null, isActive: null, pageSize: 8 })} style={{ width: '100%' }}>Xóa bộ lọc</Button>
          </Col>
        </Row>
      </Card>

      <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(13,24,33,0.05)', padding: 0, overflow: 'hidden' }}>
        {screens.md ? (
          <>
            <Table columns={columns} dataSource={users} rowKey="id" pagination={false} loading={loading} />
            <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f0f0f0' }}>
              <Pagination current={currentPage} total={totalRecords} pageSize={filters.pageSize} onChange={(page) => fetchUsers(page)} showSizeChanger={false} />
            </div>
          </>
        ) : (
          <div style={{ padding: 16 }}>
            {users.length === 0 ? <Empty /> : users.map(user => (
              <Card key={user.id} size="small" style={{ marginBottom: 12, borderColor: '#e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text strong style={{ fontSize: 16 }}>{user.fullName}</Text>
                  <Tag color={user.isActive ? 'success' : 'error'}>{user.isActive ? 'Hoạt động' : 'Đã khóa'}</Tag>
                </div>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text>{user.email}</Text>
                  <Text>{user.phone}</Text>
                  <Text type="secondary">Chức vụ: <b>{user.roleName}</b></Text>
                </Space>
                {canManage && (
                  <div style={{ marginTop: 12, borderTop: '1px dashed #e2e8f0', paddingTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Button size="small" icon={<IdentificationCard />} onClick={() => openRoleModal(user)} />
                    <Button size="small" icon={<PencilSimple />} onClick={() => openEditModal(user)} />
                    <Popconfirm title="Gửi mật khẩu mới?" onConfirm={() => handleResetPassword(user.id)}><Button size="small" icon={<Key />} /></Popconfirm>
                    <Popconfirm title="Xác nhận đổi trạng thái?" onConfirm={() => handleToggleStatus(user.id, user.isActive)}><Switch checked={user.isActive} size="small" /></Popconfirm>
                  </div>
                )}
              </Card>
            ))}
            <div style={{ textAlign: 'center', marginTop: 16 }}><Pagination simple current={currentPage} total={totalRecords} pageSize={filters.pageSize} onChange={(page) => fetchUsers(page)} /></div>
          </div>
        )}
      </Card>

      {/* Modal Thêm/Sửa Account */}
      <Modal title={<Title level={4} style={{ color: MIDNIGHT_BLUE, margin: 0 }}>{editingUser ? 'Sửa thông tin tài khoản' : 'Tạo tài khoản mới'}</Title>} open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null} centered width={500}>
        <Form form={form} layout="vertical" onFinish={handleCreateOrUpdate} style={{ marginTop: 20 }}>
          <Form.Item name="fullName" label="Họ và Tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}><Input size="large" placeholder="Nhập họ tên đầy đủ..." /></Form.Item>
          <Form.Item name="email" label="Email đăng nhập" rules={[{ required: true, message: 'Vui lòng nhập Email' }, { type: 'email', message: 'Email không hợp lệ' }]}><Input size="large" placeholder="Nhập địa chỉ email..." disabled={!!editingUser} /></Form.Item>
          <Form.Item name="phone" label="Số điện thoại" rules={[{ pattern: /^0\d{9}$/, message: 'SĐT không hợp lệ' }]}><Input size="large" placeholder="Nhập số điện thoại..." /></Form.Item>
          
          {/* 🔥 FIX: Dropdown Role cho phép Admin tùy chọn Role khi tạo */}
          {!editingUser && (
            <Form.Item name="roleId" label="Chức vụ / Vai trò" rules={[{ required: true, message: 'Vui lòng chọn Role' }]}>
                <Select size="large" placeholder="Chọn vai trò..." options={roles.map(r => ({ value: r.id, label: r.name }))} />
            </Form.Item>
          )}
          
          {!editingUser && <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px dashed #cbd5e1', marginBottom: 24 }}><Text type="secondary" style={{ fontSize: 13 }}><Eye color={ACCENT_RED}/> Mật khẩu đăng nhập sẽ được hệ thống sinh ngẫu nhiên và gửi thẳng vào Email trên.</Text></div>}
          <div style={{ textAlign: 'right', marginTop: 24 }}><Space><Button size="large" onClick={() => setIsModalOpen(false)}>Hủy</Button><Button size="large" type="primary" htmlType="submit" loading={loading} style={{ backgroundColor: ACCENT_RED }}>{editingUser ? 'Lưu thay đổi' : 'Tạo tài khoản'}</Button></Space></div>
        </Form>
      </Modal>

      {/* Modal Đổi Role */}
      <Modal title={<Title level={4} style={{ color: MIDNIGHT_BLUE, margin: 0 }}>Đổi Chức vụ</Title>} open={isRoleModalOpen} onCancel={() => setIsRoleModalOpen(false)} footer={null} centered width={400}>
        <Form form={roleForm} layout="vertical" onFinish={onChangeRoleSubmit} style={{ marginTop: 20 }}>
          <Form.Item name="newRoleId" label="Chọn chức vụ mới" rules={[{ required: true, message: 'Vui lòng chọn chức vụ' }]}><Select size="large" placeholder="Chọn chức vụ..." options={roles.map(r => ({ value: r.id, label: r.name }))} /></Form.Item>
          <Button size="large" type="primary" htmlType="submit" loading={loading} block style={{ backgroundColor: MIDNIGHT_BLUE }}>Cập nhật Chức vụ</Button>
        </Form>
      </Modal>
    </div>
  );
}