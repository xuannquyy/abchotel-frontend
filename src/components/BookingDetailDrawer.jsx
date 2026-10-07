import React, { useState, useEffect } from 'react';
import { Drawer, Descriptions, Table, Tag, Button, Space, Typography, Divider, Spin, notification, Popconfirm, Tabs, Collapse, Modal, Form, Select, InputNumber } from 'antd';
import { Printer, XCircle, CreditCard, CheckCircle, ClockCounterClockwise, User, Door, ShoppingCart, WarningCircle, Calculator, Money, QrCode } from '@phosphor-icons/react';
import dayjs from 'dayjs';

import { bookingApi } from '../api/bookingApi';
import { invoiceApi } from '../api/invoiceApi';
import { lossDamageApi } from '../api/lossDamageApi';

const { Title, Text } = Typography;

const LUXURY_COLORS = {
    DARKEST: '#020C1B', NAVY: '#0A192F', MUTED_BLUE: '#3A506B', 
    LIGHT_BLUE: '#E6EBF1', LIGHTEST: '#F4F7FA', GOLD: '#D4AF37', 
    ACCENT_RED: '#8B0000', SUCCESS: '#1B5E20'
};

export default function BookingDetailDrawer({ isOpen, onClose, bookingCode, onSuccess }) {
  const [api, contextHolder] = notification.useNotification({ placement: 'bottomRight' });
  const [loading, setLoading] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  
  const [isWaitingPayment, setIsWaitingPayment] = useState(false);

  const [payForm] = Form.useForm();
  
  const paymentMethod = Form.useWatch('paymentMethod', payForm);
  const amountPaid = Form.useWatch('amountPaid', payForm);

  useEffect(() => {
    if (isOpen && bookingCode) {
      fetchDetail();
    }
  }, [isOpen, bookingCode]);

  useEffect(() => {
    let interval;
    if (isWaitingPayment && invoiceData?.id) {
        interval = setInterval(async () => {
            try {
                const res = await invoiceApi.getByBookingCode(bookingCode);
                if (res && res.status === 'Paid') {
                    setIsWaitingPayment(false); 
                    setIsPayModalOpen(false);   
                    api.success({ message: 'Tuyệt vời!', description: 'Hệ thống đã nhận được tiền từ VNPay/MoMo.' });
                    setInvoiceData(res);        
                    if (onSuccess) onSuccess(); 
                }
            } catch (e) { console.log(e) }
        }, 3000);
    }
    return () => clearInterval(interval); 
  }, [isWaitingPayment, invoiceData?.id, bookingCode]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const bRes = await bookingApi.getByCode(bookingCode);
      setBookingData(bRes);
      
      const iRes = await invoiceApi.getByBookingCode(bookingCode);
      
      if (iRes && iRes.status !== 'Paid') {
         await invoiceApi.recalculate(iRes.id).catch(() => {});
         const updatedInvoice = await invoiceApi.getByBookingCode(bookingCode);
         setInvoiceData(updatedInvoice);
      } else {
         setInvoiceData(iRes);
      }

    } catch (error) {
      api.error({ message: 'Lỗi', description: 'Không thể lấy thông tin chi tiết.' });
      onClose(); 
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    try {
      setLoading(true);
      await bookingApi.updateStatus(bookingData.id, 'Cancelled', 'Hủy bởi Lễ tân (No-Show)');
      api.success({ message: 'Thành công', description: 'Đã hủy đơn đặt phòng.' });
      fetchDetail(); 
      if (onSuccess) onSuccess(); 
    } catch (e) { api.error({ message: 'Lỗi', description: 'Không thể hủy đơn này.' }); } 
    finally { setLoading(false); }
  };

  // 🔥 THÊM MỚI: HÀM NHẬN PHÒNG (CHECK-IN)
  const handleCheckInBooking = async () => {
    try {
      setLoading(true);
      await bookingApi.updateStatus(bookingData.id, 'Checked_in', 'Lễ tân Check-in');
      api.success({ message: 'Thành công', description: 'Đã nhận phòng và tự động bật trạng thái phòng thành Có Khách.' });
      fetchDetail(); 
      if (onSuccess) onSuccess(); 
    } catch (e) { 
      api.error({ message: 'Lỗi', description: 'Không thể Check-in đơn này.' }); 
    } finally { 
      setLoading(false); 
    }
  };

  // 🔥 THÊM MỚI: HÀM TRẢ PHÒNG (CHECK-OUT)
  const handleCheckOutBooking = async () => {
    try {
      // Logic chặn trả phòng nếu khách chưa thanh toán đủ tiền
      if (invoiceData && invoiceData.status !== 'Paid') {
          return api.warning({ message: 'Chưa thanh toán', description: 'Khách cần thanh toán toàn bộ công nợ trước khi hoàn tất trả phòng.' });
      }
      setLoading(true);
      await bookingApi.updateStatus(bookingData.id, 'Completed', 'Khách trả phòng');
      api.success({ message: 'Thành công', description: 'Đã trả phòng và chuyển trạng thái phòng thành Dơ.' });
      fetchDetail(); 
      if (onSuccess) onSuccess(); 
    } catch (e) { 
      api.error({ message: 'Lỗi', description: 'Không thể Check-out đơn này.' }); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleRecalculate = async () => {
    if(!invoiceData) return;
    try {
      setLoading(true);
      await invoiceApi.recalculate(invoiceData.id);
      api.success({ message: 'Thành công', description: 'Đã cập nhật các khoản phát sinh.' });
      fetchDetail(); 
      if (onSuccess) onSuccess(); 
    } catch (e) { api.error({ message: 'Lỗi', description: 'Không thể tính lại.' }); } 
    finally { setLoading(false); }
  };

  const handleCancelDamage = async (damageId) => {
    try {
      setLoading(true);
      await lossDamageApi.updateStatus(damageId, 'Cancelled');
      api.success({ message: 'Thành công', description: 'Đã hủy khoản phạt này.' });
      await handleRecalculate();
    } catch (error) {
      api.error({ message: 'Lỗi', description: 'Không thể hủy khoản đền bù này.' });
    } finally {
      setLoading(false);
    }
  };

  const openPayModal = () => {
    payForm.resetFields();
    payForm.setFieldsValue({ 
        amountPaid: Math.max(0, invoiceData.finalTotal - invoiceData.amountPaid), 
        paymentMethod: 'Cash' 
    });
    setIsPayModalOpen(true);
    setIsWaitingPayment(false); 
  };

  const handlePayment = async (values) => {
    try {
      setLoading(true);
      const safeAmount = Number(values.amountPaid); 

      if (values.paymentMethod === 'VNPay') {
          const res = await invoiceApi.createVnPayUrl(invoiceData.id, false, safeAmount);
          window.open(res.url, '_blank'); 
          setIsWaitingPayment(true);      
          return; 
      }
      if (values.paymentMethod === 'MoMo') {
          const res = await invoiceApi.createMoMoUrl(invoiceData.id, false, safeAmount);
          window.open(res.url, '_blank'); 
          setIsWaitingPayment(true);     
          return;
      }

      await invoiceApi.payCash({
         invoiceId: invoiceData.id,
         paymentMethod: values.paymentMethod,
         amountPaid: safeAmount,
         transactionCode: values.paymentMethod === 'Bank Transfer' ? 'QR_TRANSFER' : 'CASH'
      });
      
      api.success({ message: 'Thành công', description: 'Đã ghi nhận thanh toán vào hệ thống.' });
      setIsPayModalOpen(false);
      
      fetchDetail();
      if (onSuccess) onSuccess(); 

    } catch (e) { 
      const errorMsg = e.response?.data?.message || (e.response?.data?.errors && Object.values(e.response.data.errors)[0]?.[0]) || 'Lỗi hệ thống khi thanh toán.';
      api.error({ message: 'Lỗi', description: errorMsg }); 
    } 
    finally { setLoading(false); }
  };

  const handlePrint = () => window.print();

  const renderStatus = (status) => {
    switch (status) {
      case 'Pending': return <Tag color="warning" icon={<ClockCounterClockwise/>}>Chờ tiền Online</Tag>;
      case 'Confirmed': return <Tag color="processing" icon={<CheckCircle/>}>Sắp đến</Tag>;
      case 'Checked_in': return <Tag color="success">Đang lưu trú</Tag>;
      case 'Completed': return <Tag color="default">Đã trả phòng</Tag>;
      case 'Cancelled': return <Tag color="error" icon={<XCircle/>}>Đã hủy</Tag>;
      default: return <Tag>{status}</Tag>;
    }
  };

  const renderPaymentMethodTag = (method) => {
      if (!method) return null;
      switch (method) {
          case 'VNPay': return <Tag color="blue" style={{fontWeight:'bold', fontSize: 13}}>Thanh toán VNPay</Tag>;
          case 'MoMo': return <Tag color="magenta" style={{fontWeight:'bold', fontSize: 13}}>Thanh toán MoMo</Tag>;
          case 'Bank Transfer': return <Tag color="cyan" style={{fontWeight:'bold', fontSize: 13}}>Chuyển khoản QR</Tag>;
          default: return <Tag color="green" style={{fontWeight:'bold', fontSize: 13}}>Tiền mặt</Tag>;
      }
  };

  const roomColumns = [
    { title: 'Hạng/Phòng', dataIndex: 'roomTypeName', key: 'roomType', render: (text, record) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Text strong style={{ color: LUXURY_COLORS.NAVY }}>{text}</Text>
            <Tag color={record.roomNumber === 'Sẽ xếp khi nhận phòng' ? 'default' : 'blue'} style={{ width: 'max-content', marginTop: 4 }}>{record.roomNumber}</Tag>
        </div>
    )},
    { title: 'Nhận/Trả (Thực tế)', key: 'dates', render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Text style={{ fontSize: 13, color: LUXURY_COLORS.DARKEST }}>{dayjs(record.checkIn).format('DD/MM/YYYY HH:mm')}</Text>
            <Text style={{ fontSize: 13, color: LUXURY_COLORS.DARKEST }}>{dayjs(record.checkOut).format('DD/MM/YYYY HH:mm')}</Text>
        </div>
    )},
    { title: 'Đơn giá', key: 'price', align: 'right', render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <Text strong style={{ color: LUXURY_COLORS.ACCENT_RED }}>{new Intl.NumberFormat('vi-VN').format(record.price)}đ</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.priceType === 'HOURLY' ? '(Giá/Giờ)' : '(Giá/Đêm)'}</Text>
        </div>
    )}
  ];

  const serviceColumns = [
    { title: 'Dịch vụ', dataIndex: 'serviceName', key: 'serviceName' },
    { title: 'Thời gian gọi', dataIndex: 'date', key: 'date', render: (val) => dayjs(val).format('DD/MM HH:mm') },
    { title: 'SL', dataIndex: 'quantity', key: 'quantity', width: 50 },
    { title: 'Thành tiền', dataIndex: 'totalAmount', key: 'totalAmount', align: 'right', render: (val) => <Text strong>{new Intl.NumberFormat('vi-VN').format(val)}đ</Text> }
  ];

  const damageColumns = [
    { title: 'Sự cố/Vật tư', dataIndex: 'itemName', key: 'itemName' },
    { 
        title: 'Phạt đền bù', dataIndex: 'penaltyAmount', key: 'penaltyAmount', align: 'right', 
        render: (val) => <Text type="danger" strong>{new Intl.NumberFormat('vi-VN').format(val)}đ</Text> 
    },
    {
        title: 'Thao tác', key: 'action', align: 'center', width: 100,
        render: (_, record) => (
            invoiceData?.status !== 'Paid' && (
                <Popconfirm 
                    title="Hủy/Miễn trừ khoản này?" 
                    onConfirm={() => handleCancelDamage(record.id)}
                    okText="Đồng ý" cancelText="Đóng"
                >
                    <Button type="link" style={{color: LUXURY_COLORS.MUTED_BLUE}} icon={<XCircle />}>Miễn phạt</Button>
                </Popconfirm>
            )
        )
    }
  ];

  const collapseItems = invoiceData ? [
    {
      key: '1',
      label: <Text strong style={{color: LUXURY_COLORS.NAVY}}><ShoppingCart size={18}/> Phí Lưu Trú & Dịch Vụ</Text>,
      children: (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text>Tổng Tiền Phòng:</Text>
                <Text strong>{new Intl.NumberFormat('vi-VN').format(invoiceData.totalRoomAmount)}đ</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>Tổng Dịch Vụ (Minibar, Giặt ủi...):</Text>
                <Text strong>{new Intl.NumberFormat('vi-VN').format(invoiceData.totalServiceAmount)}đ</Text>
            </div>
            {invoiceData.services?.length > 0 && <Table rowKey={(r, i) => i} columns={serviceColumns} dataSource={invoiceData.services} size="small" pagination={false} style={{ marginTop: 12 }} />}
        </>
      )
    }
  ] : [];

  if (invoiceData && invoiceData.damages?.length > 0) {
      collapseItems.push({
          key: '2',
          label: <Text strong style={{ color: LUXURY_COLORS.ACCENT_RED }}><WarningCircle size={18}/> Phí Đền Bù / Trách nhiệm</Text>,
          children: <Table rowKey={(r, i) => i} columns={damageColumns} dataSource={invoiceData.damages} size="small" pagination={false} />
      });
  }

  return (
    <>
      {contextHolder}
      <Drawer
        title={
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Title level={4} style={{ color: LUXURY_COLORS.DARKEST, margin: 0, fontWeight: 900 }}>Đơn {bookingCode}</Title>
              {bookingData && renderStatus(bookingData.status)}
            </Space>
          </div>
        }
        placement="right" size="large" onClose={onClose} open={isOpen} className="no-print"
      >
        {loading || !bookingData ? (
          <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <Tabs defaultActiveKey="1" tabBarStyle={{fontWeight: 'bold', color: LUXURY_COLORS.NAVY}}>
                    <Tabs.TabPane tab={<span><User size={16} style={{verticalAlign: 'text-bottom'}}/> THÔNG TIN LƯU TRÚ</span>} key="1">
                        <Descriptions column={1} size="small" bordered style={{ marginBottom: 24, backgroundColor: '#fff', border: `1px solid ${LUXURY_COLORS.LIGHT_BLUE}` }}>
                            <Descriptions.Item label={<Text strong style={{color: LUXURY_COLORS.NAVY}}>Họ tên</Text>}>{bookingData.guestName || 'Khách vãng lai'}</Descriptions.Item>
                            <Descriptions.Item label={<Text strong style={{color: LUXURY_COLORS.NAVY}}>Số điện thoại</Text>}>{bookingData.guestPhone || '---'}</Descriptions.Item>
                            <Descriptions.Item label={<Text strong style={{color: LUXURY_COLORS.NAVY}}>CCCD/Passport</Text>}>{bookingData.identityNumber || <Text type="secondary">Chưa cung cấp</Text>}</Descriptions.Item>
                            <Descriptions.Item label={<Text strong style={{color: LUXURY_COLORS.NAVY}}>Ghi chú của khách</Text>}>{bookingData.specialRequests || 'Không có'}</Descriptions.Item>
                        </Descriptions>

                        <Title level={5} style={{ color: LUXURY_COLORS.NAVY, fontWeight: 800 }}><Door size={18} style={{ verticalAlign: 'text-bottom' }}/> Chi tiết Phòng</Title>
                        <Table columns={roomColumns} dataSource={bookingData.rooms} rowKey={(r, i) => i} pagination={false} size="small" style={{ border: `1px solid ${LUXURY_COLORS.LIGHT_BLUE}`, borderRadius: 8 }} />
                        
                        {/* 🔥 ĐÃ THÊM CÁC NÚT THAO TÁC (NHẬN PHÒNG / TRẢ PHÒNG / HỦY) Ở ĐÂY */}
                        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            {(bookingData.status === 'Pending' || bookingData.status === 'Confirmed') && (
                                <>
                                    <Popconfirm title="Khách hủy đột xuất hoặc Không đến (No-Show)?" onConfirm={handleCancelBooking}>
                                        <Button danger style={{backgroundColor: '#fff', borderColor: LUXURY_COLORS.ACCENT_RED, color: LUXURY_COLORS.ACCENT_RED}} icon={<XCircle size={18} />}>Hủy Đơn Này</Button>
                                    </Popconfirm>
                                    
                                    <Popconfirm title="Xác nhận khách đã đến và tiến hành giao phòng?" onConfirm={handleCheckInBooking} okText="Nhận phòng" cancelText="Hủy">
                                        <Button type="primary" style={{ backgroundColor: LUXURY_COLORS.SUCCESS, borderColor: LUXURY_COLORS.SUCCESS }} icon={<CheckCircle size={18} />}>
                                            Khách Nhận Phòng
                                        </Button>
                                    </Popconfirm>
                                </>
                            )}

                            {bookingData.status === 'Checked_in' && (
                                <Popconfirm title="Xác nhận khách trả phòng và hoàn tất đơn?" onConfirm={handleCheckOutBooking} okText="Trả phòng" cancelText="Hủy">
                                    <Button type="primary" style={{ backgroundColor: LUXURY_COLORS.NAVY, borderColor: LUXURY_COLORS.NAVY }} icon={<Door size={18} />}>
                                        Khách Trả Phòng
                                    </Button>
                                </Popconfirm>
                            )}
                        </div>
                    </Tabs.TabPane>

                    <Tabs.TabPane tab={<span><Calculator size={16} style={{verticalAlign: 'text-bottom'}}/> HÓA ĐƠN & THANH TOÁN</span>} key="2">
                        {invoiceData ? (
                            <div style={{ backgroundColor: LUXURY_COLORS.LIGHTEST, padding: 16, borderRadius: 8, border: `2px solid ${LUXURY_COLORS.NAVY}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                                    <Title level={5} style={{ margin: 0, color: LUXURY_COLORS.DARKEST, fontWeight: 900 }}>Biên lai #{invoiceData.id}</Title>
                                    <Space>
                                        {invoiceData.status === 'Paid' && renderPaymentMethodTag(invoiceData.paymentMethod)}
                                        {invoiceData.status === 'Paid' ? <Tag color="success" icon={<CheckCircle/>}>ĐÃ THANH TOÁN</Tag> : <Tag color="error" style={{background: LUXURY_COLORS.ACCENT_RED, color: '#fff'}} icon={<WarningCircle/>}>CHƯA THU ĐỦ TIỀN</Tag>}
                                    </Space>
                                </div>

                                <Collapse defaultActiveKey={['1', '2']} items={collapseItems} style={{ marginBottom: 16, backgroundColor: '#fff', border: `1px solid ${LUXURY_COLORS.LIGHT_BLUE}` }} />

                                <Divider style={{ borderColor: LUXURY_COLORS.MUTED_BLUE }} />
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <Text type="secondary">Mã giảm giá / Thành viên</Text>
                                    <Text strong style={{ color: LUXURY_COLORS.SUCCESS }}>- {new Intl.NumberFormat('vi-VN').format(invoiceData.discountAmount)}đ</Text>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <Text type="secondary">Thuế VAT (10%)</Text>
                                    <Text>{new Intl.NumberFormat('vi-VN').format(invoiceData.taxAmount)}đ</Text>
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16, padding: '12px 0', borderTop: `2px dashed ${LUXURY_COLORS.MUTED_BLUE}` }}>
                                    <Title level={5} style={{ margin: 0, color: LUXURY_COLORS.NAVY, fontWeight: 900 }}>TỔNG CỘNG TIỀN PHẢI TRẢ</Title>
                                    <Title level={3} style={{ color: LUXURY_COLORS.ACCENT_RED, margin: 0, fontWeight: 900 }}>{new Intl.NumberFormat('vi-VN').format(invoiceData.finalTotal)}đ</Title>
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, padding: '16px', backgroundColor: '#fff', borderRadius: 8, border: `2px solid ${invoiceData.finalTotal - invoiceData.amountPaid > 0 ? LUXURY_COLORS.ACCENT_RED : LUXURY_COLORS.SUCCESS}` }}>
                                    <Text strong style={{ fontSize: 16, color: LUXURY_COLORS.DARKEST }}>KHÁCH CÒN NỢ:</Text>
                                    <Text strong style={{ fontSize: 18, color: invoiceData.finalTotal - invoiceData.amountPaid > 0 ? LUXURY_COLORS.ACCENT_RED : LUXURY_COLORS.SUCCESS }}>
                                        {new Intl.NumberFormat('vi-VN').format(Math.max(0, invoiceData.finalTotal - invoiceData.amountPaid))}đ
                                    </Text>
                                </div>

                                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                                    <Button icon={<Calculator/>} onClick={handleRecalculate} disabled={invoiceData.status === 'Paid'} style={{ color: LUXURY_COLORS.NAVY }}>Cập nhật lại</Button>
                                    
                                    {invoiceData.status !== 'Paid' && (bookingData.status === 'Checked_in' || bookingData.status === 'Confirmed') && (
                                        <Button type="primary" icon={<CreditCard size={20}/>} onClick={openPayModal} style={{ backgroundColor: LUXURY_COLORS.NAVY, padding: '0 24px', height: 40, fontWeight: 'bold' }}>
                                            THU TIỀN NGAY
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ) : ( <div style={{ textAlign: 'center', padding: 40 }}><Spin /> Đang nạp dữ liệu tài chính...</div> )}
                    </Tabs.TabPane>
                </Tabs>
            </div>

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${LUXURY_COLORS.LIGHT_BLUE}`, display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={onClose} size="large" style={{fontWeight: 600}}>Đóng</Button>
              <Button type="primary" size="large" icon={<Printer size={20} />} onClick={handlePrint} disabled={!invoiceData || invoiceData.status !== 'Paid'} style={{ backgroundColor: LUXURY_COLORS.GOLD, color: LUXURY_COLORS.DARKEST, fontWeight: 'bold', border: 'none' }}>
                  IN BIÊN LAI (GIAO KHÁCH)
              </Button>
            </div>

          </div>
        )}
      </Drawer>

      <Modal title={<span style={{ color: LUXURY_COLORS.NAVY, fontSize: 18, fontWeight: 900 }}>Thu tiền Khách hàng</span>} open={isPayModalOpen} onCancel={() => { setIsPayModalOpen(false); setIsWaitingPayment(false); }} footer={null} centered width={450}>
        {isWaitingPayment ? (
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <Spin size="large" />
                <Title level={4} style={{ marginTop: 24, color: LUXURY_COLORS.NAVY }}>Đang chờ thanh toán...</Title>
                <Text type="secondary" style={{ fontSize: 15, display: 'block' }}>Vui lòng yêu cầu khách hàng hoàn tất thanh toán trên Tab VNPAY/MOMO vừa được mở ra.</Text>
                <div style={{ marginTop: 32 }}>
                    <Button danger onClick={() => setIsWaitingPayment(false)} style={{ width: '100%' }}>Hủy chờ / Chọn cách thanh toán khác</Button>
                </div>
            </div>
        ) : (
            <Form form={payForm} layout="vertical" onFinish={handlePayment} style={{ marginTop: 24 }}>
                <Form.Item name="paymentMethod" label={<span style={{fontWeight: 'bold', color: LUXURY_COLORS.NAVY}}>Phương thức thanh toán</span>} rules={[{ required: true }]}>
                    <Select size="large">
                        <Select.Option value="Cash"><Space><Money color={LUXURY_COLORS.SUCCESS} /> Tiền mặt (Lễ tân thu)</Space></Select.Option>
                        <Select.Option value="Bank Transfer"><Space><QrCode color={LUXURY_COLORS.NAVY} /> Quét mã QR Ngân Hàng</Space></Select.Option>
                        <Select.Option value="VNPay"><Space><CreditCard color="blue" /> Cổng thanh toán VNPay</Space></Select.Option>
                        <Select.Option value="MoMo"><Space><CreditCard color="magenta" /> Ví điện tử MoMo</Space></Select.Option>
                    </Select>
                </Form.Item>
                
                <Form.Item name="amountPaid" label={<span style={{fontWeight: 'bold', color: LUXURY_COLORS.NAVY}}>Số tiền khách trả (VNĐ)</span>} rules={[{ required: true }]}>
                    <InputNumber 
                        size="large" 
                        style={{ width: '100%', fontSize: 18, color: LUXURY_COLORS.ACCENT_RED, fontWeight: 'bold' }} 
                        formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                        parser={v => {
                            const numStr = v ? v.toString().replace(/\D/g, '') : '';
                            return numStr ? parseInt(numStr, 10) : '';
                        }} 
                    />
                </Form.Item>

                {paymentMethod === 'Bank Transfer' && amountPaid > 0 && invoiceData && (
                <div style={{ textAlign: 'center', backgroundColor: LUXURY_COLORS.LIGHTEST, padding: 16, borderRadius: 8, border: `2px dashed ${LUXURY_COLORS.NAVY}`, marginBottom: 16 }}>
                    <Text strong style={{ color: LUXURY_COLORS.NAVY, display: 'block', marginBottom: 8 }}>Khách quét mã bên dưới để thanh toán đúng số tiền:</Text>
                    <img 
                        src={`https://qr.sepay.vn/img?bank=VIB&acc=034537384&template=qronly&amount=${amountPaid}&des=Thanh+toan+don+${bookingCode}`} 
                        alt="VietQR" 
                        style={{ width: 220, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                    />
                </div>
                )}

                <div style={{ textAlign: 'right', marginTop: 16 }}>
                    <Button size="large" onClick={() => setIsPayModalOpen(false)} style={{ marginRight: 8, fontWeight: 600 }}>Hủy</Button>
                    <Button size="large" type="primary" htmlType="submit" loading={loading} style={{ backgroundColor: LUXURY_COLORS.ACCENT_RED, fontWeight: 'bold', border: 'none' }}>
                        {paymentMethod === 'VNPay' || paymentMethod === 'MoMo' ? 'MỞ TRANG THANH TOÁN' : 'GHI NHẬN THANH TOÁN'}
                    </Button>
                </div>
            </Form>
        )}
      </Modal>

      {invoiceData && bookingData && (
        <div className="print-only">
          <div style={{ textAlign: 'center', marginBottom: 24, borderBottom: `2px solid ${LUXURY_COLORS.NAVY}`, paddingBottom: 16 }}>
            <h1 style={{ margin: 0, color: LUXURY_COLORS.NAVY, letterSpacing: '2px' }}>ABC LUXURY HOTEL</h1>
            <p style={{ margin: '4px 0' }}>123 Đường Tôn Đức Thắng, Phường Trấn Biên, Biên Hòa</p>
            <p style={{ margin: 0 }}>SĐT: 0123.456.789 | Email: contact@abchotel.vn</p>
            <h2 style={{ marginTop: 16, color: '#000' }}>BIÊN LAI THANH TOÁN (FOLIO)</h2>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30 }}>
            <div>
              <p style={{ margin: '4px 0' }}><b>Khách hàng:</b> {bookingData.guestName}</p>
              <p style={{ margin: '4px 0' }}><b>Số điện thoại:</b> {bookingData.guestPhone}</p>
              <p style={{ margin: '4px 0' }}><b>Lưu trú:</b> Từ {dayjs(bookingData.rooms[0]?.checkInDate).format('DD/MM/YYYY HH:mm')} đến {dayjs(bookingData.rooms[0]?.checkOutDate).format('DD/MM/YYYY HH:mm')}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '4px 0' }}><b>Hóa đơn số:</b> INV-{invoiceData.id}</p>
              <p style={{ margin: '4px 0' }}><b>Mã Booking:</b> {bookingData.bookingCode}</p>
              <p style={{ margin: '4px 0' }}><b>Ngày in bill:</b> {dayjs().format('DD/MM/YYYY HH:mm')}</p>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 30 }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0', borderBottom: '2px solid #000', borderTop: '2px solid #000' }}>
                <th style={{ textAlign: 'left', padding: '12px 8px' }}>HẠNG MỤC PHÁT SINH</th>
                <th style={{ textAlign: 'right', padding: '12px 8px' }}>THÀNH TIỀN (VNĐ)</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={{ padding: '12px 8px', borderBottom: '1px dashed #ccc' }}>1. Phí thuê phòng</td><td style={{ textAlign: 'right', padding: '12px 8px', borderBottom: '1px dashed #ccc' }}>{new Intl.NumberFormat('vi-VN').format(invoiceData.totalRoomAmount)}</td></tr>
              <tr><td style={{ padding: '12px 8px', borderBottom: '1px dashed #ccc' }}>2. Dịch vụ (Minibar, Nhà hàng, Giặt ủi...)</td><td style={{ textAlign: 'right', padding: '12px 8px', borderBottom: '1px dashed #ccc' }}>{new Intl.NumberFormat('vi-VN').format(invoiceData.totalServiceAmount)}</td></tr>
              {invoiceData.totalDamageAmount > 0 && <tr><td style={{ padding: '12px 8px', borderBottom: '1px dashed #ccc' }}>3. Phí đền bù hư hỏng vật tư</td><td style={{ textAlign: 'right', padding: '12px 8px', borderBottom: '1px dashed #ccc' }}>{new Intl.NumberFormat('vi-VN').format(invoiceData.totalDamageAmount)}</td></tr>}
              <tr><td style={{ padding: '12px 8px', borderBottom: '1px dashed #ccc' }}>Trừ: Khuyến mãi / Ưu đãi hạng thẻ</td><td style={{ textAlign: 'right', padding: '12px 8px', borderBottom: '1px dashed #ccc' }}>- {new Intl.NumberFormat('vi-VN').format(invoiceData.discountAmount)}</td></tr>
              <tr><td style={{ padding: '12px 8px', borderBottom: '2px solid #000' }}>Thuế giá trị gia tăng (VAT 10%)</td><td style={{ textAlign: 'right', padding: '12px 8px', borderBottom: '2px solid #000' }}>{new Intl.NumberFormat('vi-VN').format(invoiceData.taxAmount)}</td></tr>
            </tbody>
          </table>

          <div style={{ textAlign: 'right', fontSize: 18 }}>
            <p style={{ margin: '8px 0' }}><b>TỔNG THANH TOÁN:</b> <span style={{ fontSize: 24, fontWeight: 'bold' }}>{new Intl.NumberFormat('vi-VN').format(invoiceData.finalTotal)}đ</span></p>
            <p style={{ margin: '8px 0' }}><b>Đã thu của khách:</b> {new Intl.NumberFormat('vi-VN').format(invoiceData.amountPaid)}đ</p>
            <p style={{ margin: '8px 0', fontStyle: 'italic', fontSize: 14 }}>Hóa đơn này đã được thanh toán đầy đủ qua hệ thống.</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 60 }}>
            <div style={{ textAlign: 'center' }}>
                <p><b>KHÁCH HÀNG</b></p>
                <p style={{ fontStyle: 'italic', fontSize: 12 }}>(Ký và ghi rõ họ tên)</p>
            </div>
            <div style={{ textAlign: 'center' }}>
                <p><b>THU NGÂN</b></p>
                <p style={{ fontStyle: 'italic', fontSize: 12 }}>(Ký và ghi rõ họ tên)</p>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', marginTop: 100, borderTop: '1px solid #000', paddingTop: 16 }}>
            <p><i>Cảm ơn quý khách đã tin tưởng và lựa chọn dịch vụ của ABC Hotel. Chúc quý khách một chuyến đi vui vẻ!</i></p>
          </div>
        </div>
      )}

      <style>{`
        .print-only { display: none; }
        @media print {
          body * { visibility: hidden; }
          .print-only, .print-only * { visibility: visible; }
          .print-only { display: block; position: absolute; left: 0; top: 0; width: 100%; padding: 20px; font-family: 'Times New Roman', serif; color: #000; }
        }
        .ant-tabs-nav::before { border-bottom: 2px solid ${LUXURY_COLORS.NAVY} !important; }
      `}</style>
    </>
  );
}