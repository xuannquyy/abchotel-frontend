import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Tag, Input, notification, Tooltip, Grid, Divider, Empty, Tabs, Statistic, Row, Col } from 'antd';
import { MagnifyingGlass, Receipt, Money, CheckCircle, WarningCircle, Eye, Printer, HandCoins } from '@phosphor-icons/react';
import dayjs from 'dayjs';

import { invoiceApi } from '../api/invoiceApi';
import { useSignalR } from '../hooks/useSignalR'; // 🔥 Thêm hook Real-time
import InvoiceDetailDrawer from '../components/InvoiceDetailDrawer';
import { COLORS } from '../constants/theme';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function InvoicesPage() {
  const screens = useBreakpoint();
  const [api, contextHolder] = notification.useNotification({ placement: 'bottomRight' });

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('Unpaid'); 

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  // 🔥 Cải tiến hàm fetch với chế độ tải ngầm (Silent Fetch)
  const fetchInvoices = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await invoiceApi.getAll(); 
      setInvoices(res || []);
    } catch (error) {
      if (!isSilent) api.error({ message: 'Lỗi', description: 'Không thể tải danh sách hóa đơn.' });
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  // 🔥 Lắng nghe tín hiệu Real-time từ SignalR để tải ngầm dữ liệu
  useSignalR(() => {
    fetchInvoices(true);
  });

  const openDrawer = (id) => {
    setSelectedInvoiceId(id);
    setIsDrawerOpen(true);
  };

  const processedInvoices = invoices
    .filter(inv => {
      // Ẩn hóa đơn của đơn hủy, TRỪ KHI hóa đơn đó đang cần hoàn tiền hoặc đã hoàn tiền
      if (inv.bookingStatus === 'Cancelled' && inv.status !== 'Refund_Pending' && inv.status !== 'Refunded') return false;

      // 🔥 Lọc theo Tab được đơn giản hóa, cực kỳ chính xác
      if (activeTab !== 'ALL' && inv.status !== activeTab) return false;
      
      const searchLower = searchText.toLowerCase();
      return (
        inv.bookingCode?.toLowerCase().includes(searchLower) ||
        inv.guestName?.toLowerCase().includes(searchLower) ||
        inv.id.toString().includes(searchLower)
      );
    })
    .sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf());

  const totalUnpaid = invoices.filter(i => i.status === 'Unpaid' || i.status === 'Partial').reduce((sum, i) => sum + (i.finalTotal - i.amountPaid), 0);
  const totalPaidToday = invoices.filter(i => i.status === 'Paid' && dayjs(i.updatedAt).isSame(dayjs(), 'day')).reduce((sum, i) => sum + i.amountPaid, 0);
  const totalRefundPending = invoices.filter(i => i.status === 'Refund_Pending').reduce((sum, i) => sum + i.amountPaid, 0);

  const renderStatus = (status) => {
    switch (status) {
      case 'Unpaid': return <Tag color="error" icon={<WarningCircle/>}>CHƯA CỌC</Tag>;
      case 'Partial': return <Tag color="processing">ĐÃ CỌC (CÒN NỢ)</Tag>;
      case 'Paid': return <Tag color="success" icon={<CheckCircle/>}>ĐÃ THANH TOÁN</Tag>;
      case 'Refund_Pending': return <Tag color="warning" style={{background: '#d97706', color: '#fff', borderColor: '#d97706'}} icon={<WarningCircle/>}>CHỜ HOÀN TIỀN</Tag>;
      case 'Refunded': return <Tag color="default">ĐÃ TRẢ KHÁCH</Tag>;
      case 'Cancelled': return <Tag color="default">ĐÃ HỦY</Tag>;
      default: return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Mã HĐ', dataIndex: 'id', key: 'id', width: 80,
      render: (text) => <Text strong>#{text}</Text>
    },
    {
      title: 'Khách hàng / Mã Đơn', key: 'guest',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: COLORS.DARKEST }}>{record.guestName || 'Khách vãng lai'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>Booking: <Text strong style={{ color: COLORS.MIDNIGHT_BLUE }}>{record.bookingCode}</Text></Text>
        </Space>
      )
    },
    {
      title: 'Tổng tiền Đơn', dataIndex: 'finalTotal', key: 'finalTotal', align: 'right',
      render: (val) => <Text strong style={{ color: COLORS.ACCENT_RED, fontSize: 15 }}>{new Intl.NumberFormat('vi-VN').format(val)}đ</Text>
    },
    {
      title: 'Tình trạng dòng tiền', key: 'debt', align: 'right',
      render: (_, record) => {
        if (record.status === 'Refund_Pending') {
            return <Text strong style={{ color: '#d97706' }}>Cần trả khách: {new Intl.NumberFormat('vi-VN').format(record.amountPaid)}đ</Text>;
        }
        if (record.status === 'Refunded') {
            return <Text style={{ color: '#64748b' }}>Đã trả: {new Intl.NumberFormat('vi-VN').format(record.amountPaid)}đ</Text>;
        }
        
        const debt = record.finalTotal - record.amountPaid;
        return <Text strong style={{ color: debt > 0 ? COLORS.ERROR : COLORS.SUCCESS }}>
          Khách nợ: {new Intl.NumberFormat('vi-VN').format(debt)}đ
        </Text>
      }
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', align: 'center',
      render: (status) => renderStatus(status)
    },
    {
      title: 'Thao tác', key: 'actions', align: 'center', width: 100,
      render: (_, record) => (
        <Tooltip title={record.status === 'Unpaid' || record.status === 'Partial' ? "Thu Tiền" : record.status === 'Refund_Pending' ? "Xử lý hoàn tiền" : "Xem chi tiết"}>
          <Button 
            type={(record.status === 'Unpaid' || record.status === 'Partial' || record.status === 'Refund_Pending') ? "primary" : "default"} 
            icon={(record.status === 'Unpaid' || record.status === 'Partial') ? <Money size={20} /> : record.status === 'Refund_Pending' ? <HandCoins size={20} /> : <Eye size={20} />} 
            onClick={() => openDrawer(record.id)} 
            style={(record.status === 'Unpaid' || record.status === 'Partial' || record.status === 'Refund_Pending') ? { backgroundColor: COLORS.MIDNIGHT_BLUE } : {}}
          />
        </Tooltip>
      )
    }
  ];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {contextHolder}
      
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
         <Col xs={24} md={8}>
            <Card variant="borderless" style={{ borderRadius: 12, backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
               <Statistic 
                  title={<Text strong style={{ color: '#991b1b' }}>Khách còn nợ (Cần thu)</Text>}
                  value={totalUnpaid} 
                  suffix="VNĐ"
                  styles={{ content: { color: '#dc2626', fontWeight: 'bold' } }}
                  prefix={<WarningCircle />}
               />
            </Card>
         </Col>
         <Col xs={24} md={8}>
            <Card variant="borderless" style={{ borderRadius: 12, backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
               <Statistic 
                  title={<Text strong style={{ color: '#b45309' }}>Quỹ Cần Trả Khách (Hoàn tiền)</Text>}
                  value={totalRefundPending} 
                  suffix="VNĐ"
                  styles={{ content: { color: '#d97706', fontWeight: 'bold' } }}
                  prefix={<HandCoins />}
               />
            </Card>
         </Col>
         <Col xs={24} md={8}>
            <Card variant="borderless" style={{ borderRadius: 12, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
               <Statistic 
                  title={<Text strong style={{ color: '#166534' }}>Thực nhận (Hôm nay)</Text>}
                  value={totalPaidToday} 
                  suffix="VNĐ"
                  styles={{ content: { color: '#16a34a', fontWeight: 'bold' } }}
                  prefix={<Money />}
               />
            </Card>
         </Col>
      </Row>

      <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', padding: screens.md ? 0 : '16px 0' }}>
        
        <div style={{ display: 'flex', flexDirection: screens.xs ? 'column' : 'row', justifyContent: 'space-between', alignItems: screens.xs ? 'stretch' : 'center', marginBottom: 16, gap: 16, padding: screens.md ? '0' : '0 16px' }}>
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab} 
            style={{ flex: 1 }}
            items={[
              { key: 'Unpaid', label: 'Mới tạo (Chưa cọc)' },
              { key: 'Partial', label: 'Đã cọc (Đang phục vụ)' },
              { key: 'Refund_Pending', label: 'Cần hoàn tiền' },
              { key: 'Refunded', label: 'Đã hoàn tiền' }, // 🔥 Thêm Tab theo yêu cầu
              { key: 'Paid', label: 'Đã hoàn tất' },
              { key: 'ALL', label: 'Tất cả hóa đơn' },
            ]}
          />
          <Input 
            placeholder="Tìm mã HĐ, mã Đơn, Tên khách..." 
            prefix={<MagnifyingGlass color={COLORS.MUTED} />} 
            allowClear 
            onChange={e => setSearchText(e.target.value)}
            style={{ width: screens.xs ? '100%' : 280 }}
            size="large"
          />
        </div>

        {screens.md ? (
          <Table 
            columns={columns} dataSource={processedInvoices} rowKey="id" loading={loading}
            pagination={{ pageSize: 10 }} rowClassName={(record, index) => index % 2 === 0 ? 'table-row-light' : 'table-row-dark'}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px' }}>
            {processedInvoices.length === 0 ? <Empty description="Không có hóa đơn nào" /> : processedInvoices.map(record => {
              return (
                <div key={record.id} style={{ border: `1px solid ${COLORS.LIGHTEST}`, borderRadius: 8, padding: 16, backgroundColor: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 16, color: COLORS.MIDNIGHT_BLUE }}>HĐ #{record.id}</Text>
                    {renderStatus(record.status)}
                  </div>
                  <Space direction="vertical" size={2} style={{ width: '100%', marginBottom: 12 }}>
                    <Text strong>{record.guestName || 'Khách vãng lai'}</Text>
                    <Text type="secondary" style={{ fontSize: 13 }}>Booking: {record.bookingCode}</Text>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                       <Text>Số tiền:</Text>
                       <Text strong style={{ color: COLORS.ACCENT_RED }}>{new Intl.NumberFormat('vi-VN').format(record.finalTotal)}đ</Text>
                    </div>
                  </Space>
                  <Divider style={{ margin: '8px 0' }} />
                  <Button type={(record.status === 'Unpaid' || record.status === 'Partial' || record.status === 'Refund_Pending') ? "primary" : "default"} block ghost={(record.status !== 'Unpaid' && record.status !== 'Partial' && record.status !== 'Refund_Pending')} onClick={() => openDrawer(record.id)} style={(record.status === 'Unpaid' || record.status === 'Partial' || record.status === 'Refund_Pending') ? { backgroundColor: COLORS.MIDNIGHT_BLUE } : {}}>
                    {record.status === 'Unpaid' || record.status === 'Partial' ? "THU TIỀN" : record.status === 'Refund_Pending' ? "XỬ LÝ HOÀN TIỀN" : "Xem chi tiết"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <InvoiceDetailDrawer 
         isOpen={isDrawerOpen} 
         onClose={() => setIsDrawerOpen(false)} 
         invoiceId={selectedInvoiceId} 
         onSuccess={() => fetchInvoices()} 
      />

      <style>{`
        .ant-table-thead > tr > th { background-color: ${COLORS.LIGHTEST} !important; color: ${COLORS.MIDNIGHT_BLUE} !important; font-weight: 700 !important; }
        .table-row-light { background-color: #ffffff; }
        .table-row-dark { background-color: #fcfcfc; }
        .ant-tabs-nav::before { border-bottom: none !important; }
      `}</style>
    </div>
  );
}