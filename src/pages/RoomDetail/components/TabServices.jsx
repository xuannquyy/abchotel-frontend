import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Form, Input, Select, notification, Tag, Modal, Table, Grid, Popconfirm, Space, Divider, Empty, InputNumber, Row, Col, Tooltip } from 'antd';
import { Plus, Coffee, CheckCircle, ClockCounterClockwise, XCircle, LockKey, CookingPot, MagnifyingGlass } from '@phosphor-icons/react';
import dayjs from 'dayjs';

import { orderApi } from '../../../api/orderApi';
import { serviceApi } from '../../../api/serviceApi'; 
import { useSignalR } from '../../../hooks/useSignalR';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

// BẢNG MÀU LẠNH QUYỀN LỰC (KHÔNG VÀNG)
const THEME = {
  DARKEST: '#0D1821', 
  NAVY: '#1C2E4A', 
  MUTED_BLUE: '#7D92AD', 
  LIGHT_BLUE: '#B4CDED', 
  LIGHTEST: '#E9F0F8',
  WHITE: '#FFFFFF',
  ACCENT_RED: '#8A1538',
  SUCCESS: '#166534'
};

export default function TabServices({ room }) {
  const [api, contextHolder] = notification.useNotification({ placement: 'bottomRight' });
  const screens = useBreakpoint();

  const [orders, setOrders] = useState([]);
  const [servicesCatalog, setServicesCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const currentBookingDetailId = room?.currentBookingDetailId;
  const isOccupied = room?.status === 'Occupied';

  const fetchInitialData = async (isSilent = false) => {
    if (!currentBookingDetailId) return;
    try {
      if (!isSilent) setLoading(true);
      
      // 🔥 ĐÃ FIX: Đổi serviceApi.getAll() thành serviceApi.getServices()
      const [ordersRes, catalogRes] = await Promise.all([
        orderApi.getByBookingDetail(currentBookingDetailId),
        serviceApi.getServices(true) // Chỉ lấy các dịch vụ đang hoạt động
      ]);
      
      setOrders(ordersRes || []);
      setServicesCatalog(catalogRes || []);
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
      if (!isSilent) api.error({ title: 'Lỗi hệ thống', description: 'Không thể tải danh sách dịch vụ.' });
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [currentBookingDetailId]);

  useSignalR((notification) => {
    if (notification.permission === "MANAGE_SERVICES") {
      fetchInitialData(true);
    }
  });

  const handleSubmitOrder = async (values) => {
    try {
      setLoading(true);
      const payload = {
        bookingDetailId: currentBookingDetailId,
        notes: values.notes || "",
        items: values.items.map(i => ({ serviceId: i.serviceId, quantity: i.quantity }))
      };
      await orderApi.create(payload);
      api.success({ title: 'Thành công', description: 'Đã thêm dịch vụ vào hóa đơn của khách.' });
      setIsModalOpen(false);
      form.resetFields();
      fetchInitialData();
    } catch (error) {
      api.error({ title: 'Lỗi', description: 'Không thể tạo yêu cầu lúc này.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      setLoading(true);
      await orderApi.updateStatus(id, newStatus);
      api.success({ title: 'Cập nhật', description: `Order đã chuyển sang trạng thái ${newStatus}` });
      fetchInitialData();
    } catch (error) {
      api.error({ title: 'Lỗi', description: 'Không thể cập nhật trạng thái.' });
    } finally {
      setLoading(false);
    }
  };

  const isLocked = (status) => status === 'Completed' || status === 'Cancelled';

  const processedOrders = orders
    .filter(o => {
      const matchStatus = filterStatus === 'ALL' || o.status === filterStatus;
      const matchSearch = o.items?.some(i => i.serviceName.toLowerCase().includes(searchText.toLowerCase()));
      return matchStatus && matchSearch;
    })
    .sort((a, b) => {
      const aLocked = isLocked(a.status);
      const bLocked = isLocked(b.status);
      if (aLocked !== bLocked) return aLocked ? 1 : -1;
      return dayjs(b.orderDate).valueOf() - dayjs(a.orderDate).valueOf();
    });

  const renderStatus = (status) => {
    switch (status) {
      case 'Pending': return <Tag color="processing" icon={<ClockCounterClockwise/>}>Chờ xử lý</Tag>;
      case 'Processing': return <Tag color="warning" icon={<CookingPot/>}>Đang chuẩn bị</Tag>;
      case 'Completed': return <Tag color={THEME.SUCCESS} icon={<CheckCircle/>}>Hoàn thành</Tag>;
      case 'Cancelled': return <Tag color={THEME.ACCENT_RED} icon={<XCircle/>}>Đã hủy</Tag>;
      default: return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    { title: 'Thời gian', dataIndex: 'orderDate', key: 'orderDate', render: (val) => <Text strong>{dayjs(val).format('DD/MM HH:mm')}</Text> },
    { 
      title: 'Món / Dịch vụ', key: 'items', 
      render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {record.items?.map((item, idx) => (
            <Text key={idx} style={{ color: isLocked(record.status) ? THEME.MUTED_BLUE : THEME.DARKEST }}>
              • {item.serviceName} <Text strong>(x{item.quantity})</Text>
            </Text>
          ))}
        </div>
      )
    },
    { title: 'Thành tiền', dataIndex: 'totalAmount', key: 'totalAmount', align: 'right', render: (val, record) => <Text strong style={{ color: isLocked(record.status) ? THEME.MUTED_BLUE : THEME.ACCENT_RED }}>{new Intl.NumberFormat('vi-VN').format(val)}đ</Text> },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', align: 'center', render: (status) => renderStatus(status) },
    { 
      title: 'Thao tác', key: 'actions', align: 'center',
      render: (_, record) => {
        if (isLocked(record.status)) return <Tooltip title="Đã khóa"><LockKey size={20} color={THEME.MUTED_BLUE}/></Tooltip>;
        return (
          <Space>
            {record.status === 'Pending' && <Button size="small" type="primary" style={{backgroundColor: THEME.NAVY}} onClick={() => handleUpdateStatus(record.id, 'Processing')}>Bắt đầu</Button>}
            {record.status === 'Processing' && <Button size="small" style={{borderColor: THEME.SUCCESS, color: THEME.SUCCESS}} onClick={() => handleUpdateStatus(record.id, 'Completed')}>Hoàn tất</Button>}
            <Popconfirm title="Xác nhận hủy?" onConfirm={() => handleUpdateStatus(record.id, 'Cancelled')}><Button size="small" danger type="text">Hủy</Button></Popconfirm>
          </Space>
        )
      }
    }
  ];

  if (!currentBookingDetailId) {
    return (
      <Card variant="borderless" style={{ backgroundColor: THEME.LIGHTEST, textAlign: 'center', padding: 40, borderRadius: 12 }}>
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical">
              <Text strong style={{ color: THEME.NAVY, fontSize: 16 }}>
                {isOccupied ? "Cảnh báo: Dữ liệu Booking không đồng bộ!" : "Phòng đang trống, không thể gọi dịch vụ."}
              </Text>
              {isOccupied && <Text type="secondary">Phòng báo có khách nhưng không tìm thấy mã hóa đơn đính kèm.</Text>}
            </Space>
          } 
        />
      </Card>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {contextHolder}

      <div style={{ display: 'flex', flexDirection: screens.xs ? 'column' : 'row', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <Space direction={screens.xs ? 'vertical' : 'horizontal'} style={{ width: screens.xs ? '100%' : 'auto' }}>
          <Input 
            placeholder="Tìm món/dịch vụ..." 
            prefix={<MagnifyingGlass color={THEME.MUTED_BLUE}/>} 
            allowClear 
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: screens.xs ? '100%' : 250, borderColor: THEME.LIGHT_BLUE }}
          />
          <Select 
            value={filterStatus} 
            onChange={setFilterStatus} 
            style={{ width: screens.xs ? '100%' : 150 }}
            options={[{ value: 'ALL', label: 'Tất cả trạng thái' }, { value: 'Pending', label: 'Chờ xử lý' }, { value: 'Processing', label: 'Chuẩn bị' }, { value: 'Completed', label: 'Hoàn thành' }]}
          />
        </Space>
        <Button type="primary" icon={<Plus/>} style={{ backgroundColor: THEME.ACCENT_RED }} onClick={() => { form.resetFields(); form.setFieldsValue({ items: [{}] }); setIsModalOpen(true); }}>
          GỌI DỊCH VỤ MỚI
        </Button>
      </div>

      {screens.md ? (
        <Table columns={columns} dataSource={processedOrders} rowKey="id" pagination={false} loading={loading} />
      ) : (
        /* UI MOBILE CARD */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {processedOrders.length === 0 ? <Empty /> : processedOrders.map(record => {
            const locked = isLocked(record.status);
            return (
              <div key={record.id} style={{ padding: 16, borderRadius: 12, border: `1px solid ${THEME.LIGHT_BLUE}`, backgroundColor: locked ? THEME.LIGHTEST : THEME.WHITE }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text strong style={{ color: THEME.NAVY }}>{dayjs(record.orderDate).format('DD/MM HH:mm')}</Text>
                  {renderStatus(record.status)}
                </div>
                <div style={{ padding: '8px 12px', backgroundColor: THEME.LIGHTEST, borderRadius: 6, marginBottom: 12 }}>
                  {record.items?.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text style={{ color: THEME.DARKEST }}>• {item.serviceName}</Text>
                      <Text strong>x{item.quantity}</Text>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <Text strong style={{ color: locked ? THEME.MUTED_BLUE : THEME.ACCENT_RED, fontSize: 16 }}>{new Intl.NumberFormat('vi-VN').format(record.totalAmount)}đ</Text>
                  {locked ? <LockKey size={24} color={THEME.MUTED_BLUE} /> : (
                    <Space>
                      {record.status === 'Pending' && <Button size="small" type="primary" style={{backgroundColor: THEME.NAVY}} onClick={() => handleUpdateStatus(record.id, 'Processing')}>Làm món</Button>}
                      {record.status === 'Processing' && <Button size="small" style={{borderColor: THEME.SUCCESS, color: THEME.SUCCESS}} onClick={() => handleUpdateStatus(record.id, 'Completed')}>Xong</Button>}
                      <Popconfirm title="Hủy?" onConfirm={() => handleUpdateStatus(record.id, 'Cancelled')}><Button size="small" danger type="text">Hủy</Button></Popconfirm>
                    </Space>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={isModalOpen} title={<Space><Coffee color={THEME.NAVY} size={24}/><Title level={4} style={{ margin: 0, color: THEME.NAVY }}>Yêu cầu Dịch vụ mới</Title></Space>} onCancel={() => setIsModalOpen(false)} footer={null} width={600} centered>
        <Form form={form} layout="vertical" onFinish={handleSubmitOrder} style={{ marginTop: 24 }}>
          <Form.List name="items" rules={[{ validator: async (_, names) => { if (!names || names.length < 1) return Promise.reject(new Error('Chưa chọn món')); } }]}>
            {(fields, { add, remove }, { errors }) => (
              <>
                {fields.map((field, index) => (
                  <Row gutter={12} key={field.key} style={{ marginBottom: 8, alignItems: 'flex-end' }}>
                    <Col span={15}>
                      {/* 🔥 ĐÃ FIX: Thêm key={field.key} vào Form.Item để hết lỗi Spread Key */}
                      <Form.Item {...field} key={field.key} label={index === 0 ? "Dịch vụ" : ""} name={[field.name, 'serviceId']} rules={[{ required: true, message: 'Bắt buộc' }]} style={{ marginBottom: 0 }}>
                        <Select showSearch placeholder="Tìm món..." options={servicesCatalog.map(s => ({ value: s.id, label: `${s.name} (${new Intl.NumberFormat('vi-VN').format(s.price)}đ)` }))} />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item {...field} label={index === 0 ? "SL" : ""} name={[field.name, 'quantity']} rules={[{ required: true, message: 'SL' }]} style={{ marginBottom: 0 }}>
                        <InputNumber min={1} max={99} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={3} style={{ textAlign: 'right' }}>
                      <Button danger type="text" onClick={() => remove(field.name)} icon={<XCircle size={24}/>}/>
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<Plus />} style={{ marginTop: 12, color: THEME.NAVY, borderColor: THEME.MUTED_BLUE }}>Thêm món khác</Button>
                <Form.ErrorList errors={errors} />
              </>
            )}
          </Form.List>

          <Divider style={{ borderColor: THEME.LIGHTEST }}/>
          <Form.Item name="notes" label={<Text strong>Ghi chú cho Bếp / Buồng phòng</Text>}><Input.TextArea rows={2} placeholder="VD: Không lấy đường, mang lên sau 5 phút..." /></Form.Item>

          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={loading} style={{ backgroundColor: THEME.ACCENT_RED, border: 'none' }}>TẠO ORDER</Button>
            </Space>
          </div>
        </Form>
      </Modal>

      <style>{`
        .ant-table-thead > tr > th { background-color: ${THEME.LIGHTEST} !important; color: ${THEME.NAVY} !important; border-bottom: 1px solid ${THEME.LIGHT_BLUE} !important; font-weight: 700 !important; }
        .ant-table-tbody > tr:hover > td { background-color: ${THEME.LIGHTEST} !important; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}