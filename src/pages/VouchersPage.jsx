import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Tag, Modal, Form, Input, InputNumber, Select, DatePicker, notification, Tooltip, Popconfirm, Row, Col, Grid, Divider, Empty, Switch} from 'antd';
import { Plus, PencilSimple, Ticket, MagnifyingGlass, PlayCircle, PauseCircle, LockKey } from '@phosphor-icons/react';
import dayjs from 'dayjs';

import { voucherApi } from '../api/voucherApi';
import { useSignalR } from '../hooks/useSignalR';
import { COLORS } from '../constants/theme';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const { RangePicker } = DatePicker;

export default function VouchersPage() {
  const screens = useBreakpoint();
  const [api, contextHolder] = notification.useNotification({ placement: 'bottomRight' });

  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [form] = Form.useForm();
  
  const discountTypeWatch = Form.useWatch('discountType', form);

  const fetchVouchers = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await voucherApi.getAll();
      setVouchers(res || []);
    } catch (error) {
      // 🔥 FIX ANTD WARNING: Đổi 'message' thành 'title'
      if (!isSilent) api.error({ title: 'Lỗi tải dữ liệu', description: 'Không thể lấy danh sách mã khuyến mãi.' });
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  useSignalR((notification) => {
    if (notification.permission === "MANAGE_VOUCHERS") {
      fetchVouchers(true); 
    }
  });

  const handleOpenModal = (voucher = null) => {
    setEditingVoucher(voucher);
    if (voucher) {
      form.setFieldsValue({
        ...voucher,
        dateRange: voucher.validFrom && voucher.validTo ? [dayjs(voucher.validFrom), dayjs(voucher.validTo)] : null
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ discountType: 'PERCENT', maxUsesPerUser: 1 });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const payload = {
        code: values.code,
        discountType: values.discountType,
        discountValue: values.discountValue,
        minBookingValue: values.minBookingValue,
        maxDiscountAmount: values.discountType === 'PERCENT' ? values.maxDiscountAmount : null,
        roomTypeId: values.roomTypeId,
        validFrom: values.dateRange ? values.dateRange[0].toISOString() : null,
        validTo: values.dateRange ? values.dateRange[1].toISOString() : null,
        usageLimit: values.usageLimit,
        maxUsesPerUser: values.maxUsesPerUser
      };

      if (editingVoucher) {
        await voucherApi.update(editingVoucher.id, payload);
        api.success({ title: 'Thành công', description: 'Đã cập nhật mã khuyến mãi.' });
      } else {
        await voucherApi.create(payload);
        api.success({ title: 'Thành công', description: 'Đã tạo mã khuyến mãi mới.' });
      }
      setIsModalOpen(false);
      fetchVouchers();
    } catch (error) {
      api.error({ title: 'Lỗi', description: error.response?.data?.message || 'Có lỗi xảy ra.' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      setLoading(true);
      await voucherApi.toggleStatus(id);
      api.success({ title: 'Thành công', description: 'Đã đổi trạng thái mã khuyến mãi.' });
      fetchVouchers();
    } catch (error) {
      api.error({ title: 'Lỗi', description: 'Không thể đổi trạng thái lúc này.' });
    } finally {
      setLoading(false);
    }
  };

  const getVoucherStatus = (record) => {
    const isExpired = record.validTo && dayjs().isAfter(dayjs(record.validTo));
    if (isExpired) return 'EXPIRED'; 
    if (!record.isActive) return 'PAUSED'; 
    return 'ACTIVE'; 
  };

  const renderStatusTag = (status) => {
    switch(status) {
      case 'ACTIVE': return <Tag color="success" style={{ fontWeight: 'bold' }}>Đang diễn ra</Tag>;
      case 'PAUSED': return <Tag color="default">Tạm ngưng</Tag>;
      case 'EXPIRED': return <Tag color="error">Hết hạn</Tag>;
      default: return null;
    }
  };

  const processedVouchers = vouchers
    .filter(v => {
      const matchSearch = v.code?.toLowerCase().includes(searchText.toLowerCase());
      const matchType = filterType === 'ALL' || v.discountType === filterType;
      return matchSearch && matchType;
    })
    .sort((a, b) => {
      const statusWeight = { 'ACTIVE': 1, 'PAUSED': 2, 'EXPIRED': 3 };
      const weightA = statusWeight[getVoucherStatus(a)];
      const weightB = statusWeight[getVoucherStatus(b)];
      
      if (weightA !== weightB) return weightA - weightB; 
      return dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf(); 
    });

  const columns = [
    {
      title: 'Mã Khuyến Mãi', dataIndex: 'code', key: 'code',
      render: (text, record) => {
        const status = getVoucherStatus(record);
        return (
          <Space direction="vertical" size={2}>
            <Text strong style={{ fontSize: 16, color: status === 'ACTIVE' ? COLORS.MIDNIGHT_BLUE : COLORS.MUTED }}>{text}</Text>
            {renderStatusTag(status)}
          </Space>
        )
      }
    },
    {
      title: 'Mức Giảm', key: 'discount',
      render: (_, record) => {
        const isMuted = getVoucherStatus(record) !== 'ACTIVE';
        return (
          <Text strong style={{ color: isMuted ? COLORS.MUTED : COLORS.MIDNIGHT_BLUE, fontSize: 15 }}>
            {record.discountType === 'PERCENT' ? `${record.discountValue}%` : `${new Intl.NumberFormat('vi-VN').format(record.discountValue)}đ`}
          </Text>
        )
      }
    },
    {
      title: 'Điều kiện', key: 'conditions',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text type="secondary" style={{ fontSize: 12 }}>Đơn tối thiểu: <Text strong>{record.minBookingValue ? `${new Intl.NumberFormat('vi-VN').format(record.minBookingValue)}đ` : '0đ'}</Text></Text>
          {record.discountType === 'PERCENT' && record.maxDiscountAmount && (
            <Text type="secondary" style={{ fontSize: 12 }}>Giảm tối đa: <Text strong>{new Intl.NumberFormat('vi-VN').format(record.maxDiscountAmount)}đ</Text></Text>
          )}
        </Space>
      )
    },
    {
      title: 'Hạn sử dụng', key: 'dates',
      render: (_, record) => {
        const isExpired = getVoucherStatus(record) === 'EXPIRED';
        return (
          <Text style={{ fontSize: 13, color: isExpired ? COLORS.ERROR : COLORS.DARKEST, textDecoration: isExpired ? 'line-through' : 'none' }}>
            {record.validFrom ? dayjs(record.validFrom).format('DD/MM/YY') : '∞'} - {record.validTo ? dayjs(record.validTo).format('DD/MM/YY') : '∞'}
          </Text>
        )
      }
    },
    {
      title: 'Lượt dùng', key: 'usage', align: 'center',
      render: (_, record) => {
        const isDepleted = record.usageLimit && record.usedCount >= record.usageLimit;
        return (
          <Tag color={isDepleted ? 'error' : 'processing'} style={{ borderRadius: 12 }}>
            {record.usedCount} / {record.usageLimit || '∞'}
          </Tag>
        );
      }
    },
    {
      title: 'Thao tác', key: 'actions', align: 'center', width: 120,
      render: (_, record) => {
        const status = getVoucherStatus(record);
        const isExpired = status === 'EXPIRED';
        const isPaused = status === 'PAUSED';

        return (
          <Space size="small">
            <Tooltip title={isExpired ? "Không thể sửa mã đã hết hạn" : isPaused ? "Hãy kích hoạt lại mã trước khi sửa" : "Chỉnh sửa"}>
              <Button 
                type="text" 
                disabled={isExpired || isPaused} 
                icon={isExpired || isPaused ? <LockKey size={20} color={COLORS.MUTED}/> : <PencilSimple size={20} color={COLORS.MIDNIGHT_BLUE} />} 
                onClick={() => handleOpenModal(record)} 
              />
            </Tooltip>
            
            <Tooltip title={isExpired ? "Mã đã hết hạn, không thể kích hoạt" : (record.isActive ? "Tạm ngưng" : "Kích hoạt")}>
              <Popconfirm 
                title={`Bạn có chắc muốn ${record.isActive ? "tạm ngưng" : "kích hoạt"} mã này?`} 
                onConfirm={() => handleToggleStatus(record.id)} 
                okText="Đồng ý" cancelText="Hủy"
                disabled={isExpired}
              >
                <Button 
                  type="text" 
                  disabled={isExpired}
                  danger={record.isActive} 
                  icon={isExpired ? <LockKey size={20}/> : (record.isActive ? <PauseCircle size={20} /> : <PlayCircle size={20} color={COLORS.SUCCESS} />)} 
                />
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
      <Title level={3} style={{ color: COLORS.MIDNIGHT_BLUE, fontFamily: '"Source Serif 4", serif', marginBottom: 24 }}>Quản lý Khuyến Mãi (Vouchers)</Title>

      <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', padding: screens.md ? 0 : '16px 0' }}>
        <div style={{ display: 'flex', flexDirection: screens.xs ? 'column' : 'row', justifyContent: 'space-between', marginBottom: 20, gap: 16, padding: screens.md ? '0' : '0 16px' }}>
          
          <Space direction={screens.xs ? 'vertical' : 'horizontal'} style={{ width: screens.xs ? '100%' : 'auto' }}>
            <Input 
              placeholder="Nhập mã khuyến mãi..." 
              prefix={<MagnifyingGlass color={COLORS.MUTED} />} 
              allowClear 
              onChange={e => setSearchText(e.target.value)}
              style={{ width: screens.xs ? '100%' : 250 }}
              size="large"
            />
            <Select 
              value={filterType} 
              onChange={setFilterType} 
              size="large" 
              style={{ width: screens.xs ? '100%' : 150 }}
              options={[
                { value: 'ALL', label: 'Tất cả loại' },
                { value: 'PERCENT', label: 'Giảm %' },
                { value: 'FIXED_AMOUNT', label: 'Giảm Tiền mặt' }
              ]}
            />
          </Space>

          <Button 
            type="primary" size="large" icon={<Plus size={18} />} onClick={() => handleOpenModal()} 
            style={{ backgroundColor: COLORS.MIDNIGHT_BLUE, borderRadius: 8, fontWeight: 'bold', width: screens.xs ? '100%' : 'auto' }}
          >
            TẠO MÃ MỚI
          </Button>
        </div>

        {screens.md ? (
          <Table 
            columns={columns} dataSource={processedVouchers} rowKey="id" loading={loading}
            pagination={{ pageSize: 10 }} rowClassName={(record, index) => index % 2 === 0 ? 'table-row-light' : 'table-row-dark'}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px' }}>
            {processedVouchers.length === 0 ? <Empty description="Không tìm thấy mã khuyến mãi" /> : processedVouchers.map(record => {
              const status = getVoucherStatus(record);
              const isExpired = status === 'EXPIRED';
              const isPaused = status === 'PAUSED';

              return (
                <div key={record.id} style={{ border: `1px solid ${COLORS.LIGHTEST}`, borderRadius: 8, padding: 16, backgroundColor: status === 'ACTIVE' ? '#fff' : '#fafafa', opacity: status === 'ACTIVE' ? 1 : 0.6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <Space direction="vertical" size={2}>
                      <Text strong style={{ fontSize: 16, color: COLORS.DARKEST }}>{record.code}</Text>
                      {renderStatusTag(status)}
                    </Space>
                    <Text strong style={{ color: status === 'ACTIVE' ? COLORS.MIDNIGHT_BLUE : COLORS.MUTED, fontSize: 16 }}>
                      {record.discountType === 'PERCENT' ? `${record.discountValue}%` : `${new Intl.NumberFormat('vi-VN').format(record.discountValue)}đ`}
                    </Text>
                  </div>
                  <Space direction="vertical" size={2} style={{ width: '100%', marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>Đơn tối thiểu: <Text strong>{record.minBookingValue ? `${new Intl.NumberFormat('vi-VN').format(record.minBookingValue)}đ` : '0đ'}</Text></Text>
                    <Text type="secondary" style={{ fontSize: 13 }}>HSD: <Text strong style={{ textDecoration: isExpired ? 'line-through' : 'none' }}>{record.validFrom ? dayjs(record.validFrom).format('DD/MM/YY') : '∞'} - {record.validTo ? dayjs(record.validTo).format('DD/MM/YY') : '∞'}</Text></Text>
                    <Text type="secondary" style={{ fontSize: 13 }}>Đã dùng: <Text strong>{record.usedCount} / {record.usageLimit || '∞'}</Text></Text>
                  </Space>
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Button size="small" icon={isExpired || isPaused ? <LockKey/> : <PencilSimple />} disabled={isExpired || isPaused} onClick={() => handleOpenModal(record)}>Sửa</Button>
                    <Popconfirm title={`Bạn có chắc muốn ${record.isActive ? "tạm ngưng" : "kích hoạt"}?`} onConfirm={() => handleToggleStatus(record.id)} disabled={isExpired}>
                      <Button size="small" danger={record.isActive} disabled={isExpired} icon={isExpired ? <LockKey/> : null}>{record.isActive ? 'Tạm ngưng' : 'Kích hoạt'}</Button>
                    </Popconfirm>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal 
        title={<Title level={4} style={{ color: COLORS.MIDNIGHT_BLUE, margin: 0 }}><Ticket size={24} style={{verticalAlign: 'middle', marginRight: 8}}/> {editingVoucher ? 'Chỉnh sửa Mã Khuyến Mãi' : 'Tạo Mã Khuyến Mãi mới'}</Title>} 
        open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null} centered width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 24 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="code" label={<Text strong>Mã Code</Text>}>
                <Input size="large" placeholder="Bỏ trống để hệ thống tự sinh mã" style={{ textTransform: 'uppercase' }} disabled={!!editingVoucher} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="discountType" label={<Text strong>Loại giảm giá</Text>} rules={[{ required: true }]}>
                <Select size="large" options={[{ value: 'PERCENT', label: 'Giảm theo phần trăm (%)' }, { value: 'FIXED_AMOUNT', label: 'Giảm tiền mặt (VNĐ)' }]} />
              </Form.Item>
            </Col>
            
            <Col xs={24} md={discountTypeWatch === 'PERCENT' ? 8 : 12}>
              <Form.Item name="discountValue" label={<Text strong>Mức giảm</Text>} rules={[{ required: true, message: 'Nhập mức giảm' }]}>
                <InputNumber size="large" style={{ width: '100%' }} min={1} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
              </Form.Item>
            </Col>
            <Col xs={24} md={discountTypeWatch === 'PERCENT' ? 8 : 12}>
              <Form.Item name="minBookingValue" label={<Text strong>Đơn hàng tối thiểu</Text>}>
                <InputNumber size="large" style={{ width: '100%' }} min={0} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
              </Form.Item>
            </Col>
            {discountTypeWatch === 'PERCENT' && (
              <Col xs={24} md={8}>
                <Form.Item name="maxDiscountAmount" label={<Text strong>Giảm tối đa</Text>}>
                  <InputNumber size="large" style={{ width: '100%' }} min={0} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                </Form.Item>
              </Col>
            )}

            <Col xs={24}>
              <Form.Item name="dateRange" label={<Text strong>Thời gian áp dụng</Text>}>
                <RangePicker 
                  size="large" 
                  style={{ width: '100%' }} 
                  format="DD/MM/YYYY HH:mm" 
                  showTime 
                  disabledDate={(current) => {
                    return current && current < dayjs().startOf('day');
                  }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="usageLimit" label={<Text strong>Tổng giới hạn lượt dùng</Text>}>
                <InputNumber size="large" style={{ width: '100%' }} min={1} placeholder="Bỏ trống nếu không giới hạn" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="maxUsesPerUser" label={<Text strong>Lượt dùng mỗi khách hàng</Text>} rules={[{ required: true }]}>
                <InputNumber size="large" style={{ width: '100%' }} min={1} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="isForNewCustomer" label={<Text strong>Chỉ dành cho Khách mới</Text>} valuePropName="checked">
                <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button size="large" onClick={() => setIsModalOpen(false)}>Hủy</Button>
              <Button size="large" type="primary" htmlType="submit" loading={loading} style={{ backgroundColor: COLORS.MIDNIGHT_BLUE, fontWeight: 'bold' }}>
                Lưu Khuyến Mãi
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