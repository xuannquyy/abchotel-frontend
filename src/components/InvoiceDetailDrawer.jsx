import React, { useState, useEffect } from 'react';
import { Card, Drawer, Descriptions, Table, Tag, Button, Space, Typography, Divider, Spin, notification, Collapse, Modal, Form, Select, InputNumber, Popconfirm } from 'antd';
import { Printer, CreditCard, ShoppingCart, WarningCircle, CheckCircle, Calculator, Money, QrCode, XCircle, HandCoins } from '@phosphor-icons/react';
import dayjs from 'dayjs';

import { invoiceApi } from '../api/invoiceApi';
import { lossDamageApi } from '../api/lossDamageApi'; 

const { Title, Text } = Typography;

const LUXURY_COLORS = {
    DARKEST: '#020C1B', NAVY: '#0A192F', MUTED_BLUE: '#3A506B', 
    LIGHT_BLUE: '#E6EBF1', LIGHTEST: '#F4F7FA', GOLD: '#D4AF37', 
    ACCENT_RED: '#8B0000', SUCCESS: '#1B5E20'
};

export default function InvoiceDetailDrawer({ isOpen, onClose, invoiceId, onSuccess }) {
  const [api, contextHolder] = notification.useNotification();
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState(null);
  
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  
  // 🔥 1. THÊM STATE ĐỂ QUẢN LÝ VÒNG QUAY CHỜ THANH TOÁN TỪ TAB KHÁC
  const [isWaitingPayment, setIsWaitingPayment] = useState(false);

  const [payForm] = Form.useForm();
  
  const paymentMethod = Form.useWatch('paymentMethod', payForm);
  const amountPaid = Form.useWatch('amountPaid', payForm);

  useEffect(() => {
    if (isOpen && invoiceId) fetchInvoiceDetail();
  }, [isOpen, invoiceId]);

  // 🔥 2. THUẬT TOÁN POLLING: CỨ MỖI 3 GIÂY SẼ HỎI BACKEND 1 LẦN
  useEffect(() => {
    let interval;
    if (isWaitingPayment && invoiceId) {
        interval = setInterval(async () => {
            try {
                const res = await invoiceApi.getById(invoiceId);
                if (res && res.status === 'Paid') {
                    setIsWaitingPayment(false); 
                    setIsPayModalOpen(false);   
                    api.success({ message: 'Tuyệt vời!', description: 'Hệ thống đã nhận được tiền từ VNPay/MoMo.' });
                    fetchInvoiceDetail();       
                    if (onSuccess) onSuccess(); 
                }
            } catch (e) { console.log(e) }
        }, 3000);
    }
    return () => clearInterval(interval); 
  }, [isWaitingPayment, invoiceId]);

  const fetchInvoiceDetail = async () => {
    try {
      setLoading(true);
      await invoiceApi.recalculate(invoiceId).catch(() => {});

      const res = await invoiceApi.getById(invoiceId);
      setInvoice(res);
    } catch (error) {
      api.error({ message: 'Lỗi', description: 'Không thể lấy thông tin hóa đơn.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      setLoading(true);
      await invoiceApi.recalculate(invoiceId);
      api.success({ message: 'Thành công', description: 'Đã cập nhật lại tổng tiền.' });
      fetchInvoiceDetail(); 
      if (onSuccess) onSuccess(); 
    } catch (e) {
      api.error({ message: 'Lỗi', description: 'Không thể tính lại.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDamage = async (damageId) => {
    try {
      setLoading(true);
      await lossDamageApi.updateStatus(damageId, 'Cancelled');
      api.success({ message: 'Thành công', description: 'Đã hủy khoản phạt này.' });
      await handleRecalculate();
    } catch (e) {
      api.error({ message: 'Lỗi', description: 'Không thể hủy khoản đền bù này.' });
    } finally {
      setLoading(false);
    }
  };

  // 🔥 LOGIC KẾ TOÁN XÁC NHẬN ĐÃ HOÀN TIỀN
  const handleConfirmRefund = async () => {
      try {
          setLoading(true);
          await invoiceApi.markRefunded(invoiceId);
          api.success({ message: 'Hoàn tất', description: 'Đã ghi nhận đóng hồ sơ hoàn tiền cho khách.' });
          fetchInvoiceDetail();
          if (onSuccess) onSuccess();
      } catch (e) {
          api.error({ message: 'Lỗi', description: 'Có lỗi xảy ra khi xác nhận hoàn tiền.' });
      } finally {
          setLoading(false);
      }
  };

  const openPayModal = () => {
    payForm.resetFields();
    payForm.setFieldsValue({ 
        amountPaid: Math.max(0, invoice.finalTotal - invoice.amountPaid), 
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
          const res = await invoiceApi.createVnPayUrl(invoiceId, false, safeAmount);
          window.open(res.url, '_blank'); 
          setIsWaitingPayment(true);      
          return;
      }
      if (values.paymentMethod === 'MoMo') {
          const res = await invoiceApi.createMoMoUrl(invoiceId, false, safeAmount);
          window.open(res.url, '_blank'); 
          setIsWaitingPayment(true);      
          return;
      }

      await invoiceApi.payCash({
         invoiceId: invoiceId,
         paymentMethod: values.paymentMethod,
         amountPaid: safeAmount,
         transactionCode: values.paymentMethod === 'Bank Transfer' ? 'QR_TRANSFER' : 'CASH'
      });
      
      api.success({ message: 'Thành công', description: 'Ghi nhận thanh toán hoàn tất.' });
      setIsPayModalOpen(false);
      
      fetchInvoiceDetail();
      if (onSuccess) onSuccess();
    } catch (e) { 
      const errorMsg = e.response?.data?.message || (e.response?.data?.errors && Object.values(e.response.data.errors)[0]?.[0]) || 'Lỗi thanh toán.';
      api.error({ message: 'Lỗi', description: errorMsg }); 
    } 
    finally { setLoading(false); }
  };

  const handlePrint = () => window.print();

  const renderPaymentMethodTag = (method) => {
      if (!method) return null;
      switch (method) {
          case 'VNPay': return <Tag color="blue" style={{fontWeight:'bold', fontSize: 13}}>Thanh toán VNPay</Tag>;
          case 'MoMo': return <Tag color="magenta" style={{fontWeight:'bold', fontSize: 13}}>Thanh toán MoMo</Tag>;
          case 'Bank Transfer': return <Tag color="cyan" style={{fontWeight:'bold', fontSize: 13}}>Chuyển khoản QR</Tag>;
          default: return <Tag color="green" style={{fontWeight:'bold', fontSize: 13}}>Tiền mặt</Tag>;
      }
  };

  const renderInvoiceStatusTag = (status) => {
      switch (status) {
          case 'Unpaid': return <Tag color="error" style={{background: LUXURY_COLORS.ACCENT_RED, color: '#fff'}} icon={<WarningCircle/>}>CHƯA CỌC</Tag>;
          case 'Partial': return <Tag color="processing">ĐÃ CỌC (CÒN NỢ)</Tag>;
          case 'Paid': return <Tag color="success" icon={<CheckCircle/>}>ĐÃ THANH TOÁN</Tag>;
          case 'Refund_Pending': return <Tag color="warning" style={{background: '#d97706', color: '#fff', borderColor: '#d97706'}} icon={<WarningCircle/>}>CHỜ HOÀN TIỀN</Tag>;
          case 'Refunded': return <Tag color="default">ĐÃ TRẢ KHÁCH</Tag>;
          case 'Cancelled': return <Tag color="default">ĐÃ HỦY</Tag>;
          default: return <Tag>{status}</Tag>;
      }
  };

  const serviceColumns = [
    { title: 'Tên dịch vụ', dataIndex: 'serviceName', key: 'serviceName' },
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
            invoice.status !== 'Paid' && (
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

  const collapseItems = invoice ? [
    {
      key: '1',
      label: <Text strong style={{ color: LUXURY_COLORS.NAVY }}><ShoppingCart size={18}/> Phí Lưu Trú & Dịch Vụ</Text>,
      children: (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text>Tổng Tiền Phòng:</Text>
                <Text strong>{new Intl.NumberFormat('vi-VN').format(invoice.totalRoomAmount)}đ</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>Tổng Dịch Vụ (Minibar, Giặt ủi...):</Text>
                <Text strong>{new Intl.NumberFormat('vi-VN').format(invoice.totalServiceAmount)}đ</Text>
            </div>
            {invoice.services?.length > 0 && <Table rowKey={(r, i) => i} columns={serviceColumns} dataSource={invoice.services} size="small" pagination={false} style={{ marginTop: 8 }} />}
        </>
      )
    }
  ] : [];

  if (invoice && invoice.damages?.length > 0) {
      collapseItems.push({
          key: '2',
          label: <Text strong style={{ color: LUXURY_COLORS.ACCENT_RED }}><WarningCircle size={18}/> Phí Đền Bù / Trách nhiệm</Text>,
          children: <Table rowKey={(r, i) => i} columns={damageColumns} dataSource={invoice.damages} size="small" pagination={false} />
      });
  }

  return (
    <>
      {contextHolder}
      <Drawer
        title={
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <Space>
                    <Calculator size={24} color={LUXURY_COLORS.NAVY}/> 
                    <Title level={4} style={{ margin: 0, color: LUXURY_COLORS.DARKEST, fontWeight: 900 }}>Hóa đơn #{invoiceId}</Title>
                </Space>
                <Space>
                    {invoice && (invoice.status === 'Paid' || invoice.status === 'Partial') && renderPaymentMethodTag(invoice.paymentMethod)}
                    {invoice && renderInvoiceStatusTag(invoice.status)}
                </Space>
            </div>
        }
        placement="right" size="large" onClose={onClose} open={isOpen} className="no-print"
      >
        {loading && !invoice ? <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" /></div> : invoice && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
              
              {/* KHỐI CẢNH BÁO CHO KẾ TOÁN NẾU LÀ ĐƠN HOÀN TIỀN */}
              {invoice.status === 'Refund_Pending' && (
                  <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                      <Space align="start">
                          <WarningCircle size={24} color="#d97706" weight="fill" style={{marginTop: 2}}/>
                          <div>
                              <Text strong style={{ color: '#b45309', fontSize: 16, display: 'block', marginBottom: 4 }}>KHÁCH ĐÃ HỦY PHÒNG - CẦN TRẢ LẠI TIỀN CỌC!</Text>
                              <Text style={{ color: '#92400e' }}>
                                  Vui lòng liên hệ số điện thoại <b style={{fontSize: 16}}>{invoice.guestPhone || 'Chưa cung cấp'}</b> để xin STK ngân hàng và chuyển khoản trả lại số tiền <b>{new Intl.NumberFormat('vi-VN').format(invoice.amountPaid)}đ</b>.
                                  Sau khi chuyển xong, bấm nút "Xác nhận Đã hoàn tiền" bên dưới.
                              </Text>
                          </div>
                      </Space>
                  </div>
              )}

              <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 8, border: `2px solid ${LUXURY_COLORS.NAVY}`, marginBottom: 16 }}>
                 <Descriptions column={2} size="small">
                    <Descriptions.Item label="Mã Đặt Phòng"><Text strong style={{ color: LUXURY_COLORS.NAVY }}>{invoice.bookingCode}</Text></Descriptions.Item>
                    <Descriptions.Item label="Khách hàng"><Text strong>{invoice.guestName || 'Khách vãng lai'}</Text></Descriptions.Item>
                    <Descriptions.Item label="SĐT Khách"><Text strong style={{ color: LUXURY_COLORS.ACCENT_RED }}>{invoice.guestPhone || '---'}</Text></Descriptions.Item>
                    <Descriptions.Item label="Ngày lập HĐ">{dayjs(invoice.createdAt).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
                 </Descriptions>
              </div>

              <Collapse defaultActiveKey={['1', '2']} items={collapseItems} style={{ marginBottom: 16, backgroundColor: '#fff', border: `1px solid ${LUXURY_COLORS.LIGHT_BLUE}` }} />

              <Divider style={{ margin: '16px 0', borderColor: LUXURY_COLORS.LIGHT_BLUE }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                 <Text type="secondary">Khuyến mãi / Chiết khấu:</Text>
                 <Text strong style={{ color: LUXURY_COLORS.SUCCESS }}>- {new Intl.NumberFormat('vi-VN').format(invoice.discountAmount)}đ</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                 <Text type="secondary">Thuế VAT (10%)</Text>
                 <Text>{new Intl.NumberFormat('vi-VN').format(invoice.taxAmount)}đ</Text>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16, padding: '12px 0', borderTop: `2px dashed ${LUXURY_COLORS.MUTED_BLUE}` }}>
                 <Title level={5} style={{ margin: 0, color: LUXURY_COLORS.NAVY, fontWeight: 900 }}>TỔNG ĐƠN GIÁ</Title>
                 {invoice.status === 'Cancelled' || invoice.status === 'Refund_Pending' || invoice.status === 'Refunded' ? (
                     <Text style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: 18 }}>{new Intl.NumberFormat('vi-VN').format(invoice.finalTotal)}đ</Text>
                 ) : (
                     <Title level={3} style={{ color: LUXURY_COLORS.ACCENT_RED, margin: 0, fontWeight: 900 }}>{new Intl.NumberFormat('vi-VN').format(invoice.finalTotal)}đ</Title>
                 )}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                 <Text type="secondary">Khách đã trả / Cọc:</Text>
                 <Text strong style={{ color: LUXURY_COLORS.SUCCESS, fontSize: 16 }}>{new Intl.NumberFormat('vi-VN').format(invoice.amountPaid)}đ</Text>
              </div>
              
              {/* Tùy trạng thái mà hiển thị NỢ hoặc TRẢ */}
              {(invoice.status === 'Unpaid' || invoice.status === 'Partial' || invoice.status === 'Paid') && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, padding: '16px', backgroundColor: '#fff', borderRadius: 8, border: `2px solid ${invoice.finalTotal - invoice.amountPaid > 0 ? LUXURY_COLORS.ACCENT_RED : LUXURY_COLORS.SUCCESS}` }}>
                    <Text strong style={{ fontSize: 16, color: LUXURY_COLORS.DARKEST }}>KHÁCH CÒN NỢ:</Text>
                    <Text strong style={{ fontSize: 18, color: invoice.finalTotal - invoice.amountPaid > 0 ? LUXURY_COLORS.ACCENT_RED : LUXURY_COLORS.SUCCESS }}>
                        {new Intl.NumberFormat('vi-VN').format(Math.max(0, invoice.finalTotal - invoice.amountPaid))}đ
                    </Text>
                </div>
              )}

              {invoice.status === 'Refund_Pending' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, padding: '16px', backgroundColor: '#fffbeb', borderRadius: 8, border: `2px solid #d97706` }}>
                    <Text strong style={{ fontSize: 16, color: '#92400e' }}>CẦN TRẢ LẠI KHÁCH:</Text>
                    <Text strong style={{ fontSize: 18, color: '#d97706' }}>
                        {new Intl.NumberFormat('vi-VN').format(invoice.amountPaid)}đ
                    </Text>
                </div>
              )}
            </div>

            <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${LUXURY_COLORS.LIGHT_BLUE}`, display: 'flex', justifyContent: 'space-between' }}>
              <Button icon={<Calculator/>} onClick={handleRecalculate} disabled={invoice.status !== 'Unpaid' && invoice.status !== 'Partial'} style={{ color: LUXURY_COLORS.NAVY }}>Cập nhật lại</Button>
              <Space>
                <Button type="primary" size="large" icon={<Printer size={20} />} onClick={handlePrint} disabled={invoice.status === 'Cancelled' || invoice.status === 'Refund_Pending' || invoice.status === 'Refunded'} style={{ backgroundColor: LUXURY_COLORS.GOLD, color: LUXURY_COLORS.DARKEST, fontWeight: 'bold', border: 'none' }}>
                  IN BIÊN LAI
                </Button>
                
                {/* NÚT THU TIỀN: Ẩn đi khi hóa đơn đang chờ hoàn tiền */}
                {(invoice.status === 'Unpaid' || invoice.status === 'Partial') && (
                  <Button type="primary" size="large" icon={<CreditCard size={20}/>} onClick={openPayModal} style={{ backgroundColor: LUXURY_COLORS.NAVY, padding: '0 24px', fontWeight: 'bold' }}>
                    THU TIỀN NGAY
                  </Button>
                )}

                {/* NÚT HOÀN TIỀN DÀNH CHO KẾ TOÁN */}
                {invoice.status === 'Refund_Pending' && (
                    <Popconfirm title="Bạn xác nhận đã chuyển khoản trả lại tiền cho khách?" onConfirm={handleConfirmRefund} okText="Đã chuyển khoản" cancelText="Hủy">
                        <Button type="primary" size="large" icon={<HandCoins size={20}/>} style={{ backgroundColor: '#d97706', padding: '0 24px', fontWeight: 'bold', border: 'none' }}>
                            XÁC NHẬN ĐÃ HOÀN TIỀN
                        </Button>
                    </Popconfirm>
                )}
              </Space>
            </div>
          </div>
        )}
      </Drawer>

      <Modal title={<span style={{ color: LUXURY_COLORS.NAVY, fontSize: 18, fontWeight: 900 }}>Xác nhận Thu tiền</span>} open={isPayModalOpen} onCancel={() => { setIsPayModalOpen(false); setIsWaitingPayment(false); }} footer={null} centered width={450}>
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
                        <Select.Option value="Cash"><Space><Money color={LUXURY_COLORS.SUCCESS} /> Tiền mặt (Thu ngân nhận)</Space></Select.Option>
                        <Select.Option value="Bank Transfer"><Space><QrCode color={LUXURY_COLORS.NAVY} /> Quét mã QR Ngân Hàng</Space></Select.Option>
                        <Select.Option value="VNPay"><Space><CreditCard color="blue" /> Cổng thanh toán VNPay</Space></Select.Option>
                        <Select.Option value="MoMo"><Space><CreditCard color="magenta" /> Ví điện tử MoMo</Space></Select.Option>
                    </Select>
                </Form.Item>
                
                <Form.Item name="amountPaid" label={<span style={{fontWeight: 'bold', color: LUXURY_COLORS.NAVY}}>Số tiền khách trả (VNĐ)</span>} rules={[{ required: true }]}>
                    <InputNumber size="large" style={{ width: '100%', fontSize: 18, color: LUXURY_COLORS.ACCENT_RED, fontWeight: 'bold' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => { const numStr = v ? v.toString().replace(/\D/g, '') : ''; return numStr ? parseInt(numStr, 10) : ''; }} />
                </Form.Item>

                {paymentMethod === 'Bank Transfer' && amountPaid > 0 && (
                    <div style={{ textAlign: 'center', backgroundColor: LUXURY_COLORS.LIGHTEST, padding: 16, borderRadius: 8, border: `2px dashed ${LUXURY_COLORS.NAVY}`, marginBottom: 16 }}>
                        <Text strong style={{ color: LUXURY_COLORS.NAVY, display: 'block', marginBottom: 8 }}>Khách quét mã bên dưới để thanh toán:</Text>
                        <img src={`https://qr.sepay.vn/img?bank=VIB&acc=034537384&template=qronly&amount=${amountPaid}&des=Thanh+toan+hoa+don+${invoiceId}`} alt="VietQR" style={{ width: 220, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
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

      {/* KHU VỰC IN (Giữ nguyên) */}
      {invoice && (
        <div className="print-only">
          <div style={{ textAlign: 'center', marginBottom: 24, borderBottom: `2px solid ${LUXURY_COLORS.NAVY}`, paddingBottom: 16 }}>
            <h1 style={{ margin: 0, color: LUXURY_COLORS.NAVY, letterSpacing: '2px' }}>ABC LUXURY HOTEL</h1>
            <p style={{ margin: '4px 0' }}>123 Đường Tôn Đức Thắng, Phường Trấn Biên, Biên Hòa</p>
            <p style={{ margin: 0 }}>SĐT: 0123.456.789 | Email: contact@abchotel.vn</p>
            <h2 style={{ marginTop: 16, color: '#000' }}>BIÊN LAI THANH TOÁN (FOLIO)</h2>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30 }}>
            <div>
              <p style={{ margin: '4px 0' }}><b>Khách hàng:</b> {invoice.guestName}</p>
              <p style={{ margin: '4px 0' }}><b>Ngày lập hóa đơn:</b> {dayjs(invoice.createdAt).format('DD/MM/YYYY HH:mm')}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '4px 0' }}><b>Hóa đơn số:</b> INV-{invoice.id}</p>
              <p style={{ margin: '4px 0' }}><b>Mã Booking:</b> {invoice.bookingCode}</p>
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
              <tr><td style={{ padding: '12px 8px', borderBottom: '1px dashed #ccc' }}>1. Phí thuê phòng</td><td style={{ textAlign: 'right', padding: '12px 8px', borderBottom: '1px dashed #ccc' }}>{new Intl.NumberFormat('vi-VN').format(invoice.totalRoomAmount)}</td></tr>
              <tr><td style={{ padding: '12px 8px', borderBottom: '1px dashed #ccc' }}>2. Dịch vụ (Minibar, Nhà hàng, Giặt ủi...)</td><td style={{ textAlign: 'right', padding: '12px 8px', borderBottom: '1px dashed #ccc' }}>{new Intl.NumberFormat('vi-VN').format(invoice.totalServiceAmount)}</td></tr>
              {invoice.totalDamageAmount > 0 && <tr><td style={{ padding: '12px 8px', borderBottom: '1px dashed #ccc' }}>3. Phí đền bù hư hỏng vật tư</td><td style={{ textAlign: 'right', padding: '12px 8px', borderBottom: '1px dashed #ccc' }}>{new Intl.NumberFormat('vi-VN').format(invoice.totalDamageAmount)}</td></tr>}
              <tr><td style={{ padding: '12px 8px', borderBottom: '1px dashed #ccc' }}>Trừ: Khuyến mãi / Ưu đãi hạng thẻ</td><td style={{ textAlign: 'right', padding: '12px 8px', borderBottom: '1px dashed #ccc' }}>- {new Intl.NumberFormat('vi-VN').format(invoice.discountAmount)}</td></tr>
              <tr><td style={{ padding: '12px 8px', borderBottom: '2px solid #000' }}>Thuế giá trị gia tăng (VAT 10%)</td><td style={{ textAlign: 'right', padding: '12px 8px', borderBottom: '2px solid #000' }}>{new Intl.NumberFormat('vi-VN').format(invoice.taxAmount)}</td></tr>
            </tbody>
          </table>

          <div style={{ textAlign: 'right', fontSize: 18 }}>
            <p style={{ margin: '8px 0' }}><b>TỔNG THANH TOÁN:</b> <span style={{ fontSize: 24, fontWeight: 'bold' }}>{new Intl.NumberFormat('vi-VN').format(invoice.finalTotal)}đ</span></p>
            <p style={{ margin: '8px 0' }}><b>Đã thu của khách:</b> {new Intl.NumberFormat('vi-VN').format(invoice.amountPaid)}đ</p>
            <p style={{ margin: '8px 0', fontStyle: 'italic', fontSize: 14 }}>Hóa đơn này đã được thanh toán đầy đủ qua hệ thống.</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 60 }}>
            <div style={{ textAlign: 'center' }}>
                <p><b>KHÁCH HÀNG</b></p>
                <p style={{ fontStyle: 'italic', fontSize: 12 }}>(Ký và ghi rõ họ tên)</p>
            </div>
            <div style={{ textAlign: 'center' }}>
                <p><b>THU NGÂN / KẾ TOÁN</b></p>
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
      `}</style>
    </>
  );
}