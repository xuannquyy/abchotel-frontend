import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Tag, Input, notification, Grid, Divider, Empty, Tabs } from 'antd';
import { MagnifyingGlass, Eye, XCircle, CheckCircle, ClockCounterClockwise, CalendarCheck, DoorOpen } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'; 
import { useNavigate } from 'react-router-dom';

import { bookingApi } from '../api/bookingApi';
import { useSignalR } from '../hooks/useSignalR';
import BookingDetailDrawer from '../components/BookingDetailDrawer'; 

dayjs.extend(isSameOrAfter);
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const LUXURY_COLORS = {
    DARKEST: '#1C2E4A', NAVY: '#344966', MUTED_BLUE: '#7D92AD', 
    LIGHT_BLUE: '#B4CDED', LIGHTEST: '#E9F0F8', WHITE: '#FFFFFF',
    GOLD: '#D4AF37', ACCENT_RED: '#8A1538', SUCCESS: '#52c41a'
};

export default function BookingsPage() {
  const screens = useBreakpoint();
  const [api, contextHolder] = notification.useNotification({ placement: 'bottomRight' });
  const navigate = useNavigate(); 

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('ArrivalsToday'); 

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedBookingCode, setSelectedBookingCode] = useState(null);

  const fetchBookings = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await bookingApi.getAll(); 
      setBookings(res || []);
    } catch (error) {
      if (!isSilent) api.error({ message: 'Lỗi', description: 'Không thể tải danh sách đơn.' });
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  // 🔥 Đã gỡ bỏ điều kiện lỗi thời. Gọi tải ngầm ngay khi có bất kỳ thay đổi nào
  useSignalR(() => {
    fetchBookings(true);
  });

  const openDrawer = (code) => {
    setSelectedBookingCode(code);
    setIsDrawerOpen(true);
  };

  const processedBookings = bookings
    .filter(b => {
      const today = dayjs().startOf('day');
      const bookingDate = dayjs(b.expectedCheckIn).startOf('day');

      if (activeTab === 'ArrivalsToday') {
          return bookingDate.isSame(today, 'day') && (b.status === 'Confirmed' || b.status === 'Pending');
      }
      if (activeTab === 'InHouse') {
          return b.status === 'Checked_in';
      }
      if (activeTab === 'Upcoming') {
          return bookingDate.isAfter(today, 'day') && b.status === 'Confirmed';
      }
      if (activeTab === 'PendingPayment') {
          return b.status === 'Pending';
      }
      if (activeTab !== 'ALL' && b.status !== activeTab) return false;
      
      const searchLower = searchText.toLowerCase();
      return (
        b.bookingCode?.toLowerCase().includes(searchLower) ||
        b.guestName?.toLowerCase().includes(searchLower) ||
        b.guestPhone?.includes(searchText)
      );
    })
    .sort((a, b) => dayjs(a.expectedCheckIn).valueOf() - dayjs(b.expectedCheckIn).valueOf()); 

  const renderStatus = (status) => {
    switch (status) {
      case 'Pending': return <Tag color="warning" icon={<ClockCounterClockwise/>}> Chờ thanh toán</Tag>;
      case 'Confirmed': return <Tag color="processing" icon={<CheckCircle/>}> Đã xác nhận</Tag>;
      case 'Checked_in': return <Tag color="success" icon={<DoorOpen/>}> Đang lưu trú</Tag>;
      case 'Completed': return <Tag color="default">Đã trả phòng</Tag>;
      case 'Cancelled': return <Tag color="error" icon={<XCircle/>}> Đã hủy</Tag>;
      default: return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Mã Đơn', dataIndex: 'bookingCode', key: 'code',
      render: (text, record) => <Text strong style={{ color: LUXURY_COLORS.NAVY, fontSize: 15 }}>{text}</Text>
    },
    {
      title: 'Khách hàng', key: 'guest',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: LUXURY_COLORS.DARKEST }}>{record.guestName || 'Khách vãng lai'}</Text>
          <Text type="secondary" style={{ fontSize: 13 }}>{record.guestPhone}</Text>
        </Space>
      )
    },
    {
      title: 'Lịch trình dự kiến', key: 'schedule',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 13 }}>Vào: <Text strong>{dayjs(record.expectedCheckIn).format('DD/MM HH:mm')}</Text></Text>
          <Text style={{ fontSize: 13 }}>Ra: <Text strong>{dayjs(record.expectedCheckOut).format('DD/MM HH:mm')}</Text></Text>
        </Space>
      )
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', align: 'center',
      render: (status) => renderStatus(status)
    },
    {
      title: 'Thao tác', key: 'actions', align: 'center', width: 180,
      render: (_, record) => (
        <Button type="primary" icon={<Eye size={20} />} onClick={() => openDrawer(record.bookingCode)} style={{ backgroundColor: LUXURY_COLORS.DARKEST }}>
           Chi tiết / Thu tiền
        </Button>
      )
    }
  ];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {contextHolder}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <Title level={3} style={{ color: LUXURY_COLORS.DARKEST, margin: 0, fontWeight: 700 }}>Quản lý đơn đặt phòng</Title>
        <Button type="primary" size="large" icon={<CalendarCheck size={20}/>} style={{ backgroundColor: LUXURY_COLORS.ACCENT_RED }} onClick={() => navigate('/admin/bookings/create')}>
           ĐẶT PHÒNG MỚI
        </Button>
      </div>

      <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(13,24,33,0.05)', backgroundColor: LUXURY_COLORS.WHITE }}>
        
        <div style={{ display: 'flex', flexDirection: screens.xs ? 'column' : 'row', justifyContent: 'space-between', alignItems: screens.xs ? 'stretch' : 'center', marginBottom: 16, gap: 16 }}>
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab} 
            style={{ flex: 1 }}
            items={[
              { key: 'ArrivalsToday', label: 'Đến hôm nay' },
              { key: 'InHouse', label: 'Đang lưu trú' },
              { key: 'Upcoming', label: 'Sắp đến' },
              { key: 'PendingPayment', label: 'Chờ thanh toán' },
              { key: 'ALL', label: 'Tất cả' },
            ]}
          />
          <Input 
            placeholder="Tìm tên, SĐT..." 
            prefix={<MagnifyingGlass color={LUXURY_COLORS.MUTED_BLUE} />} 
            allowClear 
            onChange={e => setSearchText(e.target.value)}
            style={{ width: screens.xs ? '100%' : 250 }}
          />
        </div>

        <Table 
            columns={columns} dataSource={processedBookings} rowKey="id" loading={loading}
            pagination={{ pageSize: 10 }}
        />
      </Card>

      <BookingDetailDrawer 
          isOpen={isDrawerOpen} 
          onClose={() => { setIsDrawerOpen(false); fetchBookings(true); }} 
          bookingCode={selectedBookingCode} 
      />
    </div>
  );
}