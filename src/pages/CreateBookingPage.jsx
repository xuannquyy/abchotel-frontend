import React, { useState } from 'react';
import { 
  Card, Steps, Button, Form, DatePicker, InputNumber, Row, Col, 
  Typography, Space, notification, Tag, Divider, Result, Radio, Input, TimePicker, Badge 
} from 'antd';
import { 
  MagnifyingGlass, User, CreditCard, IdentificationCard, Door, 
  Clock, Bed, ShoppingCart, Plus, Trash, Users, ArrowsOut, Eye // 🔥 THÊM ICON Ở ĐÂY
} from '@phosphor-icons/react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

import { bookingApi } from '../api/bookingApi';

const { Title, Text } = Typography;

const LUXURY_COLORS = {
  DARKEST: '#0D1821', NAVY: '#344966', MUTED_BLUE: '#7D92AD', 
  LIGHT_BLUE: '#B4CDED', LIGHTEST: '#E9F0F8', WHITE: '#FFFFFF', 
  GOLD: '#D4AF37', ACCENT_RED: '#8A1538', SUCCESS: '#52c41a'
};

export default function CreateBookingPage() {
  const navigate = useNavigate();
  const [api, contextHolder] = notification.useNotification();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [searchForm] = Form.useForm();
  const [guestForm] = Form.useForm();
  
  const [availableRooms, setAvailableRooms] = useState([]);
  
  const [cart, setCart] = useState([]); 
  const [currentSearchQuery, setCurrentSearchQuery] = useState(null);
  
  const [specificRoomsMap, setSpecificRoomsMap] = useState([]); 
  const [bookingSuccessData, setBookingSuccessData] = useState(null);

  const [bookingMode, setBookingMode] = useState('NIGHTLY'); 

  const addToCart = (roomType) => {
    if (cart.length >= 5) return api.warning({ message: 'Chỉ được đặt tối đa 5 phòng cùng lúc.' });

    const newItem = {
      cartId: Date.now() + Math.random(), 
      roomTypeId: roomType.roomTypeId,
      roomTypeName: roomType.roomTypeName,
      checkInDate: currentSearchQuery.checkIn,
      checkOutDate: currentSearchQuery.checkOut,
      priceType: currentSearchQuery.priceType,
      price: roomType.subTotal,
      adults: currentSearchQuery.adults,
      children: currentSearchQuery.children
    };

    setCart([...cart, newItem]);
    api.success({ message: `Đã thêm 1 phòng ${roomType.roomTypeName} vào đơn.` });
  };

  const removeFromCart = (cartId) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  const handleSearch = async (values) => {
    let checkInDate, checkOutDate;

    if (bookingMode === 'NIGHTLY') {
      if (!values.dates || values.dates.length < 2) return api.warning({ message: 'Chọn ngày giờ Nhận - Trả phòng!' });
      checkInDate = values.dates[0]; checkOutDate = values.dates[1];
    } else {
      if (!values.date) return api.warning({ message: 'Chọn ngày diễn ra sự kiện!' });
      if (!values.timeRange || values.timeRange.length < 2) return api.warning({ message: 'Chọn khung giờ cụ thể!' });
      checkInDate = values.date.clone().hour(values.timeRange[0].hour()).minute(values.timeRange[0].minute());
      checkOutDate = values.date.clone().hour(values.timeRange[1].hour()).minute(values.timeRange[1].minute());
    }

    if (checkInDate.isBefore(dayjs(), 'minute')) return api.warning({ message: 'Giờ nhận phòng không được nằm trong quá khứ!' });
    if (checkOutDate.isBefore(checkInDate) || checkOutDate.isSame(checkInDate)) {
      return api.warning({ 
        message: 'Sai thời gian', 
        description: 'Giờ Trả phòng bắt buộc phải LỚN HƠN Giờ Nhận phòng!' 
      });
    }
    if (bookingMode === 'HOURLY' && checkOutDate.diff(checkInDate, 'hour') > 24) 
      return api.warning({ message: 'Thuê Theo Giờ chỉ được tối đa 24 tiếng.' });

    try {
      setLoading(true);
      const request = {
        checkIn: checkInDate.format('YYYY-MM-DDTHH:mm:ss'),
        checkOut: checkOutDate.format('YYYY-MM-DDTHH:mm:ss'),
        adults: values.adults || 1,
        children: values.children || 0,
        requestedRooms: 1, 
        priceType: bookingMode 
      };

      setCurrentSearchQuery(request);
      const res = await bookingApi.searchRooms(request);
      setAvailableRooms(res || []);
      if (res.length === 0) api.info({ message: 'Không có phòng trống theo điều kiện này.' });
    } catch (error) { api.error({ message: 'Lỗi tìm phòng.' }); } 
    finally { setLoading(false); }
  };

  const handleProceedToCheckout = async () => {
    if (cart.length === 0) return api.warning({ message: 'Giỏ hàng đang trống.' });
    
    try {
      setLoading(true);
      const roomsDataPromises = cart.map(item => 
        bookingApi.getSpecificRooms(item.roomTypeId, item.checkInDate, item.checkOutDate)
      );
      
      const results = await Promise.all(roomsDataPromises);
      
      const mappedResults = results.map(roomsList => {
        const grouped = roomsList.reduce((acc, room) => {
          const floor = `Tầng ${room.roomNumber.replace(/\D/g, '').charAt(0) || '?'}`;
          if (!acc[floor]) acc[floor] = [];
          acc[floor].push(room); return acc;
        }, {});
        return grouped;
      });

      setSpecificRoomsMap(mappedResults);
      setCurrentStep(1);
    } catch (error) {
      api.error({ message: 'Lỗi tải danh sách phòng vật lý.' });
    } finally { setLoading(false); }
  };

  const handleCreateBooking = async (values) => {
    const selectedKeys = Object.keys(values.selectedRooms);
    const selectedRoomIds = selectedKeys.map(k => values.selectedRooms[k]);
    const uniqueRoomIds = new Set(selectedRoomIds);
    if (uniqueRoomIds.size !== selectedRoomIds.length) {
      return api.error({ message: 'Lỗi Xếp Phòng', description: 'Bạn đang chọn 1 phòng cho 2 khách khác nhau. Vui lòng kiểm tra lại sơ đồ chọn phòng.' });
    }

    try {
      setLoading(true);
      const roomsPayload = cart.map((item, index) => ({
        roomTypeId: item.roomTypeId,
        roomId: values.selectedRooms[index], 
        quantity: 1,
        checkInDate: item.checkInDate,
        checkOutDate: item.checkOutDate,
        priceType: item.priceType
      }));

      const request = {
        guestName: values.guestName, guestPhone: values.guestPhone.trim(),
        guestEmail: values.guestEmail ? values.guestEmail.trim() : null,
        identityNumber: values.identityNumber ? values.identityNumber.trim() : null,
        specialRequests: values.specialRequests || "", 
        rooms: roomsPayload 
      };
      
      const res = await bookingApi.createBooking(request);
      setBookingSuccessData(res);
      setCurrentStep(2); 
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Lỗi khi tạo đơn. Vui lòng thử lại.';
      api.error({ message: 'Lỗi Hệ thống', description: errorMsg });
    } finally { setLoading(false); }
  };

  const totalCartAmount = cart.reduce((sum, item) => sum + item.price, 0);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out', maxWidth: 1200, margin: '0 auto' }}>
      {contextHolder}
      <Title level={3} style={{ color: LUXURY_COLORS.DARKEST, marginBottom: 24, fontWeight: 700 }}>Lễ tân: Đặt phòng linh hoạt</Title>

      <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(13,24,33,0.05)', marginBottom: 24 }}>
        <Steps current={currentStep} items={[
          { title: 'Tìm & Thêm vào đơn', icon: <MagnifyingGlass size={24} /> },
          { title: 'Xếp phòng & Khách', icon: <User size={24} /> },
          { title: 'Hoàn tất', icon: <CreditCard size={24} /> },
        ]} />
      </Card>

      {currentStep === 0 && (
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
            <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(13,24,33,0.05)', height: '100%' }}>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20, borderBottom: `1px solid ${LUXURY_COLORS.LIGHTEST}`, paddingBottom: 16 }}>
                <Button 
                  type={bookingMode === 'NIGHTLY' ? 'primary' : 'default'} 
                  style={{ 
                    backgroundColor: bookingMode === 'NIGHTLY' ? LUXURY_COLORS.NAVY : undefined,
                    flex: '1 1 auto' 
                  }} 
                  onClick={() => setBookingMode('NIGHTLY')} 
                  icon={<Door size={18} />} 
                  size="large"
                >
                  Thuê Theo Đêm
                </Button>
                <Button 
                  type={bookingMode === 'HOURLY' ? 'primary' : 'default'} 
                  style={{ 
                    backgroundColor: bookingMode === 'HOURLY' ? LUXURY_COLORS.NAVY : undefined,
                    flex: '1 1 auto' 
                  }} 
                  onClick={() => setBookingMode('HOURLY')} 
                  icon={<Clock size={18} />} 
                  size="large"
                >
                  Thuê Theo Giờ
                </Button>
              </div>

              <Form form={searchForm} layout="vertical" onFinish={handleSearch} initialValues={{ adults: 2, children: 0 }}>
                <Row gutter={16}>
                  <Col xs={24} md={bookingMode === 'NIGHTLY' ? 12 : 8}>
                    <Form.Item name={bookingMode === 'NIGHTLY' ? "dates" : "date"} label={<Text strong>Thời gian nhận - trả</Text>} rules={[{ required: true, message: 'Bắt buộc' }]}>
                      {bookingMode === 'NIGHTLY' 
                        ? <DatePicker.RangePicker style={{ width: '100%' }} size="large" format="DD/MM/YYYY HH:mm" showTime disabledDate={c => c && c < dayjs().startOf('day')} />
                        : <DatePicker style={{ width: '100%' }} size="large" format="DD/MM/YYYY" disabledDate={c => c && c < dayjs().startOf('day')} />
                      }
                    </Form.Item>
                  </Col>
                  
                  {bookingMode === 'HOURLY' && (
                    <Col xs={24} md={8}>
                      <Form.Item name="timeRange" label={<Text strong>Khung giờ</Text>} rules={[{ required: true, message: 'Bắt buộc' }]}>
                        <TimePicker.RangePicker style={{ width: '100%' }} size="large" format="HH:mm" />
                      </Form.Item>
                    </Col>
                  )}

                  <Col xs={12} md={bookingMode === 'NIGHTLY' ? 6 : 4}>
                    <Form.Item name="adults" label={<Text strong>Người lớn</Text>}><InputNumber size="large" min={1} max={50} style={{ width: '100%' }} /></Form.Item>
                  </Col>
                  <Col xs={12} md={bookingMode === 'NIGHTLY' ? 6 : 4}>
                    <Form.Item name="children" label={<Text strong>Trẻ em</Text>}><InputNumber size="large" min={0} max={50} style={{ width: '100%' }} /></Form.Item>
                  </Col>
                </Row>
                <Button type="primary" htmlType="submit" size="large" icon={<MagnifyingGlass/>} loading={loading} style={{ backgroundColor: LUXURY_COLORS.ACCENT_RED, width: '100%' }}>
                  TÌM PHÒNG TRỐNG
                </Button>
              </Form>

              {availableRooms.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <Divider />
                  <Row gutter={[16, 16]}>
                    {availableRooms.map((item, index) => (
                      <Col xs={24} sm={24} lg={12} key={index}>
                        {/* 🔥 GIAO DIỆN CARD MỚI HIỂN THỊ ĐẦY ĐỦ THÔNG SỐ 🔥 */}
                        <Card size="small" hoverable style={{ border: `1px solid ${LUXURY_COLORS.LIGHT_BLUE}`, backgroundColor: LUXURY_COLORS.LIGHTEST, height: '100%', display: 'flex', flexDirection: 'column' }}>
                          
                          <Title level={5} style={{ marginTop: 0, marginBottom: 12, color: LUXURY_COLORS.NAVY }}>{item.roomTypeName}</Title>
                          
                          {/* Lưới thông số phòng */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: LUXURY_COLORS.MUTED_BLUE, fontSize: 13 }}>
                              <Users size={16} /> <span>{item.capacityAdults || '?'} Lớn, {item.capacityChildren || 0} Bé</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: LUXURY_COLORS.MUTED_BLUE, fontSize: 13 }}>
                              <ArrowsOut size={16} /> <span>{item.sizeSqm || '?'} m²</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: LUXURY_COLORS.MUTED_BLUE, fontSize: 13 }}>
                              <Bed size={16} /> <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.bedType || 'Tiêu chuẩn'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: LUXURY_COLORS.MUTED_BLUE, fontSize: 13 }}>
                              <Eye size={16} /> <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.viewDirection || 'Đang cập nhật'}</span>
                            </div>
                          </div>

                          <div style={{ marginTop: 'auto' }}>
                            <Divider style={{ margin: '0 0 12px 0', borderColor: LUXURY_COLORS.LIGHT_BLUE }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                              <Text>Trống: <Tag color="cyan" style={{ margin: 0 }}>{item.remainingRooms} phòng</Tag></Text>
                              <Text strong style={{ color: LUXURY_COLORS.ACCENT_RED, fontSize: 18 }}>
                                {new Intl.NumberFormat('vi-VN').format(item.subTotal)}đ
                              </Text>
                            </div>
                            <Button type="dashed" block onClick={() => addToCart(item)} style={{ borderColor: LUXURY_COLORS.NAVY, color: LUXURY_COLORS.NAVY, fontWeight: 600 }}>
                              <Plus weight="bold" /> Thêm vào đơn
                            </Button>
                          </div>
                          
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card title={<Space><ShoppingCart size={24} color={LUXURY_COLORS.NAVY} /> <span style={{ color: LUXURY_COLORS.NAVY }}>Đơn đang tạo ({cart.length})</span></Space>} variant="borderless" style={{ borderRadius: 12, border: `2px solid ${LUXURY_COLORS.NAVY}`, backgroundColor: '#fff' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: LUXURY_COLORS.MUTED_BLUE }}>
                  Chưa có phòng nào được chọn.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {cart.map((item, idx) => (
                    <div key={item.cartId} style={{ padding: 12, backgroundColor: LUXURY_COLORS.LIGHTEST, borderRadius: 8, position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text strong>{idx + 1}. {item.roomTypeName}</Text>
                        <Trash size={18} color={LUXURY_COLORS.ACCENT_RED} style={{ cursor: 'pointer' }} onClick={() => removeFromCart(item.cartId)} />
                      </div>
                      <Tag color={item.priceType === 'HOURLY' ? 'purple' : 'blue'} style={{ marginTop: 4 }}>{item.priceType === 'HOURLY' ? 'Theo giờ' : 'Theo đêm'}</Tag>
                      <Text style={{ display: 'block', fontSize: 12, marginTop: 4 }}>Khách: {item.adults} Lớn, {item.children} Bé</Text>
                      <Text style={{ display: 'block', fontSize: 12, color: LUXURY_COLORS.MUTED_BLUE }}>
                        {dayjs(item.checkInDate).format('DD/MM HH:mm')} - {dayjs(item.checkOutDate).format('DD/MM HH:mm')}
                      </Text>
                      <Text strong style={{ display: 'block', color: LUXURY_COLORS.ACCENT_RED, marginTop: 4 }}>{new Intl.NumberFormat('vi-VN').format(item.price)}đ</Text>
                    </div>
                  ))}
                  <Divider style={{ margin: '12px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text strong>Tổng cộng:</Text>
                    <Text strong style={{ fontSize: 20, color: LUXURY_COLORS.ACCENT_RED }}>{new Intl.NumberFormat('vi-VN').format(totalCartAmount)}đ</Text>
                  </div>
                  <Button type="primary" size="large" block onClick={handleProceedToCheckout} style={{ backgroundColor: LUXURY_COLORS.NAVY }}>
                    Tiếp Tục Xếp Phòng ⟶
                  </Button>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      )}

      {currentStep === 1 && (
        <Form form={guestForm} layout="vertical" onFinish={handleCreateBooking}>
          <Row gutter={24}>
            <Col xs={24} md={16}>
              <Card title={<span style={{ color: LUXURY_COLORS.DARKEST, fontSize: 18 }}>1. Chỉ định phòng vật lý</span>} variant="borderless" style={{ borderRadius: 12, backgroundColor: LUXURY_COLORS.WHITE, marginBottom: 24, boxShadow: '0 4px 12px rgba(13,24,33,0.05)' }}>
                {cart.map((cartItem, index) => (
                  <div key={cartItem.cartId} style={{ padding: '20px', backgroundColor: LUXURY_COLORS.LIGHTEST, border: `1px solid ${LUXURY_COLORS.LIGHT_BLUE}`, borderRadius: 8, marginBottom: 24 }}>
                    <Title level={5} style={{ color: LUXURY_COLORS.NAVY, marginTop: 0, marginBottom: 8 }}>
                      <Door size={20} style={{ verticalAlign: 'middle', marginRight: 8 }}/> Phòng {index + 1}: {cartItem.roomTypeName}
                    </Title>
                    <Text type="secondary" style={{display: 'block', marginBottom: 16}}>Thời gian: {dayjs(cartItem.checkInDate).format('DD/MM/YYYY HH:mm')} - {dayjs(cartItem.checkOutDate).format('DD/MM/YYYY HH:mm')}</Text>
                    
                    <Form.Item name={['selectedRooms', index]} rules={[{ required: true, message: 'Bắt buộc chọn 1 phòng' }]} style={{ marginBottom: 0 }}>
                      <Radio.Group style={{ width: '100%' }}>
                        {specificRoomsMap[index] && Object.entries(specificRoomsMap[index]).map(([floor, rooms]) => (
                          <div key={floor} style={{ marginBottom: 16 }}>
                            <Text strong style={{ display: 'block', marginBottom: 8, color: LUXURY_COLORS.MUTED_BLUE, borderBottom: `1px dashed ${LUXURY_COLORS.LIGHT_BLUE}`, paddingBottom: 4 }}>{floor}</Text>
                            <Row gutter={[12, 12]}>
                              {rooms.map((room) => (
                                <Col span={8} sm={6} md={6} lg={4} key={room.roomId}>
                                  <Radio.Button 
                                    value={room.roomId} 
                                    style={{ width: '100%', height: 'auto', padding: '12px 0', textAlign: 'center', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `1px solid ${LUXURY_COLORS.LIGHT_BLUE}`, boxShadow: '0 2px 4px rgba(13,24,33,0.02)' }}
                                    className="luxury-room-card"
                                  >
                                    <Bed size={26} weight="regular" className="bed-icon" />
                                    <Text strong style={{ fontSize: 16, display: 'block', marginTop: 4 }} className="room-number-text">{room.roomNumber}</Text>
                                  </Radio.Button>
                                </Col>
                              ))}
                            </Row>
                          </div>
                        ))}
                      </Radio.Group>
                    </Form.Item>
                  </div>
                ))}
              </Card>

              <Card title={<span style={{ color: LUXURY_COLORS.DARKEST, fontSize: 18 }}>2. Thông tin Người đại diện</span>} variant="borderless" style={{ borderRadius: 12, backgroundColor: LUXURY_COLORS.WHITE, boxShadow: '0 4px 12px rgba(13,24,33,0.05)' }}>
                <Row gutter={16}>
                  <Col xs={24} md={12}><Form.Item name="guestName" label={<Text strong style={{color: LUXURY_COLORS.DARKEST}}>Họ và Tên</Text>} rules={[{ required: true }]}><Input size="large" placeholder="VD: Nguyễn Văn A" /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="guestPhone" label={<Text strong style={{color: LUXURY_COLORS.DARKEST}}>Số điện thoại</Text>} rules={[{ required: true }]}><Input size="large" placeholder="09xxxx" /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="guestEmail" label={<Text strong style={{color: LUXURY_COLORS.MUTED_BLUE}}>Email (Tùy chọn)</Text>}><Input size="large" placeholder="VD: email@domain.com" /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="identityNumber" label={<Text strong style={{color: LUXURY_COLORS.MUTED_BLUE}}>Số CCCD / Passport (Tùy chọn)</Text>}><Input size="large" prefix={<IdentificationCard color={LUXURY_COLORS.MUTED_BLUE}/>} placeholder="Nhập 12 số CCCD" /></Form.Item></Col>
                  <Col span={24}><Form.Item name="specialRequests" label={<Text strong style={{color: LUXURY_COLORS.MUTED_BLUE}}>Ghi chú thêm</Text>}><Input.TextArea rows={2} /></Form.Item></Col>
                </Row>
                
                <Space style={{ marginTop: 16 }}>
                  <Button size="large" onClick={() => setCurrentStep(0)} style={{ borderColor: LUXURY_COLORS.MUTED_BLUE, color: LUXURY_COLORS.DARKEST }}>Quay lại giỏ hàng</Button>
                  <Button size="large" type="primary" htmlType="submit" loading={loading} style={{ backgroundColor: LUXURY_COLORS.NAVY }}>Xác nhận Tạo Đơn & Khóa Phòng</Button>
                </Space>
              </Card>
            </Col>
            
            <Col xs={24} md={8}>
              <Card title={<span style={{ color: LUXURY_COLORS.DARKEST, fontSize: 18 }}>Tóm tắt đơn ({cart.length} Phòng)</span>} variant="borderless" style={{ borderRadius: 12, backgroundColor: LUXURY_COLORS.LIGHTEST, border: `1px solid ${LUXURY_COLORS.LIGHT_BLUE}` }}>
                 {cart.map((r, idx) => (
                   <div key={idx} style={{ marginBottom: 16, borderBottom: `1px dashed ${LUXURY_COLORS.LIGHT_BLUE}`, paddingBottom: 12 }}>
                     <Text strong style={{ color: LUXURY_COLORS.NAVY, fontSize: 15 }}>{idx+1}. {r.roomTypeName}</Text><br/>
                     <Text style={{ color: LUXURY_COLORS.MUTED_BLUE, fontSize: 12, display: 'block' }}>Vào: {dayjs(r.checkInDate).format('DD/MM/YYYY HH:mm')}</Text>
                     <Text style={{ color: LUXURY_COLORS.MUTED_BLUE, fontSize: 12, display: 'block' }}>Ra: &nbsp;&nbsp;{dayjs(r.checkOutDate).format('DD/MM/YYYY HH:mm')}</Text>
                     <Text strong style={{ color: LUXURY_COLORS.ACCENT_RED, display: 'block', marginTop: 4 }}>{new Intl.NumberFormat('vi-VN').format(r.price)}đ</Text>
                   </div>
                 ))}
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                   <Text strong style={{ color: LUXURY_COLORS.MUTED_BLUE }}>Tổng thanh toán:</Text>
                   <Text strong style={{ color: LUXURY_COLORS.ACCENT_RED, fontSize: 22 }}>{new Intl.NumberFormat('vi-VN').format(totalCartAmount)}đ</Text>
                 </div>
              </Card>
            </Col>
          </Row>
        </Form>
      )}

      {currentStep === 2 && (
        <Card variant="borderless" style={{ borderRadius: 12, textAlign: 'center', padding: '40px 0', backgroundColor: LUXURY_COLORS.WHITE, border: `1px solid ${LUXURY_COLORS.LIGHT_BLUE}` }}>
          <Result
            status="success"
            title={<span style={{ color: LUXURY_COLORS.NAVY }}>Nhận Phòng Thành Công!</span>}
            subTitle={`Mã đơn: ${bookingSuccessData?.bookingCode}. Hệ thống đã tự động khóa phòng vật lý. Lễ tân vui lòng giao chìa khóa cho khách.`}
            extra={[
              <Button type="primary" key="console" size="large" onClick={() => navigate('/admin/rooms')} style={{ backgroundColor: LUXURY_COLORS.NAVY }}>
                Tới trang Sơ Đồ Phòng
              </Button>,
              <Button key="buy" size="large" onClick={() => { 
                setCurrentStep(0); 
                setCart([]); 
                guestForm.resetFields(); 
                setAvailableRooms([]); 
              }} style={{ borderColor: LUXURY_COLORS.MUTED_BLUE, color: LUXURY_COLORS.DARKEST }}>
                Tạo Đơn Khác
              </Button>
            ]}
          />
        </Card>
      )}

      <style>{`
        .luxury-room-card { transition: all 0.2s ease; background-color: ${LUXURY_COLORS.WHITE} !important; }
        .luxury-room-card:hover { border-color: ${LUXURY_COLORS.NAVY} !important; box-shadow: 0 4px 8px rgba(52, 73, 102, 0.15) !important; }
        .luxury-room-card .bed-icon { fill: ${LUXURY_COLORS.MUTED_BLUE} !important; }
        .luxury-room-card .room-number-text { color: ${LUXURY_COLORS.DARKEST} !important; }
        
        .ant-radio-button-wrapper-checked.luxury-room-card {
            background-color: ${LUXURY_COLORS.NAVY} !important; border-color: ${LUXURY_COLORS.DARKEST} !important; 
            box-shadow: 0 4px 12px rgba(52, 73, 102, 0.3) !important; transform: scale(1.03); z-index: 10;
        }
        .ant-radio-button-wrapper-checked.luxury-room-card .bed-icon { fill: ${LUXURY_COLORS.WHITE} !important; }
        .ant-radio-button-wrapper-checked.luxury-room-card .room-number-text { color: ${LUXURY_COLORS.WHITE} !important; }
        .ant-radio-button-wrapper::before { display: none !important; }
      `}</style>
    </div>
  );
}