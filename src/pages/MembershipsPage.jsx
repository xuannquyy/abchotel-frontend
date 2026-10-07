import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Tag, Modal, Form, Input, InputNumber, notification, Tooltip, Popconfirm, Row, Col, Grid, Divider, Empty, Avatar } from 'antd';
import { Plus, PencilSimple, Trash, Crown, Medal, Users, MagnifyingGlass } from '@phosphor-icons/react';

import { membershipApi } from '../api/membershipApi';
import { useSignalR } from '../hooks/useSignalR';
import { COLORS } from '../constants/theme';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function MembershipsPage() {
  const screens = useBreakpoint();
  const [api, contextHolder] = notification.useNotification({ placement: 'bottomRight' });

  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMembership, setEditingMembership] = useState(null);
  const [form] = Form.useForm();

  const fetchMemberships = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await membershipApi.getAll();
      setMemberships(res || []);
    } catch (error) {
      if (!isSilent) api.error({ message: 'Lỗi tải dữ liệu', description: 'Không thể lấy danh sách hạng thành viên.' });
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => { fetchMemberships(); }, []);

  // 🔥 LẮNG NGHE REALTIME TỪ BACKEND
  useSignalR((notification) => {
    if (notification.permission === "MANAGE_USERS") fetchMemberships(true);
  });

  const handleOpenModal = (membership = null) => {
    setEditingMembership(membership);
    if (membership) {
      form.setFieldsValue(membership);
    } else {
      form.resetFields();
      form.setFieldsValue({ minPoints: 0, discountPercent: 0 });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      if (editingMembership) {
        await membershipApi.update(editingMembership.id, values);
        api.success({ message: 'Thành công', description: 'Đã cập nhật hạng thành viên.' });
      } else {
        await membershipApi.create(values);
        api.success({ message: 'Thành công', description: 'Đã tạo hạng thành viên mới.' });
      }
      setIsModalOpen(false);
      fetchMemberships();
    } catch (error) {
      api.error({ message: 'Lỗi', description: error.response?.data?.message || 'Có lỗi xảy ra.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      await membershipApi.delete(id);
      api.success({ message: 'Thành công', description: 'Đã xóa hạng thành viên.' });
      fetchMemberships();
    } catch (error) {
      api.error({ message: 'Lỗi xóa dữ liệu', description: error.response?.data?.message || 'Không thể xóa.' });
    } finally {
      setLoading(false);
    }
  };

  // 🔥 THUẬT TOÁN TẠO MÀU SẮC THEO TÊN HẠNG (Cho UI đẹp mắt)
  const getTierColor = (tierName) => {
    const name = tierName?.toLowerCase() || '';
    if (name.includes('vàng') || name.includes('gold')) return '#FFD700'; // Gold
    if (name.includes('bạc') || name.includes('silver')) return '#C0C0C0'; // Silver
    if (name.includes('đồng') || name.includes('bronze')) return '#cd7f32'; // Bronze
    if (name.includes('kim cương') || name.includes('diamond')) return '#00bfff'; // Diamond
    return COLORS.MIDNIGHT_BLUE; // Default
  };

  // 🔥 LỌC VÀ SẮP XẾP BẬC THANG (Từ điểm thấp đến điểm cao)
  const processedMemberships = memberships
    .filter(m => m.tierName?.toLowerCase().includes(searchText.toLowerCase()))
    .sort((a, b) => a.minPoints - b.minPoints); // Sắp xếp theo nấc thang điểm

  const columns = [
    {
      title: 'Hạng Thành Viên', dataIndex: 'tierName', key: 'tierName', width: '25%',
      render: (text) => (
        <Space>
          <Avatar style={{ backgroundColor: getTierColor(text), color: '#fff' }} icon={text.toLowerCase().includes('kim cương') ? <Crown weight="fill"/> : <Medal weight="fill"/>} />
          <Text strong style={{ fontSize: 16, color: COLORS.MIDNIGHT_BLUE }}>{text}</Text>
        </Space>
      )
    },
    {
      title: 'Điều kiện đạt hạng', dataIndex: 'minPoints', key: 'minPoints',
      render: (val) => (
        <Text style={{ fontSize: 15, color: COLORS.DARKEST }}>
          Từ <Text strong style={{ color: COLORS.ACCENT_RED }}>{new Intl.NumberFormat('vi-VN').format(val)}</Text> điểm
        </Text>
      )
    },
    {
      title: 'Ưu đãi Giảm giá', dataIndex: 'discountPercent', key: 'discountPercent', align: 'center',
      render: (val) => (
        <Tag color="green" style={{ fontSize: 15, padding: '4px 12px', fontWeight: 'bold', borderRadius: 20 }}>
          GIẢM {val}%
        </Tag>
      )
    },
    {
      title: 'Thống kê Khách hàng', dataIndex: 'totalUsers', key: 'totalUsers', align: 'center',
      render: (val) => (
        <Space style={{ color: COLORS.MUTED }}>
          <Users size={18} weight="fill" />
          <Text strong>{new Intl.NumberFormat('vi-VN').format(val)} thành viên</Text>
        </Space>
      )
    },
    {
      title: 'Thao tác', key: 'actions', align: 'center', width: 120,
      render: (_, record) => {
        const canDelete = record.totalUsers === 0; // Backend cũng có chặn, nhưng chặn luôn ở Frontend cho chắc
        return (
          <Space size="small">
            <Tooltip title="Chỉnh sửa">
              <Button type="text" icon={<PencilSimple size={20} color={COLORS.MIDNIGHT_BLUE} />} onClick={() => handleOpenModal(record)} />
            </Tooltip>
            <Tooltip title={canDelete ? "Xóa hạng này" : "Không thể xóa hạng đang có thành viên"}>
              <Popconfirm title="Bạn có chắc muốn xóa hạng thành viên này?" onConfirm={() => handleDelete(record.id)} okText="Đồng ý" cancelText="Hủy" disabled={!canDelete}>
                <Button type="text" danger disabled={!canDelete} icon={<Trash size={20} />} />
              </Popconfirm>
            </Tooltip>
          </Space>
        )
      }
    }
  ];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {contextHolder}
      <Title level={3} style={{ color: COLORS.MIDNIGHT_BLUE, fontFamily: '"Source Serif 4", serif', marginBottom: 24 }}>Cấu hình Hạng Thành Viên</Title>

      <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', padding: screens.md ? 0 : '16px 0' }}>
        <div style={{ display: 'flex', flexDirection: screens.xs ? 'column' : 'row', justifyContent: 'space-between', marginBottom: 20, gap: 16, padding: screens.md ? '0' : '0 16px' }}>
          
          <Input 
            placeholder="Tìm kiếm hạng thành viên..." 
            prefix={<MagnifyingGlass color={COLORS.MUTED} />} 
            allowClear 
            onChange={e => setSearchText(e.target.value)}
            style={{ width: screens.xs ? '100%' : 300 }}
            size="large"
          />

          <Button 
            type="primary" size="large" icon={<Plus size={18} />} onClick={() => handleOpenModal()} 
            style={{ backgroundColor: COLORS.MIDNIGHT_BLUE, borderRadius: 8, fontWeight: 'bold', width: screens.xs ? '100%' : 'auto' }}
          >
            TẠO HẠNG MỚI
          </Button>
        </div>

        {/* RESPONSIVE LƯỚI / BẢNG */}
        {screens.md ? (
          <Table 
            columns={columns} dataSource={processedMemberships} rowKey="id" loading={loading}
            pagination={false} rowClassName={(record, index) => index % 2 === 0 ? 'table-row-light' : 'table-row-dark'}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px' }}>
            {processedMemberships.length === 0 ? <Empty description="Không có dữ liệu" /> : processedMemberships.map(record => {
              const canDelete = record.totalUsers === 0;
              return (
                <div key={record.id} style={{ border: `1px solid ${COLORS.LIGHTEST}`, borderRadius: 8, padding: 16, backgroundColor: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Space>
                      <Avatar size="small" style={{ backgroundColor: getTierColor(record.tierName) }} icon={<Medal/>} />
                      <Text strong style={{ fontSize: 16, color: COLORS.DARKEST }}>{record.tierName}</Text>
                    </Space>
                    <Tag color="green" style={{ margin: 0, fontWeight: 'bold' }}>GIẢM {record.discountPercent}%</Tag>
                  </div>
                  <Space direction="vertical" size={4} style={{ width: '100%', marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>Cần đạt: <Text strong style={{ color: COLORS.ACCENT_RED }}>{new Intl.NumberFormat('vi-VN').format(record.minPoints)} điểm</Text></Text>
                    <Text type="secondary" style={{ fontSize: 13 }}>Đang có: <Text strong>{new Intl.NumberFormat('vi-VN').format(record.totalUsers)} khách hàng</Text></Text>
                  </Space>
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Button size="small" icon={<PencilSimple />} onClick={() => handleOpenModal(record)}>Sửa</Button>
                    <Popconfirm title="Bạn có chắc muốn xóa?" onConfirm={() => handleDelete(record.id)} disabled={!canDelete}>
                      <Button size="small" danger disabled={!canDelete} icon={<Trash />}>Xóa</Button>
                    </Popconfirm>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* MODAL THÊM / SỬA */}
      <Modal 
        title={<Title level={4} style={{ color: COLORS.MIDNIGHT_BLUE, margin: 0 }}><Crown size={24} style={{verticalAlign: 'middle', marginRight: 8, color: '#FFD700'}}/> {editingMembership ? 'Chỉnh sửa Hạng Thành viên' : 'Thiết lập Hạng mới'}</Title>} 
        open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null} centered width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 24 }}>
          <Form.Item name="tierName" label={<Text strong>Tên Hạng (Ví dụ: Vàng, Bạc, VIP...)</Text>} rules={[{ required: true, message: 'Vui lòng nhập tên hạng' }]}>
            <Input size="large" placeholder="Nhập tên hạng thành viên" />
          </Form.Item>
          
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="minPoints" label={<Text strong>Điểm tối thiểu cần đạt</Text>} rules={[{ required: true, message: 'Nhập số điểm' }]}>
                <InputNumber size="large" style={{ width: '100%' }} min={0} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="discountPercent" label={<Text strong>Mức giảm giá (%)</Text>} rules={[{ required: true, message: 'Nhập % giảm giá' }]}>
                <InputNumber size="large" style={{ width: '100%' }} min={0} max={100} suffix="%" />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button size="large" onClick={() => setIsModalOpen(false)}>Hủy</Button>
              <Button size="large" type="primary" htmlType="submit" loading={loading} style={{ backgroundColor: COLORS.MIDNIGHT_BLUE, fontWeight: 'bold' }}>
                Lưu Chính Sách
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      <style>{`
        .ant-table-thead > tr > th { background-color: ${COLORS.LIGHTEST} !important; color: ${COLORS.MIDNIGHT_BLUE} !important; font-weight: 700 !important; border-bottom: 1px solid ${COLORS.LIGHT} !important; }
        .table-row-light { background-color: #ffffff; }
        .table-row-dark { background-color: #fcfcfc; }
        .ant-table-tbody > tr:hover > td { background-color: ${COLORS.LIGHTEST} !important; }
      `}</style>
    </div>
  );
}