import React, { useState, useEffect, useMemo } from 'react';
import { Form, Input, Button, Typography, notification, Row, Col, Card, Steps, Divider, Radio, Space, Tag } from 'antd';
import { 
  Bed, SuitcaseRolling, ShieldCheck, CreditCard, Ticket, CheckCircle, ArrowRight, User, Phone, Envelope, IdentificationCard, Crown
} from '@phosphor-icons/react';
import { useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';

import { bookingApi } from '../../../api/bookingApi';
import { invoiceApi } from '../../../api/invoiceApi';
import { voucherApi } from '../../../api/voucherApi';
import { useAuthStore } from '../../../store/authStore';
import axiosClient from '../../../api/axiosClient'; // 🔥 Thêm axiosClient để gọi API Profile

const { Title, Text } = Typography;

const THEME = {
  NAVY_DARK: '#0A192F', NAVY_LIGHT: '#172A45', DARK_RED: '#9E2A2B',
  GOLD: '#D4AF37', GRAY_BG: '#F4F7F6', BORDER: '#E2E8F0', TEXT_MUTED: '#64748B'
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const [api, contextHolder] = notification.useNotification();
  
  const user = useAuthStore(state => state.user);
  const bookingState = location.state;

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('VNPAY');
  
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherDiscountAmount, setVoucherDiscountAmount] = useState(0);
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);

  // 🔥 STATE LƯU TRỮ HẠNG THÀNH VIÊN
  const [myProfile, setMyProfile] = useState(null);
  const [memberships, setMemberships] = useState([]);

  useEffect(() => {
    if (!bookingState || !bookingState.selectedRooms || bookingState.selectedRooms.length === 0) {
      notification.warning({ message: 'Thiếu dữ liệu', description: 'Vui lòng chọn phòng trước.' });
      navigate('/booking/select-room');
    }
    if (user) {
      form.setFieldsValue({
        guestName: user.fullName, 
        guestEmail: user.email, 
        guestPhone: user.phone || ''
      });

      // 🔥 Lấy thông tin điểm số và bảng hạng thành viên
      axiosClient.get('/UserProfile/my-profile').then(res => setMyProfile(res)).catch(()=>{});
      axiosClient.get('/Memberships').then(res => setMemberships(res.$values || res || [])).catch(()=>{});
    }
  }, [bookingState, navigate, user, form]);

  if (!bookingState) return null;

  const { grandTotal, checkIn, checkOut, priceType, selectedRooms, selectedServices } = bookingState;

  // 🔥 TÍNH TOÁN ƯU ĐÃI HẠNG THÀNH VIÊN
  const currentTier = useMemo(() => {
    if (!myProfile || !memberships.length) return null;
    return memberships.sort((a,b) => b.minPoints - a.minPoints).find(m => myProfile.totalPoints >= m.minPoints);
  }, [myProfile, memberships]);

  const memDiscountPercent = currentTier ? currentTier.discountPercent : 0;
  // Ưu đãi thành viên thường áp dụng trên tổng tiền phòng (grandTotal)
  const memDiscountAmount = Math.round(grandTotal * (memDiscountPercent / 100));

  // TỔNG TIỀN CUỐI CÙNG SAU KHI TRỪ VOUCHER VÀ MEMBERSHIP
  const finalTotalToPay = grandTotal - voucherDiscountAmount - memDiscountAmount;
  const depositAmount = finalTotalToPay * 0.20; 

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) return;
    try {
      setIsApplyingVoucher(true);
      const res = await voucherApi.apply({
        code: voucherCode,
        totalBookingValue: grandTotal,
        roomTypeId: selectedRooms[0]?.roomTypeId || selectedRooms[0]?.id 
      });
      
      const data = res.data || res;
      if (data.isValid || data.isSuccess) {
        setAppliedVoucher(voucherCode.toUpperCase());
        setVoucherDiscountAmount(data.discountAmount || 0);
        api.success({ message: 'Thành công', description: `Đã giảm ${new Intl.NumberFormat('vi-VN').format(data.discountAmount)}đ` });
      } else {
        api.error({ message: 'Mã không hợp lệ', description: data.message });
      }
    } catch (error) {
      api.error({ message: 'Lỗi', description: error.response?.data?.message || 'Không thể kiểm tra mã lúc này.' });
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setVoucherCode(''); setAppliedVoucher(null); setVoucherDiscountAmount(0);
  };

  const onFinishCheckout = async (values) => {
    try {
      setLoading(true);
      
      const bookingPayload = {
        guestName: values.guestName,
        guestPhone: values.guestPhone,
        guestEmail: values.guestEmail,
        identityNumber: values.identityNumber || '',
        specialRequests: values.specialRequests || '',
        voucherCode: appliedVoucher,
        priceType: priceType || 'DAILY',
        rooms: selectedRooms.map(r => ({
          roomTypeId: r.roomTypeId || r.id,
          roomId: r.roomId || null, 
          // 🔥 Đã chuẩn hóa ngày tháng sang định dạng chuẩn ISO để C# không bị lỗi 400
          checkInDate: dayjs(checkIn).format('YYYY-MM-DDTHH:mm:ss'),
          checkOutDate: dayjs(checkOut).format('YYYY-MM-DDTHH:mm:ss'),
          quantity: r.quantity || 1,
          priceType: priceType
        })),
        services: selectedServices ? selectedServices.map(s => ({
          serviceId: s.serviceId || s.id,
          quantity: s.quantity || 1
        })) : []
      };

      const bookingRes = await bookingApi.createBooking(bookingPayload);
      const bData = bookingRes.data || bookingRes;
      
      if (!bData.bookingCode) throw new Error("Không lấy được mã đơn hàng từ hệ thống.");

      const invoiceRes = await invoiceApi.getByBookingCode(bData.bookingCode);
      const invoiceId = invoiceRes?.data?.id || invoiceRes?.id;

      if (!invoiceId) throw new Error("Không khởi tạo được hóa đơn.");

      let paymentUrl = '';
      if (paymentMethod === 'VNPAY') {
        const vnpRes = await invoiceApi.createVnPayUrl(invoiceId, true);
        paymentUrl = typeof vnpRes === 'string' ? vnpRes : (vnpRes?.data?.url || vnpRes?.url || vnpRes);
      } else if (paymentMethod === 'MOMO') {
        const momoRes = await invoiceApi.createMoMoUrl(invoiceId, true);
        paymentUrl = typeof momoRes === 'string' ? momoRes : (momoRes?.data?.url || momoRes?.url || momoRes);
      }

      if (paymentUrl) {
        window.location.href = paymentUrl;
      } else {
        throw new Error("Không lấy được đường dẫn thanh toán từ Cổng thanh toán.");
      }

    } catch (error) {
      console.error("Chi tiết lỗi từ Server:", error.response?.data);
      // 🔥 Bắt và hiển thị CHÍNH XÁC nguyên nhân lỗi từ Backend thay vì báo lỗi 400 chung chung
      const errorMsg = error.response?.data?.message 
                    || JSON.stringify(error.response?.data?.errors) 
                    || error.message 
                    || 'Có lỗi xảy ra khi tạo đơn hàng.';
                    
      api.error({ message: 'Lỗi hệ thống', description: errorMsg });
      setLoading(false);
    }
  };

  const renderFullDateLabel = (dateStr) => {
    return priceType === 'HOURLY' ? dayjs(dateStr).format('HH:mm - DD/MM/YYYY') : dayjs(dateStr).format('DD/MM/YYYY');
  };

  return (
    <div className="checkout-wrapper" translate="no">
      {contextHolder}
      
      <div className="booking-topbar">
        <div className="container-inner">
            <Steps current={2} className="luxury-steps" items={[
                { title: 'Chọn Hạng Phòng', icon: <Bed size={22}/> },
                { title: 'Dịch Vụ', icon: <SuitcaseRolling size={22}/> },
                { title: 'Thanh Toán Cọc', icon: <ShieldCheck size={22}/> }
            ]} />
        </div>
      </div>

      <div className="container-inner" style={{ marginTop: 40 }}>
        <Form form={form} layout="vertical" onFinish={onFinishCheckout} requiredMark={false}>
          <Row gutter={[32, 32]}>
            
            <Col xs={24} xl={16}>
              
              <div className="section-block">
                <Title level={4} className="section-title"><User size={24}/> Thông tin khách hàng</Title>
                <Card variant="borderless" className="form-card">
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item name="guestName" label="Họ và tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
                        <Input size="large" prefix={<User color="#94a3b8"/>} placeholder="Ví dụ: Nguyễn Văn A" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="guestPhone" label="Số điện thoại" rules={[{ required: true, message: 'Vui lòng nhập SĐT' }, { pattern: /^0\d{9}$/, message: 'SĐT không hợp lệ' }]}>
                        <Input size="large" prefix={<Phone color="#94a3b8"/>} placeholder="09xxxx..." />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="guestEmail" label="Email" rules={[{ required: true, message: 'Vui lòng nhập Email' }, { type: 'email', message: 'Email không hợp lệ' }]}>
                        <Input size="large" prefix={<Envelope color="#94a3b8"/>} placeholder="email@example.com" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="identityNumber" label="Số CCCD / Passport (Không bắt buộc)">
                        <Input size="large" prefix={<IdentificationCard color="#94a3b8"/>} placeholder="Nhập số CCCD" />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item name="specialRequests" label="Yêu cầu đặc biệt (Không bắt buộc)">
                        <Input.TextArea rows={3} placeholder="Ví dụ: Cần phòng tầng cao, giường phụ..." />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              </div>

              <div className="section-block" style={{ marginTop: 32 }}>
                <Title level={4} className="section-title"><CreditCard size={24}/> Phương thức cọc trước 20%</Title>
                <Card variant="borderless" className="form-card">
                  <Radio.Group onChange={(e) => setPaymentMethod(e.target.value)} value={paymentMethod} style={{ width: '100%' }}>
                    <div className={`payment-method-row ${paymentMethod === 'VNPAY' ? 'active' : ''}`} onClick={() => setPaymentMethod('VNPAY')}>
                      <Radio value="VNPAY" />
                      <img src="https://cdn.haitrieu.com/wp-content/uploads/2022/10/Icon-VNPAY-QR.png" alt="VNPay" className="payment-logo" />
                      <div className="payment-text">
                        <Text strong>Thanh toán qua VNPAY</Text>
                        <Text type="secondary" style={{display:'block', fontSize: 12}}>Hỗ trợ thẻ ATM, Visa, MasterCard, QR Code</Text>
                      </div>
                    </div>
                    
                    <div className={`payment-method-row ${paymentMethod === 'MOMO' ? 'active' : ''}`} onClick={() => setPaymentMethod('MOMO')}>
                      <Radio value="MOMO" />
                      <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRAvqtnrX-jan83zUzhldZsePVib6MTkkhXOQ&s" alt="MoMo" className="payment-logo" />
                      <div className="payment-text">
                        <Text strong>Thanh toán qua Ví MoMo</Text>
                        <Text type="secondary" style={{display:'block', fontSize: 12}}>Thanh toán nhanh chóng bằng ứng dụng MoMo</Text>
                      </div>
                    </div>
                  </Radio.Group>
                </Card>
              </div>

            </Col>

            <Col xs={24} xl={8}>
              <div className="sticky-bill">
                  <Card variant="borderless" className="white-bill-card">
                      <Title level={4} className="bill-title">Chuyến đi của bạn</Title>
                      
                      <div className="bill-date-box">
                          <div className="date-item">
                              <Text className="date-lbl">Nhận phòng</Text>
                              <Text className="date-val">{renderFullDateLabel(checkIn)}</Text>
                          </div>
                          <div className="date-divider"><ArrowRight color={THEME.TEXT_MUTED}/></div>
                          <div className="date-item" style={{textAlign: 'right'}}>
                              <Text className="date-lbl">Trả phòng</Text>
                              <Text className="date-val">{renderFullDateLabel(checkOut)}</Text>
                          </div>
                      </div>

                      <Divider style={{ margin: '16px 0' }} className="mobile-hide"/>

                      <div className="voucher-section mobile-hide">
                        <Text strong style={{ fontSize: 14, color: THEME.NAVY_DARK, marginBottom: 8, display: 'block' }}>Mã giảm giá</Text>
                        {!appliedVoucher ? (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Input 
                              placeholder="Nhập mã voucher" 
                              value={voucherCode} 
                              onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                              prefix={<Ticket color={THEME.TEXT_MUTED} />}
                            />
                            <Button type="default" onClick={handleApplyVoucher} loading={isApplyingVoucher} disabled={!voucherCode.trim()}>Áp dụng</Button>
                          </div>
                        ) : (
                          <div className="applied-voucher-box">
                            <Space>
                              <CheckCircle color="#10b981" weight="fill" size={20}/>
                              <Text strong style={{color: '#10b981'}}>{appliedVoucher}</Text>
                            </Space>
                            <Button type="text" danger size="small" onClick={handleRemoveVoucher}>Bỏ mã</Button>
                          </div>
                        )}
                      </div>

                      <Divider style={{ margin: '16px 0' }} className="mobile-hide"/>

                      <div className="cart-area mobile-hide">
                          <div className="cart-item-row">
                              <Text className="cart-item-name" style={{ color: THEME.TEXT_MUTED }}>Tổng tiền phòng & dịch vụ</Text>
                              <Text className="cart-item-price">{new Intl.NumberFormat('vi-VN').format(grandTotal)}₫</Text>
                          </div>
                          
                          <AnimatePresence>
                            {/* 🔥 HIỂN THỊ ƯU ĐÃI HẠNG THÀNH VIÊN */}
                            {memDiscountAmount > 0 && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="cart-item-row">
                                <Text className="cart-item-name" style={{ color: THEME.GOLD, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Crown weight="fill" /> Hạng {currentTier?.tierName} ({memDiscountPercent}%)
                                </Text>
                                <Text className="cart-item-price" style={{ color: THEME.GOLD }}>-{new Intl.NumberFormat('vi-VN').format(memDiscountAmount)}₫</Text>
                              </motion.div>
                            )}

                            {voucherDiscountAmount > 0 && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="cart-item-row">
                                <Text className="cart-item-name" style={{ color: '#10b981' }}>Giảm giá (Voucher)</Text>
                                <Text className="cart-item-price" style={{ color: '#10b981' }}>-{new Intl.NumberFormat('vi-VN').format(voucherDiscountAmount)}₫</Text>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <Divider style={{ margin: '8px 0', borderStyle: 'dashed' }} />
                          
                          <div className="cart-item-row">
                              <Text className="cart-item-name" style={{ color: THEME.NAVY_DARK, fontWeight: 700 }}>Tổng cộng chuyến đi</Text>
                              <Text className="cart-item-price">{new Intl.NumberFormat('vi-VN').format(finalTotalToPay)}₫</Text>
                          </div>
                      </div>

                      <Divider style={{ margin: '16px 0' }} className="mobile-hide"/>

                      <div className="total-area-wrapper">
                          <div className="total-area">
                              <div className="total-label-box">
                                  <Text className="total-label">Cọc trước (20%)</Text>
                                  <Text className="tax-info mobile-hide">Còn lại thanh toán tại quầy</Text>
                              </div>
                              <div className="total-amount" style={{ color: THEME.DARK_RED }}>
                                {new Intl.NumberFormat('vi-VN').format(depositAmount)}<span style={{ fontSize: 20, verticalAlign: 'top' }}>₫</span>
                              </div>
                          </div>

                          <Button block htmlType="submit" className="btn-proceed" loading={loading}>
                              THANH TOÁN CỌC
                          </Button>
                      </div>

                      <div className="guarantee-box mobile-hide">
                          <Space><ShieldCheck size={18} color="#10b981"/> <Text style={{fontSize: 12, color: '#10b981'}}>Thanh toán mã hóa bảo mật 100%</Text></Space>
                      </div>
                  </Card>
              </div>
            </Col>

          </Row>
        </Form>
      </div>

      <style>{`
        .checkout-wrapper { background-color: ${THEME.GRAY_BG}; min-height: 100vh; padding-bottom: 80px; font-family: 'Inter', sans-serif; }
        .container-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; } 
        
        .booking-topbar { background: #fff; border-bottom: 1px solid ${THEME.BORDER}; padding: 20px 0; position: sticky; top: 0px; z-index: 100; }
        .luxury-steps .ant-steps-item-process .ant-steps-item-icon { background: ${THEME.NAVY_DARK}; border-color: ${THEME.NAVY_DARK}; }
        .luxury-steps .ant-steps-item-finish .ant-steps-item-icon { border-color: ${THEME.DARK_RED}; }
        .luxury-steps .ant-steps-item-finish .ant-steps-icon { color: ${THEME.DARK_RED}; }

        .section-block { margin-bottom: 24px; }
        .section-title { color: ${THEME.NAVY_DARK} !important; display: flex; align-items: center; gap: 8px; font-family: '"Source Serif 4", serif'; margin-bottom: 16px !important; }
        
        .form-card { border-radius: 16px; border: 1px solid ${THEME.BORDER}; box-shadow: 0 4px 15px rgba(0,0,0,0.02); background: #fff; }
        .form-card .ant-card-body { padding: 24px; }
        
        .payment-method-row { display: flex; align-items: center; padding: 16px; border: 1px solid ${THEME.BORDER}; border-radius: 12px; margin-bottom: 12px; cursor: pointer; transition: all 0.2s; background: #fafafa; }
        .payment-method-row:hover { border-color: ${THEME.NAVY_DARK}; }
        .payment-method-row.active { border-color: ${THEME.NAVY_DARK}; background: #fff; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .payment-logo { width: 40px; height: 40px; object-fit: contain; margin: 0 16px; }
        .payment-text { flex: 1; }

        .voucher-section { background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px dashed #cbd5e1; }
        .applied-voucher-box { display: flex; justify-content: space-between; align-items: center; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 10px 16px; border-radius: 8px; }

        .sticky-bill { position: sticky; top: 100px; }
        .white-bill-card { background: #fff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.05); border: 1px solid ${THEME.BORDER}; max-height: calc(100vh - 120px); overflow-y: auto; }
        .white-bill-card .ant-card-body { padding: 24px; }
        .white-bill-card::-webkit-scrollbar { width: 5px; }
        .white-bill-card::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

        .bill-title { color: ${THEME.NAVY_DARK} !important; font-family: '"Source Serif 4", serif'; margin-top: 0; margin-bottom: 20px; font-size: 20px; font-weight: 800 !important; text-align: center; }
        .bill-date-box { display: flex; align-items: center; justify-content: space-between; background: ${THEME.GRAY_BG}; padding: 12px 16px; border-radius: 12px; border: 1px solid ${THEME.BORDER}; }
        .date-item { display: flex; flex-direction: column; } 
        .date-lbl { font-size: 11px; color: ${THEME.TEXT_MUTED}; text-transform: uppercase; font-weight: 600; margin-bottom: 2px; display: block; }
        .date-val { font-size: 14px; font-weight: 700; color: ${THEME.NAVY_DARK}; display: block; }
        
        .cart-item-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #f1f5f9; }
        .cart-item-row:last-child { border-bottom: none; }
        .cart-item-name { font-size: 14px; font-weight: 600; color: ${THEME.NAVY_DARK}; }
        .cart-item-price { font-size: 15px; font-weight: 700; color: ${THEME.NAVY_DARK}; }

        .total-area { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; }
        .total-label-box { display: flex; flex-direction: column; }
        .total-label { font-size: 13px; text-transform: uppercase; color: ${THEME.TEXT_MUTED}; font-weight: 700; }
        .total-amount { font-size: 32px; font-weight: 900; line-height: 1; margin-top: 4px; text-align: right; }
        .tax-info { font-size: 12px; color: #94a3b8; margin-top: 4px; }

        .btn-proceed { min-height: 56px; border-radius: 12px; font-size: 16px; font-weight: 800; letter-spacing: 1px; background: ${THEME.DARK_RED}; color: #fff; border: none; box-shadow: 0 4px 15px rgba(158, 42, 43, 0.3); }
        .btn-proceed:hover { background: #7A1A21 !important; color: #fff !important; transform: translateY(-2px); }

        .guarantee-box { margin-top: 16px; text-align: center; }

        @media (max-width: 992px) {
            .checkout-wrapper { padding-bottom: 140px; } 
            .sticky-bill { position: fixed !important; top: auto !important; bottom: 0 !important; left: 0; right: 0; z-index: 1000; }
            .white-bill-card { border-radius: 24px 24px 0 0; padding: 12px 20px; box-shadow: 0 -5px 25px rgba(0,0,0,0.15); margin: 0; border: none; max-height: none; }
            .white-bill-card .ant-card-body { padding: 0; display: flex; width: 100%; justify-content: space-between; align-items: center; gap: 16px; }
            
            .mobile-hide, .bill-date-box, .cart-area, .bill-title { display: none; }
            .total-area-wrapper { display: flex; width: 100%; justify-content: space-between; align-items: center; gap: 16px; }
            .total-area { margin: 0; align-items: center; }
            .total-label { display: none; } 
            .total-amount { font-size: 24px; margin-top: 0; text-align: left; }
            .btn-proceed { height: 46px; min-height: unset; flex: 1; margin: 0; max-width: 180px; font-size: 14px; padding: 0 10px; }
        }

        @media (max-width: 576px) {
            .container-inner { padding: 0 12px; }
            .form-card .ant-card-body { padding: 16px; }
            .payment-logo { width: 32px; height: 32px; margin: 0 12px; }
            .total-amount { font-size: 22px; }
        }
      `}</style>
    </div>
  );
}