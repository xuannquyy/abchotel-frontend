import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Tag, Modal, Form, notification, Tooltip, Checkbox, Row, Col, Divider, Grid, Empty } from 'antd';
import { ShieldCheck, LockKey } from '@phosphor-icons/react';
import { roleApi } from '../api/roleApi';
import { useAuthStore } from '../store/authStore';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const ACCENT_RED = '#8A1538';
const MIDNIGHT_BLUE = '#1C2E4A';

export default function RolesPage() {
  const screens = useBreakpoint();
  const { user: currentUser } = useAuthStore();
  const canManage = currentUser?.permissions?.includes("MANAGE_ROLES");

  const [api, contextHolder] = notification.useNotification({ placement: 'bottomRight' });

  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [selectedRoleForPerms, setSelectedRoleForPerms] = useState(null);
  const [permForm] = Form.useForm();

  const [prevPerms, setPrevPerms] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rolesRes, permsRes] = await Promise.all([
        roleApi.getRoles(),
        roleApi.getPermissions()
      ]);
      setRoles(rolesRes || []);
      setAllPermissions(permsRes || []);
    } catch (error) {
      api.error({ message: 'Lỗi tải dữ liệu chức vụ' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openPermissionModal = (role) => {
    setSelectedRoleForPerms(role);
    // Lấy các quyền hiện tại đang được tích (Lọc bỏ MANAGE_ROLES nếu không phải Admin để phòng hờ dữ liệu cũ bị lỗi)
    const checkedIds = allPermissions
      .filter(p => role.permissions?.includes(p.name))
      .filter(p => {
         if (role.name !== 'Admin' && p.name === 'MANAGE_ROLES') return false; 
         return true;
      })
      .map(p => p.id);

    permForm.setFieldsValue({ permissionIds: checkedIds });
    setPrevPerms(checkedIds);
    setIsPermModalOpen(true);
  };

  const onPermFormSubmit = async (values) => {
    try {
      setLoading(true);
      const payload = {
        roleId: selectedRoleForPerms.id,
        permissionIds: values.permissionIds || []
      };
      await roleApi.assignPermissions(payload);
      api.success({ message: `Cập nhật quyền cho [${selectedRoleForPerms.name}] thành công!` });
      setIsPermModalOpen(false);
      fetchData();
    } catch (error) {
      api.error({ message: 'Phân quyền thất bại' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAllPerms = () => {
    let allIds = allPermissions.map(p => p.id);
    if (selectedRoleForPerms?.name !== 'Admin') {
       const manageRolesId = allPermissions.find(p => p.name === 'MANAGE_ROLES')?.id;
       allIds = allIds.filter(id => id !== manageRolesId);
    }
    permForm.setFieldsValue({ permissionIds: allIds });
    setPrevPerms(allIds);
  };

  const handleClearAllPerms = () => {
    if (selectedRoleForPerms?.name === 'Admin') {
      const manageRolesId = allPermissions.find(p => p.name === 'MANAGE_ROLES')?.id;
      const viewRolesId = allPermissions.find(p => p.name === 'VIEW_ROLES')?.id; 
      
      const newPerms = [];
      if (manageRolesId) newPerms.push(manageRolesId);
      if (viewRolesId) newPerms.push(viewRolesId);

      permForm.setFieldsValue({ permissionIds: newPerms });
      setPrevPerms(newPerms);
      api.info({ message: 'Đã giữ lại quyền Xem và Quản lý vai trò cho Admin' });
    } else {
      permForm.setFieldsValue({ permissionIds: [] });
      setPrevPerms([]);
    }
  };

  const columns = [
    {
      title: 'Tên Vai trò', dataIndex: 'name', key: 'name', width: '20%',
      render: (text) => (
        <Space>
          <Text style={{ fontWeight: 'bold', color: MIDNIGHT_BLUE, fontSize: 15 }}>{text}</Text>
          {(text === 'Admin' || text === 'Guest') && <LockKey size={16} color={ACCENT_RED} weight="fill" />}
        </Space>
      )
    },
    {
      title: 'Mô tả', dataIndex: 'description', key: 'description', width: '25%',
      render: (text) => <Text type="secondary">{text || 'Không có mô tả'}</Text>
    },
    {
      title: 'Quyền hạn thao tác', dataIndex: 'permissions', key: 'permissions',
      render: (perms, record) => {
        if (record.name === 'Guest') return <Text type="secondary" italic>Khách hàng (Không có quyền Admin)</Text>;
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {perms && perms.length > 0 ? (
              <>
                {perms.slice(0, 4).map(p => (
                  <Tag key={p} color={p.startsWith('MANAGE') ? 'volcano' : 'blue'} style={{ borderRadius: 12 }}>{p}</Tag>
                ))}
                {perms.length > 4 && <Tag style={{ borderRadius: 12 }}>+{perms.length - 4} nữa...</Tag>}
              </>
            ) : (
              <Text type="secondary" italic>Chưa có quyền nào</Text>
            )}
          </div>
        );
      }
    },
    {
      title: 'Thao tác', key: 'actions', width: '15%', align: 'center',
      render: (_, record) => (
        <Space size="middle">
          {canManage ? (
            <>
              {record.name !== 'Guest' ? (
                <Button 
                  type="primary" 
                  ghost 
                  icon={<ShieldCheck size={18} weight="fill" />} 
                  onClick={() => openPermissionModal(record)}
                  style={{ borderColor: MIDNIGHT_BLUE, color: MIDNIGHT_BLUE }}
                >
                  Phân quyền
                </Button>
              ) : (
                <Tooltip title="Chức vụ này không được phép phân quyền">
                  <Button disabled icon={<ShieldCheck size={18} weight="fill" />}>Phân quyền</Button>
                </Tooltip>
              )}
            </>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>Chỉ xem</Text>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      {contextHolder}
      <Title level={3} style={{ color: MIDNIGHT_BLUE, fontFamily: '"Source Serif 4", serif', marginBottom: 24 }}>Danh sách Vai trò & Phân quyền</Title>

      <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', padding: screens.md ? 0 : '16px 0' }}>
        <div style={{ marginBottom: 20, padding: screens.md ? '0' : '0 16px' }}>
          <Text style={{ color: '#52677D', fontSize: 15 }}>
            Đây là danh sách các chức vụ cố định của hệ thống. Quản trị viên chỉ được phép gán hoặc rút các quyền thao tác tương ứng cho từng chức vụ.
          </Text>
        </div>

        {screens.md ? (
          <Table 
            columns={columns} 
            dataSource={roles} 
            rowKey="id" 
            loading={loading}
            pagination={false} 
            rowClassName={(record, index) => index % 2 === 0 ? 'table-row-light' : 'table-row-dark'}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px' }}>
            {roles.length === 0 && !loading ? (
              <Empty description="Không có dữ liệu" style={{ margin: '40px 0' }} />
            ) : (
              roles.map(record => (
                <div key={record.id} style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 16, backgroundColor: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Space>
                      <Text style={{ fontWeight: 'bold', color: MIDNIGHT_BLUE, fontSize: 16 }}>{record.name}</Text>
                      {(record.name === 'Admin' || record.name === 'Guest') && <LockKey size={16} color={ACCENT_RED} weight="fill" />}
                    </Space>
                  </div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>{record.description || 'Không có mô tả'}</Text>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: 16 }}>
                    {record.name === 'Guest' ? (
                      <Text type="secondary" italic>Khách hàng (Không có quyền Admin)</Text>
                    ) : record.permissions && record.permissions.length > 0 ? (
                      <>
                        {record.permissions.slice(0, 4).map(p => (
                          <Tag key={p} color={p.startsWith('MANAGE') ? 'volcano' : 'blue'} style={{ borderRadius: 12, margin: 0 }}>{p}</Tag>
                        ))}
                        {record.permissions.length > 4 && <Tag style={{ borderRadius: 12, margin: 0 }}>+{record.permissions.length - 4} nữa...</Tag>}
                      </>
                    ) : (
                      <Text type="secondary" italic>Chưa có quyền nào</Text>
                    )}
                  </div>
                  
                  <Divider style={{ margin: '8px 0' }} />
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    {canManage ? (
                      <>
                        {record.name !== 'Guest' ? (
                          <Button type="primary" ghost size="small" icon={<ShieldCheck weight="fill" />} onClick={() => openPermissionModal(record)}>Phân quyền</Button>
                        ) : (
                          <Button size="small" disabled icon={<ShieldCheck weight="fill" />}>Phân quyền</Button>
                        )}
                      </>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 12 }}>Chỉ xem</Text>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Card>

      {/* MODAL PHÂN QUYỀN */}
      <Modal 
        title={<Space><ShieldCheck size={24} color={ACCENT_RED}/><Title level={4} style={{ color: MIDNIGHT_BLUE, margin: 0 }}>Phân quyền cho: <span style={{ color: ACCENT_RED }}>{selectedRoleForPerms?.name}</span></Title></Space>} 
        open={isPermModalOpen} 
        onCancel={() => setIsPermModalOpen(false)} 
        footer={null} 
        width={700} 
        centered
      >
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: screens.xs ? 'column' : 'row', justifyContent: 'space-between', alignItems: screens.xs ? 'flex-start' : 'center', gap: 12 }}>
          <Text type="secondary" style={{ fontSize: screens.xs ? 13 : 14 }}>* Quyền <Text strong>MANAGE_ROLES</Text> chỉ dành riêng cho Admin.</Text>
          <Space>
            <Button size="small" onClick={handleSelectAllPerms}>Chọn tất cả</Button>
            <Button size="small" onClick={handleClearAllPerms} danger>Bỏ chọn tất cả</Button>
          </Space>
        </div>
        
        <Form form={permForm} onFinish={onPermFormSubmit}>
          <Form.Item name="permissionIds">
          <Checkbox.Group 
              style={{ width: '100%' }}
              onChange={(checkedValues) => {
                let newCheckedValues = [...checkedValues];

                const added = newCheckedValues.find(x => !prevPerms.includes(x));
                const removed = prevPerms.find(x => !newCheckedValues.includes(x));

                // Tự động tick VIEW khi tick MANAGE
                if (added) {
                  const addedPerm = allPermissions.find(p => p.id === added);
                  if (addedPerm?.name.startsWith('MANAGE_')) {
                    const viewPermName = addedPerm.name.replace('MANAGE_', 'VIEW_');
                    const viewPerm = allPermissions.find(p => p.name === viewPermName);
                    if (viewPerm && !newCheckedValues.includes(viewPerm.id)) {
                      newCheckedValues.push(viewPerm.id);
                    }
                  }
                }

                // Tự động bỏ MANAGE khi bỏ VIEW
                if (removed) {
                  const removedPerm = allPermissions.find(p => p.id === removed);
                  
                  if (selectedRoleForPerms?.name === 'Admin' && removedPerm?.name === 'VIEW_ROLES') {
                    newCheckedValues.push(removed); 
                    api.warning({ message: 'Cảnh báo', description: 'Admin bắt buộc phải có quyền Xem Vai trò.'});
                  } 
                  else if (removedPerm?.name.startsWith('VIEW_')) {
                    const managePermName = removedPerm.name.replace('VIEW_', 'MANAGE_');
                    const managePerm = allPermissions.find(p => p.name === managePermName);
                    if (managePerm && newCheckedValues.includes(managePerm.id)) {
                      newCheckedValues = newCheckedValues.filter(id => id !== managePerm.id);
                    }
                  }
                }

                permForm.setFieldsValue({ permissionIds: newCheckedValues });
                setPrevPerms(newCheckedValues);
              }}
            >
              <div style={{ backgroundColor: '#f9fbfd', padding: screens.xs ? 12 : 20, borderRadius: 12, border: '1px solid #e9f0f8', maxHeight: screens.xs ? '60vh' : 'auto', overflowY: screens.xs ? 'auto' : 'visible' }}>
              <Row gutter={[16, 16]}>
                  {allPermissions.map(perm => {
                    const isAdminLock = selectedRoleForPerms?.name === 'Admin' && (perm.name === 'MANAGE_ROLES' || perm.name === 'VIEW_ROLES');
                    const isNotAdminLock = selectedRoleForPerms?.name !== 'Admin' && perm.name === 'MANAGE_ROLES';
                    const isLocked = isAdminLock || isNotAdminLock;
                    
                    return (
                      <Col xs={24} md={12} key={perm.id}>
                        <div className="perm-checkbox-item" style={{ 
                            padding: '8px 12px', 
                            borderRadius: 6, 
                            backgroundColor: isAdminLock ? '#fff1f0' : (isNotAdminLock ? '#f5f5f5' : 'transparent') 
                        }}>
                          <Checkbox value={perm.id} disabled={isLocked}>
                            <Text style={{ 
                                fontWeight: 500, 
                                color: isAdminLock ? ACCENT_RED : (isNotAdminLock ? '#bfbfbf' : MIDNIGHT_BLUE), 
                                fontSize: screens.xs ? 13 : 14,
                                textDecoration: isNotAdminLock ? 'line-through' : 'none' 
                            }}>
                              {perm.name} 
                              {isAdminLock && <Tooltip title="Quyền này là bắt buộc đối với Admin"><LockKey size={14} weight="fill" style={{marginLeft: 6}} /></Tooltip>}
                              {isNotAdminLock && <Tooltip title="Chỉ Admin mới có thể được cấp quyền này"><LockKey size={14} weight="fill" style={{marginLeft: 6}} /></Tooltip>}
                            </Text>
                          </Checkbox>
                        </div>
                      </Col>
                    );
                  })}
                </Row>
              </div>
            </Checkbox.Group>
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Space style={{ width: screens.xs ? '100%' : 'auto', justifyContent: screens.xs ? 'flex-end' : 'flex-start' }}>
              <Button size="large" onClick={() => setIsPermModalOpen(false)}>Hủy</Button>
              <Button size="large" type="primary" htmlType="submit" loading={loading} style={{ backgroundColor: MIDNIGHT_BLUE, fontWeight: 'bold' }}>
                Lưu Quyền Hạn
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
        .perm-checkbox-item:hover { background-color: #e9f0f8; }
      `}</style>
    </div>
  );
}