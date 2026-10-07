import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Typography, Button, Space, Tag, notification, Steps, Tooltip, Carousel, Divider } from 'antd';
import { 
  Users, Bed, ArrowsOut, ArrowRight, CalendarBlank, 
  Sparkle, ShieldCheck, SuitcaseRolling, Mountains, CaretLeft, CaretRight, ArrowLeft, CheckCircle, WarningCircle
} from '@phosphor-icons/react';
import { useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';

import { bookingApi } from '../../../api/bookingApi';
import { useSignalR } from '../../../hooks/useSignalR';

const { Title, Text } = Typography;

// 🔥 BẢNG MÀU
const THEME = {
  NAVY_DARK: '#0A192F',      
  NAVY_LIGHT: '#172A45',     
  DARK_RED: '#9E2A2B',       
  GOLD: '#D4AF37',           
  WHITE: '#FFFFFF',
  GRAY_BG: '#F4F7F6',        
  BORDER: '#E2E8F0',
  TEXT_MUTED: '#64748B'
};

const CustomArrow = (props) => {
  const { className, style, onClick, type } = props;
  return (
    <div className={`carousel-arrow ${type}`} onClick={onClick}>
      {type === 'prev' ? <CaretLeft size={24} weight="bold" /> : <CaretRight size={24} weight="bold" />}
    </div>
  );
};

export default function SelectRoomPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [api, contextHolder] = notification.useNotification();

  // =========================================================================
  // 1. CHUẨN HÓA DỮ LIỆU TỪ URL
  // =========================================================================
  const searchParams = useMemo(() => {
    const state = location.state || {};
    const queryParams = new URLSearchParams(location.search); 
    
    let inD = queryParams.get('checkIn') || state.checkIn || state.startDate || state.arrival;
    let outD = queryParams.get('checkOut') || state.checkOut || state.endDate || state.departure;
    
    if (!inD && state.dateRange?.length === 2) {
      inD = state.dateRange[0];
      outD = state.dateRange[1];
    }

    const checkIn = inD ? dayjs(inD).format('YYYY-MM-DDTHH:mm:ss') : dayjs().add(1, 'day').set('hour', 14).set('minute', 0).format('YYYY-MM-DDTHH:mm:ss');
    const checkOut = outD ? dayjs(outD).format('YYYY-MM-DDTHH:mm:ss') : dayjs().add(2, 'day').set('hour', 12).set('minute', 0).format('YYYY-MM-DDTHH:mm:ss');
    
    let priceType = state.priceType || 'NIGHTLY';
    if (queryParams.get('mode') === 'hourly') priceType = 'HOURLY';
    else if (queryParams.get('mode') === 'daily') priceType = 'NIGHTLY';
    
    const preSelectedRoomTypeId = queryParams.get('preSelectedRoomTypeId') || state.preSelectedRoomTypeId || null;

    let config = state.roomsConfig;

    if (!config || !Array.isArray(config) || config.length === 0) {
      const roomsParam = queryParams.get('rooms');
      if (roomsParam) {
        try {
          config = JSON.parse(decodeURIComponent(roomsParam));
        } catch (error) {
          console.error("Lỗi parse cấu hình phòng từ URL:", error);
        }
      }
    }

    const requestedRooms = config && Array.isArray(config) && config.length > 0 
        ? config.length 
        : parseInt(queryParams.get('requestedRooms') || state.requestedRooms || state.rooms || 1, 10);

    if (!config || !Array.isArray(config) || config.length === 0) {
      config = [];
      let totalAdults = parseInt(queryParams.get('adults') || state.adults || state.guests || 2, 10);
      let totalChildren = parseInt(queryParams.get('children') || state.children || 0, 10);

      let baseAdults = Math.floor(totalAdults / requestedRooms);
      let extraAdults = totalAdults % requestedRooms;
      let baseChildren = Math.floor(totalChildren / requestedRooms);
      let extraChildren = totalChildren % requestedRooms;

      for (let i = 0; i < requestedRooms; i++) {
        config.push({
          id: Date.now() + i,
          adults: baseAdults + (i < extraAdults ? 1 : 0) || 1,
          children: baseChildren + (i < extraChildren ? 1 : 0)
        });
      }
    }

    return { checkIn, checkOut, priceType, requestedRooms, preSelectedRoomTypeId, roomsConfig: config };
  }, [location.search, location.state]);

  const duration = useMemo(() => {
    const start = dayjs(searchParams.checkIn);
    const end = dayjs(searchParams.checkOut);
    
    if (searchParams.priceType === 'HOURLY') {
        const mins = end.diff(start, 'minute');
        return Math.max(1, Math.ceil(mins / 60));
    } else {
        const days = end.startOf('day').diff(start.startOf('day'), 'day');
        return Math.max(1, days);
    }
  }, [searchParams]);

  // =========================================================================
  // 2. STATE VÀ XỬ LÝ LẤY GIÁ 
  // =========================================================================
  const [loading, setLoading] = useState(true);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [currentSlotIndex, setCurrentSlotIndex] = useState(0); 
  const [selectedRooms, setSelectedRooms] = useState([]); 
  const [autoSelected, setAutoSelected] = useState(false);

  const currentSlot = searchParams.roomsConfig[currentSlotIndex] || { adults: 2, children: 0 };

  const getRoomPrice = (room) => {
    if (searchParams.priceType === 'HOURLY') {
        return room.basePricePerHour || 0;
    }
    return room.basePricePerNight || room.pricePerUnit || 0;
  };

  const fetchRoomsForCurrentSlot = async () => {
    if (!currentSlot) return;
    try {
      setLoading(true);
      const res = await bookingApi.searchRooms({
        checkIn: searchParams.checkIn,
        checkOut: searchParams.checkOut,
        priceType: searchParams.priceType,
        adults: currentSlot.adults,        
        children: currentSlot.children,    
        requestedRooms: 1                  
      });
      const data = res?.data?.$values || res?.$values || res || [];
      setAvailableRooms(data);

      if (currentSlotIndex === 0 && searchParams.preSelectedRoomTypeId && !autoSelected) {
        const targetRoom = data.find(r => r.roomTypeId === searchParams.preSelectedRoomTypeId || r.id === searchParams.preSelectedRoomTypeId);
        if (targetRoom && targetRoom.remainingRooms > 0) {
            setAutoSelected(true);
            handleSelectRoom(targetRoom);
        }
      }
    } catch (error) {
      api.error({ message: 'Lỗi hệ thống', description: 'Không thể tải danh sách phòng.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoomsForCurrentSlot(); }, [currentSlotIndex, searchParams]);

  useSignalR((notif) => {
    if (notif.title?.includes("mới")) {
      api.info({
        message: <Text strong style={{ color: THEME.DARK_RED }}><Sparkle weight="fill" color={THEME.GOLD}/> Vừa có khách chốt phòng!</Text>,
        description: 'Các hạng phòng đang được đặt rất nhanh, vui lòng hoàn tất lựa chọn!',
        placement: 'bottomLeft', icon: <SuitcaseRolling size={24} color={THEME.DARK_RED}/>
      });
    }
  });

  const handleSelectRoom = (room) => {
    const newSelection = { slotInfo: currentSlot, roomData: room };
    setSelectedRooms(prev => [...prev, newSelection]);

    if (currentSlotIndex < searchParams.requestedRooms - 1) {
        setCurrentSlotIndex(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleUndo = () => {
    if (selectedRooms.length > 0) {
        // Xóa phòng vừa chọn cuối cùng khỏi danh sách
        setSelectedRooms(prev => prev.slice(0, -1));
        // Lùi index về đúng vị trí phòng vừa bị xóa để chọn lại
        setCurrentSlotIndex(selectedRooms.length - 1);
    }
  };

  const handleNextStep = () => {
    navigate('/booking/services', { state: { ...searchParams, selectedRooms: selectedRooms.map(s => s.roomData) } });
  };

  const isAllRoomsSelected = selectedRooms.length === searchParams.requestedRooms;
  
  const totalPrice = selectedRooms.reduce((sum, item) => sum + (getRoomPrice(item.roomData) * duration), 0);

  const renderDateTag = (dateStr) => {
     return searchParams.priceType === 'HOURLY' 
        ? dayjs(dateStr).format('HH:mm DD/MM') 
        : dayjs(dateStr).format('DD/MM');
  };

  const renderFullDateLabel = (dateStr) => {
     return searchParams.priceType === 'HOURLY' 
        ? dayjs(dateStr).format('HH:mm DD/MM/YYYY') 
        : dayjs(dateStr).format('DD/MM/YYYY');
  };

  return (
    <div className="select-room-wrapper">
      {contextHolder}
      
      <div className="booking-topbar">
        <div className="container-inner">
            <Steps current={0} className="luxury-steps" items={[
                { title: 'Chọn Hạng Phòng', icon: <Bed size={22}/> },
                { title: 'Dịch Vụ', icon: <SuitcaseRolling size={22}/> },
                { title: 'Thanh Toán', icon: <ShieldCheck size={22}/> }
            ]} />
        </div>
      </div>

      <div className="container-inner" style={{ marginTop: 40 }}>
        <Row gutter={[32, 32]}>
          
          <Col xs={24} xl={17}>
            <div className="section-header">
                <div style={{ flex: 1 }}>
                    <Title level={2} className="main-title">
                        {isAllRoomsSelected ? "Đã Chọn Xong Hạng Phòng" : `Chọn Hạng Phòng (Phòng ${currentSlotIndex + 1}/${searchParams.requestedRooms})`}
                    </Title>
                    <Space size="middle" className="search-summary-tags" wrap>
                        <Tag icon={<CalendarBlank/>} color="default" className="info-tag">
                            {renderDateTag(searchParams.checkIn)} - {renderDateTag(searchParams.checkOut)}
                        </Tag>
                        {!isAllRoomsSelected && (
                            <Tag icon={<Users/>} color="default" className="info-tag" style={{ color: THEME.DARK_RED, borderColor: THEME.DARK_RED }}>
                                Đang chọn cho: {currentSlot.adults} Lớn, {currentSlot.children} Bé
                            </Tag>
                        )}
                    </Space>
                </div>
                {selectedRooms.length > 0 && (
                    <Button type="default" onClick={handleUndo} icon={<ArrowLeft size={16}/>} className="btn-undo">
                        Sửa Lại Phòng Trước
                    </Button>
                )}
            </div>

            {isAllRoomsSelected ? (
                <div className="success-box">
                    <CheckCircle size={72} color="#10b981" weight="fill"/>
                    <Title level={3} style={{ color: THEME.NAVY_DARK, marginTop: 16 }}>Hoàn tất lựa chọn!</Title>
                    <Text style={{ fontSize: 16, color: THEME.TEXT_MUTED }}>Vui lòng kiểm tra lại Hóa đơn bên phải và bấm "BƯỚC TIẾP THEO".</Text>
                </div>
            ) : loading ? (
                <div className="loading-box"><div className="loader"></div><Text>Đang tìm kiếm phòng trống phù hợp...</Text></div>
            ) : availableRooms.length === 0 ? (
                <div className="empty-box">
                    <WarningCircle size={48} color={THEME.TEXT_MUTED} />
                    <Title level={4} style={{ color: THEME.NAVY_DARK, marginTop: 16 }}>Đã hết phòng phù hợp</Title>
                    <Text type="secondary">Không có hạng phòng nào đủ sức chứa cho {currentSlot.adults} Lớn, {currentSlot.children} Trẻ em.</Text>
                    <Button type="primary" size="large" onClick={() => navigate('/')} className="btn-return">Tìm Ngày Khác</Button>
                </div>
            ) : (
                <div className="room-list">
                    {availableRooms.map((room, index) => {
                        const roomId = room.roomTypeId || room.id;
                        const images = room.images?.$values || room.images || ['https://via.placeholder.com/800x600?text=No+Image'];
                        const amenities = room.amenities?.$values || room.amenities || [];
                        
                        const displayPrice = getRoomPrice(room);

                        return (
                            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} key={roomId}>
                                <Card variant="borderless" className="horizontal-room-card">
                                    <div className="card-inner">
                                        
                                        <div className="room-image-section">
                                            <Carousel effect="fade" arrows prevArrow={<CustomArrow type="prev" />} nextArrow={<CustomArrow type="next" />} dots={false}>
                                                {images.map((img, i) => (
                                                    <div key={i} className="img-holder">
                                                        <img src={img} alt={room.roomTypeName} loading="lazy" />
                                                    </div>
                                                ))}
                                            </Carousel>
                                            {room.isUrgent && <div className="urgent-badge">Chỉ còn {room.remainingRooms} phòng</div>}
                                        </div>

                                        <div className="room-details-section">
                                            <Title level={3} className="room-name">{room.roomTypeName || room.name}</Title>
                                            
                                            <div className="room-desc">
                                                {room.description || 'Tận hưởng không gian nghỉ dưỡng tinh tế với thiết kế hiện đại, mang lại sự thoải mái tuyệt đối.'}
                                            </div>

                                            <div className="specs-row">
                                                <Space size="large" wrap>
                                                    <Space className="spec-item"><ArrowsOut size={16} color={THEME.TEXT_MUTED}/> <Text strong>{room.sizeSqm || 35} m²</Text></Space>
                                                    <Space className="spec-item"><Bed size={16} color={THEME.TEXT_MUTED}/> <Text strong>{room.bedType || 'King Bed'}</Text></Space>
                                                    <Space className="spec-item"><Mountains size={16} color={THEME.TEXT_MUTED}/> <Text strong>{room.viewDirection || 'Hướng Phố'}</Text></Space>
                                                </Space>
                                            </div>

                                            <div className="amenities-row">
                                                {amenities.slice(0, 4).map((a, i) => (
                                                    <span key={i} className="amenity-dot">{a}</span>
                                                ))}
                                                {amenities.length > 4 && <Tooltip title={amenities.slice(4).join(', ')}><span className="amenity-dot more">+{amenities.length - 4}</span></Tooltip>}
                                            </div>
                                        </div>

                                        <div className="room-action-section">
                                            <div className="price-info">
                                                <Text className="price-label">Tổng {duration} {searchParams.priceType === 'HOURLY' ? 'giờ' : 'đêm'}</Text>
                                                <div className="price-value">
                                                    {new Intl.NumberFormat('vi-VN').format(displayPrice * duration)}<span className="currency">VND</span>
                                                </div>
                                                <Text className="tax-info">Giá 1 {searchParams.priceType === 'HOURLY' ? 'giờ' : 'đêm'}: {new Intl.NumberFormat('vi-VN').format(displayPrice)}đ</Text>
                                            </div>

                                            <div className="action-button-wrapper">
                                                <Button type="primary" className="btn-book-now" onClick={() => handleSelectRoom(room)}>
                                                    CHỌN PHÒNG NÀY
                                                </Button>
                                            </div>
                                        </div>

                                    </div>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            )}
          </Col>

          {/* CỘT PHẢI: HÓA ĐƠN TRẮNG SÁNG */}
          <Col xs={24} xl={7}>
            <div className="sticky-bill">
                <Card variant="borderless" className="white-bill-card">
                    <Title level={4} className="bill-title">Chi Tiết Đặt Phòng</Title>
                    
                    <div className="bill-date-box">
                        <div className="date-item">
                            <Text className="date-lbl">Nhận phòng</Text>
                            <Text className="date-val">{renderFullDateLabel(searchParams.checkIn)}</Text>
                        </div>
                        <div className="date-divider"><ArrowRight color={THEME.TEXT_MUTED}/></div>
                        <div className="date-item" style={{textAlign: 'right'}}>
                            <Text className="date-lbl">Trả phòng</Text>
                            <Text className="date-val">{renderFullDateLabel(searchParams.checkOut)}</Text>
                        </div>
                    </div>

                    <Divider style={{ margin: '20px 0' }} className="mobile-hide" />

                    <div className="cart-area">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                            <Text strong style={{ fontSize: 15, color: THEME.NAVY_DARK }}>Danh sách phòng</Text>
                            <Text strong style={{ color: isAllRoomsSelected ? '#52c41a' : THEME.DARK_RED }}>
                                {selectedRooms.length} / {searchParams.requestedRooms}
                            </Text>
                        </div>
                        
                        <AnimatePresence>
                            {selectedRooms.length === 0 ? (
                                <div className="empty-cart-msg">Chưa có phòng nào được chọn</div>
                            ) : (
                                selectedRooms.map((item, idx) => (
                                    <motion.div key={idx} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} className="cart-item-row">
                                        <div className="cart-item-info">
                                            <Text className="cart-item-name">P.{idx + 1}: {item.roomData.roomTypeName || item.roomData.name}</Text>
                                            <Text style={{ display: 'block', fontSize: 12, color: THEME.TEXT_MUTED }}>
                                                <Users size={12} style={{verticalAlign: 'middle', marginRight: 4}}/>{item.slotInfo.adults} Lớn, {item.slotInfo.children} Bé
                                            </Text>
                                        </div>
                                        <Text className="cart-item-price">
                                            {new Intl.NumberFormat('vi-VN').format(getRoomPrice(item.roomData) * duration)}₫
                                        </Text>
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="total-area">
                        <Text className="total-label">Tổng cộng</Text>
                        <div className="total-amount">{new Intl.NumberFormat('vi-VN').format(totalPrice)}<span style={{ fontSize: 20, verticalAlign: 'top' }}>₫</span></div>
                    </div>

                    <Button block className="btn-proceed" onClick={handleNextStep} disabled={!isAllRoomsSelected}>
                        BƯỚC TIẾP THEO
                    </Button>

                    <div className="guarantee-box">
                        <Space><ShieldCheck size={18} color={THEME.DARK_RED}/> <Text style={{fontSize: 12}}>Bảo mật thanh toán 100%</Text></Space>
                    </div>
                </Card>
            </div>
          </Col>

        </Row>
      </div>

      {/* 🔥 CSS CỐT LÕI ĐÃ ĐƯỢC CHUẨN HÓA */}
      <style>{`
        .select-room-wrapper { background-color: ${THEME.GRAY_BG}; min-height: 100vh; padding-bottom: 80px; font-family: 'Inter', sans-serif; }
        .container-inner { max-width: 1400px; margin: 0 auto; padding: 0 24px; } 
        
        .booking-topbar { background: #fff; border-bottom: 1px solid ${THEME.BORDER}; padding: 20px 0; position: sticky; top: 80px; z-index: 100; }
        .luxury-steps .ant-steps-item-process .ant-steps-item-icon { background: ${THEME.NAVY_DARK}; border-color: ${THEME.NAVY_DARK}; }
        .luxury-steps .ant-steps-item-finish .ant-steps-item-icon { border-color: ${THEME.DARK_RED}; }
        .luxury-steps .ant-steps-item-finish .ant-steps-icon { color: ${THEME.DARK_RED}; }

        .section-header { margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px; }
        .main-title { color: ${THEME.NAVY_DARK} !important; font-family: '"Source Serif 4", serif'; font-size: 28px !important; margin-bottom: 12px !important; }
        .info-tag { padding: 6px 12px; font-size: 14px; border-radius: 8px; border: 1px solid ${THEME.BORDER}; background: #fff; color: ${THEME.NAVY_DARK}; display: inline-flex; align-items: center; gap: 6px; }
        .btn-undo { border-radius: 8px; height: 40px; font-weight: 600; color: ${THEME.NAVY_DARK}; }

        .room-list { display: flex; flex-direction: column; gap: 24px; }
        .horizontal-room-card { 
            background: #fff; border-radius: 16px; overflow: hidden; 
            border: 1px solid ${THEME.BORDER}; box-shadow: 0 4px 15px rgba(0,0,0,0.02);
            transition: all 0.3s ease; 
        }
        .horizontal-room-card:hover { box-shadow: 0 12px 30px rgba(0,0,0,0.08); transform: translateY(-2px); border-color: #cbd5e1; }
        
        .card-inner { display: flex; flex-direction: row; align-items: stretch; min-height: 240px; }

        .room-image-section { width: 360px; flex-shrink: 0; position: relative; background: ${THEME.GRAY_BG}; overflow: hidden; }
        .room-image-section .ant-carousel { position: absolute; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; }
        .room-image-section .slick-slider, 
        .room-image-section .slick-list, 
        .room-image-section .slick-track, 
        .room-image-section .slick-slide, 
        .room-image-section .slick-slide > div { height: 100% !important; }
        
        .img-holder { width: 100%; height: 100% !important; outline: none; display: block; overflow: hidden; }
        .img-holder img { width: 100%; height: 100% !important; object-fit: cover; display: block; }
        
        .carousel-arrow { position: absolute; top: 50%; transform: translateY(-50%); z-index: 10; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.8); color: ${THEME.NAVY_DARK}; border-radius: 50%; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .carousel-arrow:hover { background: ${THEME.WHITE}; color: ${THEME.DARK_RED}; }
        .carousel-arrow.prev { left: 12px; }
        .carousel-arrow.next { right: 12px; }
        .urgent-badge { position: absolute; top: 12px; left: 12px; background: ${THEME.DARK_RED}; color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; z-index: 5; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
        
        .room-details-section { flex: 1; padding: 24px; display: flex; flex-direction: column; }
        .room-name { margin: 0 0 8px 0 !important; color: ${THEME.NAVY_DARK} !important; font-family: '"Source Serif 4", serif'; font-size: 22px !important; font-weight: 700 !important; }
        
        .room-desc { font-size: 13px; color: ${THEME.TEXT_MUTED}; margin-bottom: 16px !important; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        
        .specs-row { margin-bottom: 16px; }
        .spec-item { font-size: 13px; color: ${THEME.NAVY_DARK}; }
        
        .amenities-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: auto; }
        .amenity-dot { font-size: 12px; color: ${THEME.TEXT_MUTED}; background: ${THEME.GRAY_BG}; padding: 4px 10px; border-radius: 12px; border: 1px solid ${THEME.BORDER}; }
        .amenity-dot.more { cursor: pointer; color: ${THEME.NAVY_DARK}; font-weight: bold; }

        .room-action-section { width: 260px; flex-shrink: 0; border-left: 1px dashed ${THEME.BORDER}; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; background: #fafafa; }
        .price-info { text-align: right; margin-bottom: 20px; }
        .price-label { display: block; font-size: 12px; color: ${THEME.TEXT_MUTED}; font-weight: 600; text-transform: uppercase; margin-bottom: 4px; }
        .price-value { font-size: 26px; font-weight: 800; color: ${THEME.NAVY_DARK}; line-height: 1; margin-bottom: 4px; }
        .currency { font-size: 14px; margin-left: 4px; vertical-align: top; color: ${THEME.TEXT_MUTED}; font-weight: 600; }
        .tax-info { font-size: 11px; color: #94a3b8; }

        .btn-book-now { height: 48px; width: 100%; border-radius: 8px; font-weight: 700; font-size: 14px; letter-spacing: 0.5px; background: ${THEME.NAVY_DARK}; border: none; box-shadow: 0 4px 12px rgba(10, 25, 47, 0.2); }
        .btn-book-now:hover { background: ${THEME.NAVY_LIGHT} !important; transform: translateY(-1px); }

        .sticky-bill { position: sticky; top: 180px; }
        .white-bill-card { background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.05); border: 1px solid ${THEME.BORDER}; }
        .bill-title { color: ${THEME.NAVY_DARK} !important; font-family: '"Source Serif 4", serif'; margin-top: 0; margin-bottom: 20px; font-size: 20px; font-weight: 800 !important; text-align: center; }
        
        .bill-date-box { display: flex; align-items: center; justify-content: space-between; background: ${THEME.GRAY_BG}; padding: 16px; border-radius: 12px; border: 1px solid ${THEME.BORDER}; }
        .date-item { display: flex; flex-direction: column; }
        .date-lbl { font-size: 11px; color: ${THEME.TEXT_MUTED}; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }
        .date-val { font-size: 15px; font-weight: 700; color: ${THEME.NAVY_DARK}; }
        
        .empty-cart-msg { text-align: center; padding: 20px 0; color: #94a3b8; font-style: italic; font-size: 13px; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1; }
        .cart-item-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
        .cart-item-name { font-size: 14px; font-weight: 600; color: ${THEME.NAVY_DARK}; }
        .cart-item-price { font-size: 15px; font-weight: 700; color: ${THEME.DARK_RED}; }

        .total-area { text-align: right; margin-top: 24px; margin-bottom: 24px; }
        .total-label { font-size: 13px; text-transform: uppercase; color: ${THEME.TEXT_MUTED}; font-weight: 700; }
        .total-amount { font-size: 36px; font-weight: 900; color: ${THEME.NAVY_DARK}; line-height: 1; margin-top: 4px; }

        .btn-proceed { height: 56px; border-radius: 12px; font-size: 15px; font-weight: 800; letter-spacing: 1px; background: ${THEME.DARK_RED}; color: #fff; border: none; box-shadow: 0 8px 20px rgba(138, 21, 56, 0.3); }
        .btn-proceed:not(:disabled):hover { background: #7A1A21 !important; color: #fff !important; transform: translateY(-2px); }
        .btn-proceed:disabled { background: #f1f5f9 !important; color: #94a3b8 !important; box-shadow: none; }

        .guarantee-box { margin-top: 16px; text-align: center; color: ${THEME.TEXT_MUTED}; }

        .loading-box { text-align: center; padding: 80px 0; display: flex; flex-direction: column; align-items: center; gap: 16px; color: ${THEME.TEXT_MUTED}; font-weight: 600; }
        .loader { width: 40px; height: 40px; border: 4px solid ${THEME.BORDER}; border-top-color: ${THEME.DARK_RED}; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .empty-box, .success-box { text-align: center; padding: 60px 20px; background: #fff; border-radius: 16px; border: 1px dashed #cbd5e1; }
        .btn-return { margin-top: 20px; background: white; color: ${THEME.NAVY_DARK}; border-color: ${THEME.NAVY_DARK}; font-weight: bold; }

        /* ========================================= */
        /* 🔥 BẢN VÁ LỖI RESPONSIVE MOBILE CHUẨN XÁC  */
        /* ========================================= */
        
        @media (max-width: 1200px) {
            .card-inner { flex-direction: column; }
            .room-image-section { width: 100%; height: 260px; } 
            .room-action-section { width: 100%; border-left: none; border-top: 1px solid ${THEME.BORDER}; flex-direction: row; align-items: center; justify-content: space-between; padding: 20px 24px; }
            .action-button-wrapper { margin-top: 0; width: 220px; }
            .price-info { text-align: left; margin-bottom: 0; }
        }

        @media (max-width: 992px) {
            /* Tăng khoảng không để cuộn không bị vướng tay */
            .select-room-wrapper { padding-bottom: 120px; } 

            /* 🌟 ĐÃ FIX LỖI "BỨC TƯỜNG TÀNG HÌNH" 🌟 */
            .sticky-bill { 
                position: fixed !important; 
                top: auto !important; /* HỦY BỎ LỆNH KÉO DÃN TỪ TRÊN XUỐNG */
                bottom: 0 !important; 
                left: 0; 
                right: 0; 
                z-index: 9999; 
            }
            
            .white-bill-card { 
                border-radius: 20px 20px 0 0; 
                padding: 12px 20px; 
                box-shadow: 0 -5px 25px rgba(0,0,0,0.15); 
                margin: 0; border: none;
                display: flex; justify-content: space-between; align-items: center; gap: 16px; 
                background: #ffffff; /* Cứng nền trắng để không bị đè */
            }

            .bill-title, .bill-date-box, .cart-area, .guarantee-box, .total-label, .mobile-hide { display: none; }
            
            .total-area { margin: 0; display: flex; align-items: center; }
            .total-amount { font-size: 24px; margin-top: 0; }
            
            .btn-proceed { height: 46px; flex: 1; margin: 0; max-width: 180px; font-size: 14px; }
        }

        @media (max-width: 576px) {
            .container-inner { padding: 0 12px; }
            .room-list { gap: 16px; }
            .room-image-section { height: 220px; }
            .room-details-section { padding: 16px; }
            .room-name { font-size: 18px !important; margin-bottom: 8px !important;}
            .specs-row { margin-bottom: 12px; }
            
            .room-action-section { flex-direction: column; align-items: stretch; gap: 12px; padding: 16px; background: #fafafa; }
            .action-button-wrapper { width: 100%; }
            .price-info { display: flex; flex-direction: column; text-align: left; width: 100%; margin-bottom: 0; }
            .price-label { margin-bottom: 4px; }
            .price-value { font-size: 22px; }
            
            .main-title { font-size: 20px !important; }
            
            .white-bill-card { padding: 12px 16px; gap: 12px; }
            .total-amount { font-size: 20px; }
            .btn-proceed { max-width: 140px; font-size: 13px; height: 44px; padding: 0 10px; }
        }
      `}</style>
    </div>
  );
}