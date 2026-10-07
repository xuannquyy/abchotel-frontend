import React, { useState, useEffect } from 'react';
import { 
  Typography, Row, Col, Card, Button, DatePicker, Select, 
  notification, Grid, Spin, Tag, Divider, Avatar, Rate, Space, Carousel,
  Popover, InputNumber, TimePicker
} from 'antd';
import { 
  MagnifyingGlass, Sparkle, WifiHigh, SwimmingPool, Coffee, Wind, 
  BellRinging, Quotes, Tag as TagIcon, ArrowsOut, Users, CalendarBlank,
  Clock, Plus, ArrowRight
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

// IMPORT APIs
import { roomTypeApi } from '../api/roomTypeApi';
import { voucherApi } from '../api/voucherApi';
import { reviewApi } from '../api/reviewApi';
import { articleApi } from '../api/articleApi';
import { useSignalR } from '../hooks/useSignalR';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;

const THEME = { 
  NAVY_DARK: '#0D1821', NAVY_LIGHT: '#1C2E4A', 
  DARK_RED: '#8A1538', GOLD: '#D4AF37', BG_LIGHT: '#F8FAFC' 
};

export default function HomePage() {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [api, contextHolder] = notification.useNotification();

  const [loading, setLoading] = useState(true);
  const [roomTypes, setRoomTypes] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [articles, setArticles] = useState([]);

  // 🔥 STATE TÌM KIẾM NÂNG CAO
  const [bookingMode, setBookingMode] = useState('daily'); // 'daily' hoặc 'hourly'
  const [dates, setDates] = useState(null);
  const [timeRange, setTimeRange] = useState(null);
  const [roomsConfig, setRoomsConfig] = useState([{ id: 1, adults: 2, children: 0 }]); // Cấu hình đa phòng

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        setLoading(true);
        const [roomsRes, vouchersRes, reviewsRes, articlesRes] = await Promise.allSettled([
          roomTypeApi.getRoomTypes(true),
          voucherApi.getAll(true),
          reviewApi.getTopReviews(3),
          articleApi.getArticles(true)
        ]);

        if (roomsRes.status === 'fulfilled') setRoomTypes(roomsRes.value.slice(0, 6)); 
        if (vouchersRes.status === 'fulfilled') setVouchers(vouchersRes.value.slice(0, 3)); 
        if (reviewsRes.status === 'fulfilled') setReviews(reviewsRes.value);
        
        // 🔥 Lọc và sắp xếp Bài viết mới nhất (Theo ngày xuất bản)
        if (articlesRes.status === 'fulfilled') {
          const sortedArticles = articlesRes.value.sort((a, b) => dayjs(b.publishedAt).diff(dayjs(a.publishedAt)));
          setArticles(sortedArticles.slice(0, 4)); // Lấy 4 bài (1 to, 3 nhỏ)
        }

      } catch (error) {
        console.error("Lỗi tải dữ liệu trang chủ:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHomeData();
  }, []);

  useSignalR((newNotif) => {
    api.info({
      message: <Text strong style={{ color: THEME.DARK_RED }}>{newNotif.title || 'Tin nóng!'}</Text>,
      description: newNotif.content || 'Một khách hàng vừa đặt phòng thành công. Nhanh tay kẻo lỡ!',
      icon: <BellRinging color={THEME.GOLD} weight="fill" />,
      placement: 'bottomLeft',
      style: { borderRadius: 8, border: `1px solid ${THEME.GOLD}`, backgroundColor: '#fffdf6' }
    });
  });

  // 🔥 CÁC HÀM XỬ LÝ ĐA PHÒNG & KHÁCH
  const addRoom = () => {
    if (roomsConfig.length < 5) {
      setRoomsConfig([...roomsConfig, { id: Date.now(), adults: 1, children: 0 }]);
    } else {
      api.info({ message: 'Chỉ có thể đặt tối đa 5 phòng cùng lúc trực tuyến.' });
    }
  };

  const removeRoom = (id) => {
    setRoomsConfig(roomsConfig.filter(r => r.id !== id));
  };

  const updateRoomGuest = (id, field, value) => {
    setRoomsConfig(roomsConfig.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const totalAdults = roomsConfig.reduce((sum, room) => sum + room.adults, 0);
  const totalChildren = roomsConfig.reduce((sum, room) => sum + room.children, 0);

  // Giao diện (UI) chọn khách nằm trong Popover
  const guestPickerContent = (
    <div style={{ width: isMobile ? 280 : 320, padding: '8px 0' }}>
      {roomsConfig.map((room, index) => (
        <div key={room.id} style={{ marginBottom: 16, padding: 12, backgroundColor: THEME.BG_LIGHT, borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text strong>Phòng {index + 1}</Text>
            {roomsConfig.length > 1 && (
              <Button type="link" danger size="small" onClick={() => removeRoom(room.id)}>Xóa</Button>
            )}
          </div>
          <Row gutter={16} align="middle">
            <Col span={12}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Người lớn</Text>
              <InputNumber min={1} max={50} value={room.adults} onChange={v => updateRoomGuest(room.id, 'adults', v)} style={{ width: '100%' }} />
            </Col>
            <Col span={12}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Trẻ em</Text>
              <InputNumber min={0} max={50} value={room.children} onChange={v => updateRoomGuest(room.id, 'children', v)} style={{ width: '100%' }} />
            </Col>
          </Row>
        </div>
      ))}
      <Button type="dashed" block icon={<Plus />} onClick={addRoom} style={{ color: THEME.NAVY_DARK, borderColor: THEME.NAVY_DARK }}>
        Thêm phòng khác
      </Button>
    </div>
  );

  const handleSearch = () => {
    // 1. Chặn nếu chưa nhập dữ liệu
    if (!dates) {
      api.warning({ message: 'Vui lòng chọn ngày lưu trú / sự kiện!' });
      return;
    }
    if (bookingMode === 'hourly' && !timeRange) {
      api.warning({ message: 'Vui lòng chọn khung giờ cụ thể!' });
      return;
    }

    let checkInDate, checkOutDate;

    // 2. Thiết lập cấu trúc Ngày + Giờ tùy theo chế độ
    if (bookingMode === 'daily') {
      // 🔥 Thuê theo đêm: Ép cứng Check-in 14:00 và Check-out 12:00
      checkInDate = dates[0].clone().hour(14).minute(0).second(0);
      checkOutDate = dates[1].clone().hour(12).minute(0).second(0);
    } else {
      // 🔥 Thuê theo giờ: Lấy đúng Ngày + Giờ mà khách đã chọn
      checkInDate = dates.clone().hour(timeRange[0].hour()).minute(timeRange[0].minute()).second(0);
      checkOutDate = dates.clone().hour(timeRange[1].hour()).minute(timeRange[1].minute()).second(0);
    }

    // 3. 🔥 LỚP PHÒNG THỦ: CHẶN LOGIC THỜI GIAN
    if (checkOutDate.isBefore(checkInDate) || checkOutDate.isSame(checkInDate)) {
      api.warning({ 
        message: 'Sai thời gian đặt phòng', 
        description: bookingMode === 'daily' 
          ? 'Thuê theo đêm yêu cầu tối thiểu 1 đêm (Ngày trả phòng phải sau Ngày nhận phòng).'
          : 'Giờ kết thúc sự kiện bắt buộc phải sau Giờ bắt đầu!' 
      });
      return; // Dừng lại ngay, không cho chạy tiếp
    }

    // 4. Nếu qua được hết các chốt chặn -> Cho phép chuyển trang
    const queryParams = new URLSearchParams({
      mode: bookingMode,
      rooms: JSON.stringify(roomsConfig), 
    });

    queryParams.append('checkIn', checkInDate.format('YYYY-MM-DDTHH:mm:ss'));
    queryParams.append('checkOut', checkOutDate.format('YYYY-MM-DDTHH:mm:ss'));

    navigate(`/booking?${queryParams.toString()}`);
  };

  return (
    <div style={{ backgroundColor: THEME.BG_LIGHT, minHeight: '100vh', overflowX: 'hidden' }}>
      {contextHolder}

      {/* ================= 1. HERO SECTION (GIỮ NGUYÊN) ================= */}
      <div style={{ position: 'relative', height: '85vh', minHeight: 600, overflow: 'hidden' }}>
        <Carousel autoplay autoplaySpeed={4000} effect="fade" dots={false}>
          {[
            "https://i.pinimg.com/1200x/57/3e/13/573e1340bad4682fe32bc436ec3152b7.jpg",
            "https://i.pinimg.com/736x/65/56/c2/6556c202ebb2726c91ac750a44e7906e.jpg", 
            "https://i.pinimg.com/736x/1c/17/9c/1c179c0afad9c1ecf37fd0bc48e05aba.jpg", 
            "https://i.pinimg.com/1200x/2c/16/33/2c1633b3d7f37db080958612ce2db2f9.jpg",
            "https://i.pinimg.com/736x/f5/dc/de/f5dcde257dc627bfdb51acfed2d8b111.jpg"  
          ].map((img, index) => (
            <div key={index}>
              <div style={{ height: '85vh', minHeight: 600, backgroundImage: `url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
            </div>
          ))}
        </Carousel>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(13,24,33,0.4), rgba(13,24,33,0.8))', zIndex: 1 }}></div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 2 }}>
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} style={{ textAlign: 'center', padding: '0 20px', width: '100%' }}>
            <Sparkle size={40} color={THEME.GOLD} weight="fill" style={{ marginBottom: 16 }} />
            <Title style={{ color: '#fff', fontSize: isMobile ? 36 : 72, fontFamily: '"Source Serif 4", serif', letterSpacing: 4, margin: '0 0 16px 0', textShadow: '2px 4px 10px rgba(0,0,0,0.5)' }}>
              ABC HOTEL
            </Title>
            <Text style={{ color: '#E9F0F8', fontSize: isMobile ? 16 : 22, letterSpacing: 2, fontWeight: 300 }}>
              Tận hưởng kỳ nghỉ hoàn mỹ tại ABC Hotel
            </Text>
          </motion.div>
        </div>
      </div>

      {/* ================= 2. THANH TÌM KIẾM ĐẶT PHÒNG (NÂNG CẤP) ================= */}
      <div style={{ maxWidth: 1100, margin: '-60px auto 60px', padding: '0 20px', position: 'relative', zIndex: 10 }}>
        <Card variant="borderless" style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.15)', borderRadius: 16, padding: '10px 0' }}>
          
          {/* Nút chuyển chế độ */}
          <div style={{ padding: '0 16px', marginBottom: 20, display: 'flex', gap: 12 }}>
            <Button 
              type={bookingMode === 'daily' ? 'primary' : 'text'} 
              style={bookingMode === 'daily' ? { backgroundColor: THEME.NAVY_DARK } : {}}
              onClick={() => { setBookingMode('daily'); setDates(null); }}
              icon={<CalendarBlank />}
            >
              Thuê theo ngày
            </Button>
            <Button 
              type={bookingMode === 'hourly' ? 'primary' : 'text'} 
              style={bookingMode === 'hourly' ? { backgroundColor: THEME.NAVY_DARK } : {}}
              onClick={() => { setBookingMode('hourly'); setDates(null); }}
              icon={<Clock />}
            >
              Thuê theo giờ
            </Button>
          </div>

          <Row gutter={[16, 16]} align="bottom" style={{ padding: '0 16px' }}>
            {/* Cột 1: Chọn Thời gian */}
            <Col xs={24} md={bookingMode === 'daily' ? 10 : 7}>
              <Text strong style={{ color: THEME.NAVY_DARK, display: 'block', marginBottom: 8 }}>
                {bookingMode === 'daily' ? 'Khoảng ngày lưu trú' : 'Ngày diễn ra'}
              </Text>
              {bookingMode === 'daily' ? (
                <RangePicker style={{ width: '100%' }} size="large" format="DD/MM/YYYY" disabledDate={c => c && c < dayjs().startOf('day')} onChange={setDates} value={dates} />
              ) : (
                <DatePicker style={{ width: '100%' }} size="large" format="DD/MM/YYYY" disabledDate={c => c && c < dayjs().startOf('day')} onChange={setDates} value={dates} />
              )}
            </Col>

            {/* Cột 1.5: Chọn Giờ (Chỉ hiện nếu Hourly) */}
            {bookingMode === 'hourly' && (
              <Col xs={24} md={7}>
                <Text strong style={{ color: THEME.NAVY_DARK, display: 'block', marginBottom: 8 }}>Khung giờ</Text>
                <TimePicker.RangePicker style={{ width: '100%' }} size="large" format="HH:mm" onChange={setTimeRange} />
              </Col>
            )}

            {/* Cột 2: Cấu hình Khách & Phòng (Popover) */}
            <Col xs={24} md={bookingMode === 'daily' ? 10 : 6}>
              <Text strong style={{ color: THEME.NAVY_DARK, display: 'block', marginBottom: 8 }}>Khách & Phòng</Text>
              <Popover content={guestPickerContent} trigger="click" placement="bottom" arrow={false}>
                <Button size="large" block style={{ textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 11px' }}>
                  <span>{roomsConfig.length} Phòng, {totalAdults + totalChildren} Khách</span>
                  <Users size={20} color={THEME.DARK_RED} />
                </Button>
              </Popover>
            </Col>

            {/* Cột 3: Nút Submit */}
            <Col xs={24} md={4}>
              <Button type="primary" size="large" block icon={<MagnifyingGlass />} onClick={handleSearch} style={{ backgroundColor: THEME.DARK_RED, fontWeight: 'bold', borderRadius: 6 }}>
                TÌM PHÒNG
              </Button>
            </Col>
          </Row>
        </Card>
      </div>

      {/* ================= 3. KHÔNG GIAN LƯU TRÚ (GIỮ NGUYÊN) ================= */}
      <div style={{ padding: '80px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <Title level={2} style={{ color: THEME.NAVY_DARK, fontFamily: '"Source Serif 4", serif' }}>KHÔNG GIAN LƯU TRÚ</Title>
          <div style={{ width: 60, height: 3, backgroundColor: THEME.DARK_RED, margin: '0 auto 16px' }}></div>
          <Text type="secondary" style={{ fontSize: 16 }}>Trải nghiệm sự xa hoa trong từng đường nét thiết kế</Text>
        </div>

        {loading ? <div style={{ textAlign: 'center' }}><Spin size="large" /></div> : (
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Row gutter={[32, 40]}>
              {roomTypes.map((rt) => {
                const displayImg = rt.images?.length > 0 ? (rt.images.find(img => img.isPrimary)?.imageUrl || rt.images[0].imageUrl) : "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=600&q=80";
                return (
                  <Col xs={24} md={12} lg={8} key={rt.id}>
                    <motion.div whileHover={{ y: -10 }} style={{ height: '100%' }}>
                      <Card hoverable variant="borderless" style={{ borderRadius: 12, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                        cover={ <div style={{ height: 250, overflow: 'hidden' }}><img alt={rt.name} src={displayImg} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} /></div> }
                      >
                        <Title level={4} style={{ margin: '0 0 8px 0', color: THEME.NAVY_DARK }}>{rt.name}</Title>
                        <Space size="middle" style={{ marginBottom: 16, color: '#52677D' }}>
                          <span><Users size={16} /> {rt.capacityAdults} Lớn, {rt.capacityChildren} Bé</span>
                          <span><ArrowsOut size={16} /> {rt.sizeSqm} m²</span>
                        </Space>
                        <Paragraph ellipsis={{ rows: 2 }} style={{ color: '#52677D', minHeight: 44 }}>
                          {rt.description || 'Không gian nghỉ dưỡng tuyệt vời với đầy đủ tiện nghi.'}
                        </Paragraph>
                        <Divider style={{ margin: '16px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>Chỉ từ</Text><br/>
                            <Text strong style={{ color: THEME.DARK_RED, fontSize: 20 }}>{rt.basePrice.toLocaleString()}đ</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>/đêm</Text>
                          </div>
                          {/* <Button type="primary" style={{ backgroundColor: THEME.NAVY_DARK, borderRadius: 6 }} onClick={() => navigate(`/room-details/${rt.id}`)}> */}
                          <Button type="primary" style={{ backgroundColor: THEME.NAVY_DARK, borderRadius: 6 }} onClick={() => navigate(`/room-details`)}>
                            Xem chi tiết
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  </Col>
                );
              })}
            </Row>
            <div style={{ textAlign: 'center', marginTop: 50 }}>
              <Button size="large" onClick={() => navigate('/rooms')} style={{ borderColor: THEME.NAVY_DARK, color: THEME.NAVY_DARK, padding: '0 40px', fontWeight: 'bold' }}>XEM TẤT CẢ HẠNG PHÒNG</Button>
            </div>
          </div>
        )}
      </div>

      {/* 🔥 ================= 4. TIN TỨC & BÀI VIẾT (FRESH & BENTO GRID) ================= 🔥 */}
      {!loading && articles.length > 0 && (
        <div style={{ position: 'relative', backgroundColor: '#E9F0F8', padding: isMobile ? '80px 20px' : '100px 20px', backgroundImage: 'radial-gradient(#F8FAFC 1px, transparent 1px)', backgroundSize: '24px 24px', overflow: 'hidden' }}>
          
          {/* Lớp nền trang trí lấp lánh nhẹ */}
          <div style={{ position: 'absolute', top: '0', left: '10%', width: 600, height: 600, background: THEME.GRADIENT_GOLD, filter: 'blur(120px)', opacity: 0.08, borderRadius: '50%' }}></div>
          <div style={{ position: 'absolute', bottom: '0', right: '-5%', width: 500, height: 500, background: THEME.DARK_RED, filter: 'blur(150px)', opacity: 0.05, borderRadius: '50%' }}></div>

          <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
              <div>
                <Title level={4} style={{ color: THEME.DARK_RED, marginBottom: 8, letterSpacing: 2, textTransform: 'uppercase' }}><Sparkle style={{verticalAlign: 'middle', marginRight: 8}}/>KHÁM PHÁ</Title>
                <Title level={2} style={{ margin: 0, fontFamily: '"Source Serif 4", serif', color: THEME.NAVY_DARK, fontSize: isMobile ? 32 : 40 }}>TIN TỨC & SỰ KIỆN</Title>
              </div>
              {!isMobile && (
                <Button type="dashed" onClick={() => navigate('/article')} style={{ borderColor: THEME.NAVY_DARK, color: THEME.NAVY_DARK, borderRadius: 30, letterSpacing: 1, padding: '0 24px', fontWeight: 'bold' }}>XEM TẤT CẢ</Button>
              )}
            </div>

            <Row gutter={[32, 32]}>
              {/* BÀI VIẾT SPOTLIGHT (TRÁI) */}
              <Col xs={24} lg={13}>
                {articles[0] && (
                  <motion.div 
                    whileHover={{ y: -8, boxShadow: '0 30px 60px rgba(0,0,0,0.12)' }} transition={{ duration: 0.4 }}
                    style={{ cursor: 'pointer', position: 'relative', height: isMobile ? 380 : 560, borderRadius: 24, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', background: '#fff' }} 
                    onClick={() => navigate(`/article/${articles[0].slug}`)}
                  >
                    <motion.img 
                      whileHover={{ scale: 1.05 }} transition={{ duration: 0.8 }}
                      src={articles[0].thumbnailUrl || "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80"} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      alt="Spotlight" 
                    />
                    {/* Dải Gradient đen đỏ chìm ở dưới lên */}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10, 25, 47, 0.9) 0%, rgba(10, 25, 47, 0.4) 50%, transparent 100%)' }}></div>
                    
                    {/* Nội dung nổi */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: isMobile ? 24 : 40 }}>
                      <Space style={{ marginBottom: 12 }}>
                        <Tag color={THEME.DARK_RED} style={{ border: 'none', padding: '6px 16px', fontSize: 13, fontWeight: 'bold', borderRadius: 20 }}>{articles[0].categoryName}</Tag>
                        <Text style={{ color: '#E2E8F0', fontSize: 14 }}><CalendarBlank size={16} style={{ marginRight: 4, verticalAlign: 'middle' }}/> {dayjs(articles[0].publishedAt).format('DD/MM/YYYY')}</Text>
                      </Space>
                      <Title level={3} style={{ color: '#fff', margin: '0 0 16px 0', fontFamily: '"Source Serif 4", serif', fontSize: isMobile ? 24 : 32, lineHeight: 1.3 }}>{articles[0].title}</Title>
                      <Paragraph style={{ color: '#CBD5E1', fontSize: 16, marginBottom: 20, lineHeight: 1.6 }} ellipsis={{ rows: 2 }}>{articles[0].shortDescription}</Paragraph>
                      <Text strong style={{ color: THEME.GOLD, letterSpacing: 1, fontSize: 14, textTransform: 'uppercase' }}>ĐỌC TRỌN VẸN <ArrowRight style={{ marginLeft: 4, verticalAlign: 'middle' }}/></Text>
                    </div>
                  </motion.div>
                )}
              </Col>

              {/* DANH SÁCH BÀI VIẾT (PHẢI) */}
              <Col xs={24} lg={11}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%', justifyContent: 'space-between' }}>
                  {articles.slice(1, 4).map(art => (
                    <motion.div 
                      whileHover={{ x: -8, boxShadow: '0 15px 30px rgba(0,0,0,0.08)' }} 
                      key={art.id} 
                      style={{ display: 'flex', gap: 24, cursor: 'pointer', padding: 20, borderRadius: 24, transition: 'all 0.3s ease', background: '#ffffff', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', height: 'calc(33.333% - 13px)' }} 
                      onClick={() => navigate(`/article/${art.slug}`)}
                    >
                      {/* Ảnh thu nhỏ bo cong mạnh */}
                      <div style={{ minWidth: 150, width: 150, height: '100%', borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
                        <motion.img whileHover={{ scale: 1.1 }} transition={{ duration: 0.5 }} src={art.thumbnailUrl || "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=400&q=80"} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="News" />
                      </div>

                      {/* Text nội dung sang trọng */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <Space style={{ marginBottom: 10 }}>
                           <Tag color={THEME.NAVY_DARK} style={{ border: 'none', fontSize: 11, margin: 0, fontWeight: 'bold', borderRadius: 4 }}>{art.categoryName}</Tag>
                           <Text type="secondary" style={{ fontSize: 12, color: '#64748B' }}>
                             <CalendarBlank size={14} style={{ marginRight: 4, verticalAlign: 'middle' }}/> 
                             {dayjs(art.publishedAt).format('DD/MM/YYYY')}
                           </Text>
                        </Space>
                        <Title level={5} style={{ margin: '0 0 8px 0', color: THEME.NAVY_DARK, lineHeight: 1.4, fontSize: 18, fontFamily: '"Source Serif 4", serif' }} ellipsis={{ rows: 2 }}>
                          {art.title}
                        </Title>
                        <Text type="secondary" style={{ fontSize: 14, color: '#64748B', lineHeight: 1.5 }} ellipsis={{rows: 2}}>{art.shortDescription}</Text>
                      </div>
                    </motion.div>
                  ))}
                </div>
                {isMobile && <Button block size="large" style={{ marginTop: 24, borderColor: THEME.NAVY_DARK, color: THEME.NAVY_DARK, borderRadius: 30, fontWeight: 'bold' }} onClick={() => navigate('/article')}>XEM TẤT CẢ</Button>}
              </Col>
            </Row>

          </div>
        </div>
      )}

      {/* ================= 5. DỊCH VỤ & TIỆN ÍCH (GIỮ NGUYÊN) ================= */}
      <div style={{ backgroundColor: THEME.NAVY_DARK, padding: '80px 20px', color: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Row gutter={[48, 40]} align="middle">
            <Col xs={24} lg={10}>
              <Title level={2} style={{ color: THEME.GOLD, fontFamily: '"Source Serif 4", serif' }}>DỊCH VỤ & TIỆN ÍCH</Title>
              <Paragraph style={{ color: '#A0AABF', fontSize: 16, lineHeight: 1.8 }}>
                Bên cạnh không gian lưu trú sang trọng, ABCHotel còn tự hào mang đến chuỗi dịch vụ đẳng cấp quốc tế. Từ hồ bơi vô cực ngắm nhìn toàn cảnh thành phố, đến khu Spa thư giãn và nhà hàng ẩm thực tinh hoa Á-Âu.
              </Paragraph>
              <Button type="primary" size="large" onClick={() => navigate('/services')} style={{ backgroundColor: THEME.DARK_RED, border: 'none', marginTop: 20 }}>
                Khám phá dịch vụ
              </Button>
            </Col>
            <Col xs={24} lg={14}>
              <Row gutter={[24, 24]}>
                {[
                  { icon: <SwimmingPool size={40}/>, title: 'Hồ Bơi Vô Cực' },
                  { icon: <Coffee size={40}/>, title: 'Nhà Hàng 5 Sao' },
                  { icon: <Wind size={40}/>, title: 'Spa & Massage' },
                  { icon: <WifiHigh size={40}/>, title: 'Wifi Tốc Độ Cao' }
                ].map((item, idx) => (
                  <Col xs={12} sm={12} key={idx}>
                    <Card variant="borderless" style={{ backgroundColor: 'rgba(255,255,255,0.05)', textAlign: 'center', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                      <div style={{ color: THEME.GOLD, marginBottom: 16 }}>{item.icon}</div>
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: 500 }}>{item.title}</Text>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Col>
          </Row>
        </div>
      </div>

      {/* ================= 6. ƯU ĐÃI (VOUCHERS) (GIỮ NGUYÊN) ================= */}
      {!loading && vouchers.length > 0 && (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: 50 }}>
            <Title level={2} style={{ color: THEME.NAVY_DARK, fontFamily: '"Source Serif 4", serif' }}>ƯU ĐÃI ĐẶC QUYỀN</Title>
            <div style={{ width: 60, height: 3, backgroundColor: THEME.DARK_RED, margin: '0 auto 16px' }}></div>
            <Text type="secondary" style={{ fontSize: 16 }}>Lưu lại mã và nhập tại bước thanh toán để nhận ưu đãi</Text>
          </div>
          <Row gutter={[24, 24]} justify="center">
            {vouchers.map(v => (
              <Col xs={24} md={8} key={v.id}>
                <motion.div whileHover={{ y: -5 }}>
                  <div style={{ 
                    background: `linear-gradient(135deg, ${THEME.NAVY_DARK}, ${THEME.NAVY_LIGHT})`, 
                    borderRadius: 12, padding: 30, color: '#fff', position: 'relative', overflow: 'hidden', textAlign: 'center',
                    boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
                  }}>
                    <TagIcon size={120} color="rgba(255,255,255,0.03)" weight="fill" style={{ position: 'absolute', right: -20, top: -20 }} />
                    <Text style={{ color: THEME.GOLD, fontSize: 14, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Nhập mã tại trang thanh toán</Text>
                    <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: 8, display: 'inline-block', marginBottom: 16, border: `1px dashed ${THEME.GOLD}` }}>
                       <Title level={3} style={{ color: '#fff', margin: 0, letterSpacing: 4 }}>{v.code}</Title>
                    </div>
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', display: 'block', margin: '8px 0' }}>
                      Giảm {v.discountType === 'PERCENT' ? `${v.discountValue}%` : `${v.discountValue.toLocaleString()}đ`}
                    </Text>
                    <Text style={{ color: '#A0AABF', fontSize: 13 }}>Đơn tối thiểu: {v.minBookingValue?.toLocaleString() || 0}đ</Text>
                  </div>
                </motion.div>
              </Col>
            ))}
          </Row>
        </div>
      )}

      {/* ================= 7. KHÁCH HÀNG NÓI GÌ (REVIEW) (GIỮ NGUYÊN) ================= */}
      {!loading && reviews.length > 0 && (
        <div style={{ padding: '80px 20px', backgroundColor: THEME.BG_LIGHT }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
              <Title level={2} style={{ color: THEME.NAVY_DARK, fontFamily: '"Source Serif 4", serif' }}>CẢM NHẬN TỪ KHÁCH HÀNG</Title>
              <div style={{ width: 60, height: 3, backgroundColor: THEME.DARK_RED, margin: '0 auto' }}></div>
            </div>
            
            <Row gutter={[32, 32]}>
              {reviews.map(review => (
                <Col xs={24} md={8} key={review.id}>
                  <Card variant="borderless" style={{ background: '#fff', height: '100%', borderRadius: 12, display: 'flex', flexDirection: 'column', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                    <Quotes size={40} color={THEME.GOLD} style={{ marginBottom: 16, opacity: 0.5 }} />
                    <Paragraph style={{ fontStyle: 'italic', fontSize: 15, color: '#52677D', flex: 1 }}>
                      "{review.comment}"
                    </Paragraph>
                    <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                      <Avatar size={48} style={{ backgroundColor: THEME.NAVY_DARK }}>{review.guestName.charAt(0)}</Avatar>
                      <div>
                        <Text strong style={{ display: 'block', fontSize: 16 }}>{review.guestName}</Text>
                        <Rate disabled defaultValue={review.rating} style={{ color: THEME.GOLD, fontSize: 14 }} />
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </div>
      )}

    </div>
  );
}