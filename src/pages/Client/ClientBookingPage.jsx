import React, { useState, useEffect, useMemo } from 'react';
import { 
  Steps, Card, Row, Col, Button, Typography, Input, Form, 
  Select, InputNumber, Divider, Radio, Space, 
  Checkbox, notification, Spin, Empty, Tag 
} from 'antd';
import { 
  CheckCircle, Users, ArrowsOut, PencilSimple, CaretLeft, ArrowRight
} from '@phosphor-icons/react';
import dayjs from 'dayjs';
import 'dayjs/locale/vi'; 
import { useNavigate, useLocation } from 'react-router-dom';

import { bookingApi } from '../../api/bookingApi';
import { serviceApi } from '../../api/serviceApi'; 
import { useSignalR } from '../../hooks/useSignalR'; 

dayjs.locale('vi');
const { Title, Text, Paragraph } = Typography;

const THEME = {
  PRIMARY: '#004CB8', 
  SECONDARY: '#0071C2',
  TEXT_DARK: '#1A1A1A',
  TEXT_GRAY: '#666666',
  BG_LIGHT: '#F8FAFC',
  WHITE: '#FFFFFF',
  DANGER: '#D4111E',
  ACCENT: '#FEBB02'
};

// HÀM XỬ LÝ SỐ TIỀN THÔNG MINH - Khắc phục hoàn toàn lỗi kẹt bill do định dạng String/Null
const parsePrice = (val) => {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  // Xóa mọi ký tự không phải là số (khắc phục lỗi chuỗi "500,000" hoặc "500.000 VNĐ")
  const cleaned = String(val).replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) || 0;
};

export default function ClientBookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm(); 
  
  const [api, contextHolder] = notification.useNotification();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [searchParams, setSearchParams] = useState({
    checkIn: dayjs().add(1, 'day').hour(14).minute(0),
    checkOut: dayjs().add(2, 'day').hour(12).minute(0),
    adults: 2,
    children: 0,
    priceType: 'NIGHTLY',
    requestedRooms: 1
  });

  const [availableRooms, setAvailableRooms] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]); 
  const [bookingResult, setBookingResult] = useState(null);

  const isHourly = searchParams.priceType === 'HOURLY';

  useSignalR((message) => {
    api.info({
      message: <Text strong style={{ color: THEME.PRIMARY }}>Thông báo từ ABC Resort</Text>,
      description: typeof message === 'string' ? message : (message.content || message.message),
      placement: 'topRight',
    });
  });

  useEffect(() => {
    let initialSearch = { ...searchParams };
    if (location.state) {
      if (location.state.checkIn && location.state.checkOut) {
        initialSearch.checkIn = dayjs(location.state.checkIn);
        initialSearch.checkOut = dayjs(location.state.checkOut);
        initialSearch.adults = location.state.adults || 2;
        initialSearch.children = location.state.children || 0;
        initialSearch.priceType = location.state.priceType || 'NIGHTLY';
        initialSearch.requestedRooms = location.state.requestedRooms || 1;
      }
    }
    setSearchParams(initialSearch);
    fetchAvailableRooms(initialSearch);
    fetchServices();
    // eslint-disable-next-line
  }, [location.state]);

  const getRoomUniqueId = (room) => {
    if (!room) return null;
    return room.id ?? room.Id ?? room.roomTypeId ?? room.RoomTypeId;
  };

  // FIX LỖI 1: Lấy giá phòng chính xác tuyệt đối và phân loại Giờ/Đêm
  const getRoomPrice = (room) => {
    if (!room) return 0;
    if (isHourly) {
      return parsePrice(room.pricePerHour ?? room.PricePerHour ?? room.pricePerUnit ?? room.PricePerUnit ?? room.basePrice ?? room.BasePrice);
    }
    return parsePrice(room.basePrice ?? room.BasePrice ?? room.pricePerUnit ?? room.PricePerUnit ?? room.price ?? room.Price);
  };

  const fetchAvailableRooms = async (params) => {
    try {
      setLoading(true);
      const request = {
        checkIn: params.checkIn.format('YYYY-MM-DDTHH:mm:ss'),
        checkOut: params.checkOut.format('YYYY-MM-DDTHH:mm:ss'),
        adults: params.adults,
        children: params.children,
        requestedRooms: params.requestedRooms,
        priceType: params.priceType 
      };
      
      const res = await bookingApi.searchRooms(request);
      let rooms = res?.data?.$values || res?.$values || res?.data || res || [];
      if (!Array.isArray(rooms)) rooms = [];

      setAvailableRooms(rooms);

      const targetId = location.state?.roomTypeId || location.state?.RoomTypeId;
      if (targetId) {
        const target = rooms.find(r => (r.roomTypeId || r.RoomTypeId || r.id || r.Id) == targetId);
        if (target) setSelectedRoom(target);
      }
    } catch (error) {
      api.error({ message: 'Lỗi', description: 'Không thể kết nối đến máy chủ để lấy danh sách phòng.' });
      setAvailableRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await serviceApi.getServices(true);
      let data = res?.data?.$values || res?.$values || res?.data || res || [];
      setServicesList(Array.isArray(data) ? data : []);
    } catch (error) {
      setServicesList([]);
    }
  };

  const handleSelectRoom = (room) => {
    setSelectedRoom(room);
  };

  // FIX LỖI 2: Xử lý giá dịch vụ bằng parsePrice để không bao giờ bị dính NaN
  const handleToggleService = (service) => {
    const sId = service.id ?? service.Id ?? service.serviceId ?? service.ServiceId;
    const sName = service.name ?? service.Name ?? service.serviceName ?? service.ServiceName;
    
    // Bao hàm tất cả các key thường gặp ở API
    const rawPrice = service.price ?? service.Price ?? service.servicePrice ?? service.ServicePrice ?? service.basePrice ?? service.BasePrice;
    const sPrice = parsePrice(rawPrice);

    const existing = selectedServices.find(s => s.id === sId);
    if (existing) {
      setSelectedServices(selectedServices.filter(s => s.id !== sId));
    } else {
      setSelectedServices([...selectedServices, { id: sId, name: sName, price: sPrice, quantity: 1 }]);
    }
  };

  const handleUpdateServiceQty = (id, qty) => {
    const validQty = parseInt(qty, 10) || 1;
    if (validQty <= 0) setSelectedServices(selectedServices.filter(s => s.id !== id));
    else setSelectedServices(selectedServices.map(s => s.id === id ? { ...s, quantity: validQty } : s));
  };

  const handleCheckout = async (values) => {
    if (!selectedRoom) return api.error({ message: 'Lỗi', description: 'Vui lòng chọn phòng.' });
    if (!values.agreement) return api.warning({ message: 'Vui lòng đồng ý với các điều khoản.'});

    try {
      setLoading(true);
      let serviceStr = selectedServices.length > 0 
        ? "\n\n*** DỊCH VỤ MUA THÊM ***\n" + selectedServices.map(s => `- ${s.name} x${s.quantity}`).join("\n") 
        : "";

      const request = {
        guestName: `${values.lastName} ${values.firstName}`.trim(),
        guestPhone: values.phone,
        guestEmail: values.email,
        specialRequests: (values.requests?.join(", ") || "") + "\n" + (values.note || "") + serviceStr,
        rooms: [{
          roomTypeId: selectedRoom.roomTypeId || selectedRoom.RoomTypeId || selectedRoom.id || selectedRoom.Id,
          checkInDate: searchParams.checkIn.format('YYYY-MM-DDTHH:mm:ss'),
          checkOutDate: searchParams.checkOut.format('YYYY-MM-DDTHH:mm:ss'),
          quantity: searchParams.requestedRooms,
          priceType: searchParams.priceType
        }]
      };

      const res = await bookingApi.createBooking(request);
      setBookingResult(res);
      setCurrentStep(3); 
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Lỗi hệ thống khi tạo đơn.';
      api.error({ message: 'Lỗi tạo đơn', description: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  // LOGIC TÍNH TIỀN MỚI: Cộng dồn chính xác, chuẩn Giờ/Đêm
  const billInfo = useMemo(() => {
    let duration = 1;
    if (searchParams.checkIn && searchParams.checkOut) {
      if (isHourly) {
        duration = Math.max(1, searchParams.checkOut.diff(searchParams.checkIn, 'hour'));
      } else {
        // startOf('day') giúp tính số đêm lưu trú chính xác mà không bị lố giờ
        duration = Math.max(1, searchParams.checkOut.startOf('day').diff(searchParams.checkIn.startOf('day'), 'day'));
      }
    }

    const pricePerUnit = getRoomPrice(selectedRoom);
    const requestedRooms = parseInt(searchParams.requestedRooms, 10) || 1;
    const roomTotal = pricePerUnit * duration * requestedRooms;
    
    // Tổng dịch vụ đã được chuẩn hóa số qua parsePrice ở trên
    const serviceTotal = selectedServices.reduce((sum, s) => sum + (s.price * s.quantity), 0);
    const finalTotal = roomTotal + serviceTotal;

    return { duration, pricePerUnit, roomTotal, serviceTotal, finalTotal };
  }, [selectedRoom, selectedServices, searchParams, isHourly]);

  const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(Number(price) || 0) + ' đ';
  const capitalizeFirstLetter = (string) => string ? string.charAt(0).toUpperCase() + string.slice(1) : '';

  const checkInStr = searchParams.checkIn ? capitalizeFirstLetter(searchParams.checkIn.format('dddd, DD/MM/YYYY')) : '---';
  const checkOutStr = searchParams.checkOut ? capitalizeFirstLetter(searchParams.checkOut.format('dddd, DD/MM/YYYY')) : '---';
  const durationText = isHourly ? `${billInfo.duration} giờ` : `${billInfo.duration} đêm`;

  return (
    <div style={{ backgroundColor: THEME.BG_LIGHT, minHeight: '100vh', paddingBottom: 80, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      
      {contextHolder}

      <div style={{ backgroundColor: THEME.WHITE, borderBottom: '1px solid #e5e5e5', paddingTop: 24, paddingBottom: 24, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center' }}>
          <Title level={2} style={{ color: THEME.PRIMARY, margin: 0, marginRight: 80, letterSpacing: 1, cursor: 'pointer' }} onClick={() => navigate('/')}>ABC</Title>
          <div style={{ flex: 1 }}>
            <Steps 
              current={currentStep} 
              items={[{ title: 'Chọn phòng' }, { title: 'Dịch vụ mua thêm' }, { title: 'Thanh toán' }]} 
              className="custom-steps"
            />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '40px auto 0', padding: '0 20px' }}>
        
        {currentStep === 3 && bookingResult ? (
          <Card style={{ borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', textAlign: 'center', padding: '60px 20px' }}>
            <CheckCircle size={80} color="#52c41a" weight="fill" style={{ marginBottom: 24 }} />
            <Title level={2}>Đặt phòng thành công!</Title>
            <Paragraph style={{ fontSize: 16, color: THEME.TEXT_GRAY, marginBottom: 32 }}>
              Cảm ơn bạn đã lựa chọn ABC Resort Đà Nẵng. Mã đặt chỗ của bạn là: <Text strong style={{ color: THEME.PRIMARY, fontSize: 18 }}>{bookingResult.bookingCode || bookingResult.BookingCode}</Text>
            </Paragraph>
            <Button type="primary" size="large" onClick={() => navigate('/')} style={{ backgroundColor: THEME.PRIMARY, borderRadius: 24, padding: '0 32px' }}>
              Về Trang chủ
            </Button>
          </Card>
        ) : (
          <Row gutter={[32, 32]}>
            
            <Col xs={24} md={16}>
              
              {/* BƯỚC 0: CHỌN PHÒNG */}
              {currentStep === 0 && (
                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                  <Title level={2} style={{ marginBottom: 24, color: THEME.PRIMARY, fontWeight: 700 }}>
                    Chọn phòng: {selectedRoom ? '1' : '0'}/{searchParams.requestedRooms}
                  </Title>
                  
                  {loading ? <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div> : availableRooms.length === 0 ? <Empty description="Không có phòng trống trong giai đoạn này." /> : (
                    <>
                      {availableRooms.map((room, idx) => {
                        const rId = getRoomUniqueId(room);
                        const rName = room.roomTypeName || room.RoomTypeName;
                        const rPrice = getRoomPrice(room);
                        const rImg = room.imageUrl || room.ImageUrl || 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=600';
                        const isSelected = selectedRoom && getRoomUniqueId(selectedRoom) === rId;
                        
                        return (
                          <Card key={idx} variant="borderless" style={{ borderRadius: 12, marginBottom: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.05)', overflow: 'hidden', border: isSelected ? `2px solid ${THEME.PRIMARY}` : '1px solid #eaeaea' }} bodyStyle={{ padding: 0 }}>
                            <Row>
                              <Col xs={24} sm={10}>
                                <div style={{ height: '100%', minHeight: 220 }}>
                                  <img src={rImg} alt="Room" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                              </Col>
                              <Col xs={24} sm={14} style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <div>
                                  <Title level={4} style={{ margin: '0 0 12px 0', color: THEME.TEXT_DARK }}>{rName}</Title>
                                  <Space size="middle" style={{ color: THEME.ACCENT, marginBottom: 16, fontSize: 13, fontWeight: 500 }}>
                                    <Space><Users size={16} weight="fill"/> {searchParams.adults} Người</Space>
                                    <Space>- 46m²</Space>
                                  </Space>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16 }}>
                                  <div>
                                    <Text style={{ textDecoration: 'line-through', color: '#888', fontSize: 13, display: 'block' }}>
                                      Giá công bố: {formatPrice(rPrice * 1.2)} /{isHourly ? 'giờ' : 'đêm'}
                                    </Text>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: THEME.PRIMARY }}>
                                      Giá ưu đãi: <span style={{ color: '#D46B08', fontSize: 20 }}>{formatPrice(rPrice)}</span> <span style={{ fontSize: 13, fontWeight: 400, color: THEME.TEXT_GRAY }}>/{isHourly ? 'giờ' : 'đêm'}</span>
                                    </div>
                                  </div>
                                  <Button 
                                    type="primary" 
                                    size="large" 
                                    style={{ backgroundColor: isSelected ? THEME.PRIMARY : THEME.SECONDARY, borderRadius: 24, padding: '0 32px', fontWeight: 600 }} 
                                    onClick={() => handleSelectRoom(room)}
                                  >
                                    {isSelected ? 'Đã chọn' : 'Chọn'}
                                  </Button>
                                </div>
                              </Col>
                            </Row>
                          </Card>
                        );
                      })}
                    </>
                  )}
                </div>
              )}

              {/* BƯỚC 1: DỊCH VỤ MUA THÊM */}
              {currentStep === 1 && (
                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Dịch vụ mua thêm</Title>
                    <Tag color="#D4111E" style={{ borderRadius: 16, padding: '4px 12px', fontWeight: 600, border: 'none', fontSize: 13 }}>Tiết kiệm tới 30% so với giá công bố</Tag>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                     <Text strong style={{ fontSize: 16 }}>Phòng 1 <span style={{ fontWeight: 400, color: THEME.TEXT_GRAY }}>{selectedRoom?.roomTypeName || selectedRoom?.RoomTypeName}</span></Text>
                     <Button type="link" icon={<CaretLeft size={16}/>} style={{ color: THEME.PRIMARY, padding: 0 }} onClick={() => setCurrentStep(0)}>
                       Đổi phòng khác
                     </Button>
                  </div>
                  
                  {servicesList.length === 0 ? (
                    <Empty description="Không có dịch vụ nào." />
                  ) : (
                    <Row gutter={[20, 20]}>
                      {servicesList.map((svc) => {
                        const sId = svc.id ?? svc.Id ?? svc.serviceId ?? svc.ServiceId;
                        const sName = svc.name ?? svc.Name ?? svc.serviceName ?? svc.ServiceName;
                        const sPrice = parsePrice(svc.price ?? svc.Price ?? svc.servicePrice ?? svc.ServicePrice);
                        const sImg = svc.imageUrl || svc.ImageUrl || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400';
                        
                        const isSelected = selectedServices.some(s => s.id === sId);
                        const svcItem = selectedServices.find(s => s.id === sId);
                        
                        return (
                          <Col xs={24} sm={12} md={8} key={sId}>
                            <Card hoverable variant="borderless" style={{ borderRadius: 12, border: isSelected ? `2px solid ${THEME.PRIMARY}` : '1px solid #e5e5e5', overflow: 'hidden' }} bodyStyle={{ padding: 16 }}>
                              <img src={sImg} alt="Service" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }} />
                              <Text style={{ display: 'block', fontSize: 15, marginBottom: 4, minHeight: 44, fontWeight: 500 }}>{sName}</Text>
                              <Text style={{ color: THEME.TEXT_DARK, fontWeight: 700, fontSize: 16, display: 'block', marginBottom: 16 }}>{formatPrice(sPrice)}</Text>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <Checkbox checked={isSelected} onChange={() => handleToggleService(svc)}>
                                  <Text strong style={{ color: isSelected ? THEME.PRIMARY : THEME.TEXT_DARK }}>Thêm</Text>
                                </Checkbox>
                                {isSelected && (
                                  <InputNumber min={1} value={svcItem?.quantity} onChange={(v) => handleUpdateServiceQty(sId, v)} size="small" style={{ width: 60 }} />
                                )}
                              </div>
                            </Card>
                          </Col>
                        );
                      })}
                    </Row>
                  )}
                </div>
              )}

              {/* BƯỚC 2: THANH TOÁN */}
              {currentStep === 2 && (
                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                  <Title level={2} style={{ marginBottom: 4, color: THEME.PRIMARY, fontWeight: 700 }}>Thông tin khách hàng</Title>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <Text style={{ color: THEME.TEXT_GRAY, fontSize: 15 }}>Vui lòng điền vào mẫu dưới đây để đặt chỗ của bạn.</Text>
                  </div>

                  <Form form={form} layout="vertical" onFinish={handleCheckout}>
                    <Card variant="borderless" style={{ borderRadius: 12, border: '1px solid #e5e5e5', marginBottom: 24, padding: 0 }}>
                      <Row gutter={24}>
                        <Col xs={24} md={12}>
                          <Form.Item name="lastName" label={<Text strong>Họ <span style={{color:'red'}}>*</span></Text>} rules={[{ required: true, message: 'Vui lòng nhập Họ' }]}>
                            <Input size="large" placeholder="Eg: Nguyễn" style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderRadius: 8 }} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item name="firstName" label={<Text strong>Tên đệm và tên <span style={{color:'red'}}>*</span></Text>} rules={[{ required: true, message: 'Vui lòng nhập Tên' }]}>
                            <Input size="large" placeholder="Eg: Thị A" style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderRadius: 8 }} />
                          </Form.Item>
                        </Col>
                        
                        <Col span={24}>
                          <Form.Item name="email" label={<Text strong>Email <span style={{color:'red'}}>*</span></Text>} rules={[{ required: true, message: 'Vui lòng nhập Email' }, { type: 'email', message: 'Email không hợp lệ' }]}>
                            <Input size="large" placeholder="abc@gmail.com" style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderRadius: 8 }} />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={12}>
                          <Form.Item name="phone" label={<Text strong>Điện thoại <span style={{color:'red'}}>*</span></Text>} rules={[{ required: true, message: 'Vui lòng nhập SĐT' }]}>
                            <Space.Compact style={{ width: '100%' }}>
                              <Select size="large" defaultValue="+84" style={{ width: '30%', backgroundColor: '#F8FAFC' }} options={[{ value: '+84', label: '+84' }]} />
                              <Input size="large" placeholder="Số điện thoại" style={{ width: '70%', backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderRadius: '0 8px 8px 0' }} />
                            </Space.Compact>
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item name="country" label={<Text strong>Vùng quốc gia</Text>}>
                            <Select size="large" defaultValue="VN" style={{ backgroundColor: '#F8FAFC' }} options={[{ value: 'VN', label: 'Việt Nam' }, { value: 'US', label: 'United States' }]} />
                          </Form.Item>
                        </Col>
                        
                        <Col span={24}>
                          <Form.Item name="requests" label={<Text strong>Yêu cầu đặc biệt</Text>}>
                            <Checkbox.Group style={{ width: '100%' }}>
                              <Row gutter={[16, 16]}>
                                <Col span={12} md={6}><Checkbox value="Tầng cao">Tầng cao</Checkbox></Col>
                                <Col span={12} md={6}><Checkbox value="Không hút thuốc">Không hút thuốc</Checkbox></Col>
                                <Col span={12} md={6}><Checkbox value="Hỗ trợ người khuyết tật">Hỗ trợ khuyết tật</Checkbox></Col>
                                <Col span={12} md={6}><Checkbox value="Giờ linh hoạt">Giờ linh hoạt</Checkbox></Col>
                              </Row>
                            </Checkbox.Group>
                          </Form.Item>
                        </Col>
                        <Col span={24}>
                          <Form.Item name="note" label={<Text strong>Ghi chú</Text>} extra={<Text style={{fontSize: 13, color: '#888'}}>Nếu bạn có các yêu cầu đặc biệt hoặc bất kỳ câu hỏi nào, hãy cho chúng tôi biết ở đây.</Text>}>
                            <Input.TextArea rows={4} placeholder="Lời nhắn" style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderRadius: 8, marginTop: 8 }} />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>

                    <Card variant="borderless" style={{ borderRadius: 12, marginBottom: 24, padding: 0 }}>
                      <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 16 }}>Phương thức thanh toán</Text>
                      <Form.Item name="paymentMethod" initialValue="ATM" style={{ marginBottom: 0 }}>
                        <Radio.Group style={{ width: '100%' }}>
                          <Space direction="vertical" style={{ width: '100%', gap: 16 }}>
                            <Radio value="ATM" style={{ width: '100%', padding: '16px 20px', border: '1px solid #e5e5e5', borderRadius: 8, display: 'flex', alignItems: 'center' }}>
                              <Text strong style={{ fontSize: 15 }}>Thẻ/tài khoản ngân hàng (ATM nội địa/quốc tế)</Text>
                            </Radio>
                            <Radio value="CREDIT" style={{ width: '100%', padding: '16px 20px', border: '1px solid #e5e5e5', borderRadius: 8, display: 'flex', alignItems: 'center' }}>
                              <Text strong style={{ fontSize: 15 }}>Thẻ tín dụng/ghi nợ quốc tế (Visa/Master/JCB)</Text>
                            </Radio>
                            <Radio value="QR" style={{ width: '100%', padding: '16px 20px', border: '1px solid #e5e5e5', borderRadius: 8, display: 'flex', alignItems: 'center' }}>
                              <Text strong style={{ fontSize: 15 }}>Thanh toán bằng mã QR</Text>
                            </Radio>
                            <Radio value="MOMO" style={{ width: '100%', padding: '16px 20px', border: '1px solid #e5e5e5', borderRadius: 8, display: 'flex', alignItems: 'center' }}>
                              <Text strong style={{ fontSize: 15 }}>Thanh toán bằng ví điện tử Momo</Text>
                            </Radio>
                          </Space>
                        </Radio.Group>
                      </Form.Item>
                    </Card>

                    <Form.Item name="agreement" valuePropName="checked" rules={[{ validator: (_, value) => value ? Promise.resolve() : Promise.reject(new Error('Vui lòng đồng ý điều khoản')) }]}>
                      <Checkbox style={{ fontSize: 15 }}>Tôi đồng ý cung cấp các thông tin trên và đồng ý với các điều khoản, điều kiện và chính sách quyền riêng tư của ABC.</Checkbox>
                    </Form.Item>

                    <Button id="submit-booking-form" htmlType="submit" style={{ display: 'none' }}></Button>
                  </Form>
                </div>
              )}
            </Col>

            {/* ======================= CỘT PHẢI (SIDEBAR BILL TÍNH TIỀN) ======================= */}
            <Col xs={24} md={8}>
              <div style={{ position: 'sticky', top: 90 }}>
                <Card 
                  variant="borderless" 
                  style={{ borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0', maxHeight: 'calc(100vh - 110px)', display: 'flex', flexDirection: 'column' }} 
                  bodyStyle={{ padding: '24px 24px', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
                >
                  <div style={{ flexShrink: 0 }}>
                    <Title level={4} style={{ marginTop: 0, marginBottom: 20 }}>Chuyến đi</Title>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong style={{ fontSize: 15, color: THEME.TEXT_DARK }}>ABC Resort Đà Nẵng</Text>
                      <PencilSimple size={18} color={THEME.TEXT_GRAY} cursor="pointer" onClick={() => navigate('/')} />
                    </div>

                    <Divider style={{ margin: '16px 0', borderColor: '#eaeaea' }} />

                    <Text style={{ fontSize: 13, color: THEME.TEXT_GRAY, display: 'block' }}>
                      {checkInStr} &rarr; {checkOutStr}
                    </Text>
                    <Text style={{ fontSize: 12, color: THEME.TEXT_GRAY, display: 'block', marginTop: 4, marginBottom: 16 }}>
                      {durationText}
                    </Text>

                    <Divider style={{ margin: '16px 0', borderColor: '#eaeaea' }} />
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4, marginRight: -4 }}>
                    {currentStep === 0 && !selectedRoom && (
                      <Text style={{ color: THEME.TEXT_GRAY, fontStyle: 'italic', fontSize: 13 }}>Chưa chọn phòng</Text>
                    )}

                    {selectedRoom && (
                      <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                        <Text strong style={{ display: 'block', fontSize: 15, marginBottom: 4 }}>Phòng 1</Text>
                        <Text style={{ display: 'block', fontSize: 13, color: THEME.TEXT_GRAY }}>{selectedRoom.roomTypeName || selectedRoom.RoomTypeName}</Text>
                        <Text style={{ display: 'block', fontSize: 13, color: THEME.TEXT_GRAY }}>{searchParams.adults} Người lớn</Text>
                        
                        <Text style={{ display: 'block', fontSize: 13, color: THEME.TEXT_GRAY, marginBottom: 8, marginTop: 4 }}>
                          {formatPrice(billInfo.pricePerUnit)} x {durationText} = <Text strong style={{color: THEME.TEXT_DARK}}>{formatPrice(billInfo.roomTotal)}</Text>
                        </Text>

                        {selectedServices.map((s, i) => (
                           <Text key={i} style={{ display: 'block', fontSize: 13, color: THEME.TEXT_GRAY }}>
                             {s.name} ({s.quantity}x): <Text strong style={{color: THEME.TEXT_DARK}}>{formatPrice(s.price * s.quantity)}</Text>
                           </Text>
                        ))}

                        <div style={{ marginTop: 24 }}>
                          <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 16 }}>Chi tiết thanh toán</Text>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                            <Text style={{ color: THEME.TEXT_GRAY, fontSize: 14 }}>Tiền phòng ({durationText})</Text>
                            <Text strong style={{ fontSize: 14 }}>{formatPrice(billInfo.roomTotal)}</Text>
                          </div>
                          
                          {/* Đã tách rõ khoản Dịch vụ Mua thêm ra để thể hiện tính logic */}
                          {selectedServices.length > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                              <Text style={{ color: THEME.TEXT_GRAY, fontSize: 14 }}>Dịch vụ mua thêm</Text>
                              <Text strong style={{ fontSize: 14 }}>{formatPrice(billInfo.serviceTotal)}</Text>
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                            <Text style={{ color: THEME.TEXT_GRAY, fontSize: 14 }}>Giảm giá</Text>
                            <Text strong style={{ fontSize: 14 }}>0 đ</Text>
                          </div>
                          <Divider style={{ margin: '16px 0', borderColor: '#eaeaea' }} />
                          <div style={{ textAlign: 'right' }}>
                            <Text strong style={{ fontSize: 15, color: THEME.TEXT_DARK }}>Tổng cộng</Text><br/>
                            <Text strong style={{ fontSize: 24, color: THEME.PRIMARY }}>{formatPrice(billInfo.finalTotal)}</Text><br/>
                            <Text style={{ fontSize: 12, color: THEME.TEXT_GRAY }}>(Đã gồm thuế/phí)</Text>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ flexShrink: 0, marginTop: 16, paddingTop: 16, borderTop: '1px solid #eaeaea' }}>
                    {currentStep === 0 && (
                      <Button 
                        type="primary" block size="large" 
                        disabled={!selectedRoom}
                        onClick={() => { setCurrentStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                        style={{ height: 50, borderRadius: 8, backgroundColor: selectedRoom ? THEME.PRIMARY : '#ccc', fontWeight: 600 }}
                      >
                        Tiếp tục {selectedRoom ? <ArrowRight style={{marginLeft: 8}}/> : ''}
                      </Button>
                    )}

                    {currentStep === 1 && (
                      <Row gutter={12}>
                        <Col span={10}>
                          <Button block size="large" onClick={() => { setCurrentStep(0); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ height: 50, borderRadius: 8, fontWeight: 600 }}>
                            <CaretLeft style={{marginRight: 4}}/> Quay lại
                          </Button>
                        </Col>
                        <Col span={14}>
                          <Button type="primary" block size="large" onClick={() => { setCurrentStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ height: 50, borderRadius: 8, backgroundColor: THEME.PRIMARY, fontWeight: 600 }}>
                            Thanh toán <ArrowRight style={{marginLeft: 8}}/>
                          </Button>
                        </Col>
                      </Row>
                    )}

                    {currentStep === 2 && (
                      <Row gutter={12}>
                        <Col span={10}>
                          <Button block size="large" onClick={() => { setCurrentStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ height: 50, borderRadius: 8, fontWeight: 600 }}>
                            <CaretLeft style={{marginRight: 4}}/> Quay lại
                          </Button>
                        </Col>
                        <Col span={14}>
                          <Button 
                            type="primary" block size="large" loading={loading}
                            onClick={() => document.getElementById('submit-booking-form').click()} 
                            style={{ height: 50, borderRadius: 8, backgroundColor: '#000', fontWeight: 600 }}
                          >
                            Xác nhận <ArrowRight style={{marginLeft: 8}}/>
                          </Button>
                        </Col>
                      </Row>
                    )}
                  </div>
                </Card>
              </div>
            </Col>
          </Row>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .custom-steps .ant-steps-item-process .ant-steps-item-icon { background-color: ${THEME.PRIMARY} !important; border-color: ${THEME.PRIMARY} !important; }
        .custom-steps .ant-steps-item-finish .ant-steps-item-icon { border-color: ${THEME.PRIMARY} !important; }
        .custom-steps .ant-steps-item-finish .ant-steps-item-icon > .ant-steps-icon { color: ${THEME.PRIMARY} !important; }
        .custom-steps .ant-steps-item-title { font-weight: 500 !important; }
        .custom-steps .ant-steps-item-active .ant-steps-item-title { color: ${THEME.PRIMARY} !important; font-weight: 600 !important; }
        
        .ant-radio-wrapper .ant-radio-checked .ant-radio-inner { border-color: #000 !important; background-color: #000 !important; }
        .ant-checkbox-checked .ant-checkbox-inner { background-color: #000 !important; border-color: #000 !important; }
      `}</style>
    </div>
  );
}