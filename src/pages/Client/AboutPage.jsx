import React, { useState, useEffect } from 'react';
import { 
  Typography, Row, Col, Card, Divider, notification, Grid, Rate, Avatar, Spin, Empty
} from 'antd';
import { 
  Crown, Heart, ShieldCheck, Clock, Sparkle, BellRinging, Quotes,
  HandHeart, Star, MagicWand // Thêm icon cho phần mới
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { useSignalR } from '../../hooks/useSignalR'; 
import { reviewApi } from '../../api/reviewApi'; // Gọi API Review thật

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

const THEME = { 
  NAVY_DARK: '#0D1821', 
  DARK_RED: '#8A1538', 
  GOLD: '#D4AF37', 
  BG_LIGHT: '#F8FAFC',
  // Thêm các dải màu Gradient cho hiệu ứng
  GRADIENT_VIP: 'linear-gradient(to right, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c)',
  GRADIENT_PINK: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)',
  GRADIENT_BLUE: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
};

// DANH SÁCH NHÀ SÁNG LẬP (Chỉ tên, dùng Avatar tròn)
const FOUNDERS = [
  { name: 'Trương Thị Ánh', img: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anh&backgroundColor=ffdfbf' },
  { name: 'Viên Xuân Quý', img: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Quy&backgroundColor=c0aede' },
  { name: 'Nguyễn Thị Hồng Nhung', img: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nhung&backgroundColor=ffb8b8' },
  { name: 'Nguyễn Thị Phương Thảo', img: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Thao&backgroundColor=b6e3f4' },
  { name: 'Huỳnh Thị Trúc Ly', img: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ly&backgroundColor=f4d160' },
];

export default function AboutPage() {
  const screens = useBreakpoint();
  const [api, contextHolder] = notification.useNotification();
  const isMobile = !screens.md;

  const [realReviews, setRealReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  // GỌI API LẤY REVIEW THẬT
  useEffect(() => {
    const fetchTopReviews = async () => {
      try {
        const res = await reviewApi.getTopReviews(3); // Lấy top 3 review xuất sắc nhất
        setRealReviews(res);
      } catch (error) {
        console.error("Lỗi lấy review:", error);
      } finally {
        setLoadingReviews(false);
      }
    };
    fetchTopReviews();
  }, []);

  // Tích hợp SignalR FOMO
  useSignalR((newNotif) => {
    api.info({
      title: newNotif.title || 'Ưu đãi đặc biệt!',
      description: newNotif.content || 'Vừa có khách hàng đặt phòng hạng Suite, hãy kiểm tra ngay!',
      icon: <BellRinging color={THEME.DARK_RED} weight="fill" />,
      placement: 'bottomRight',
      style: { borderLeft: `4px solid ${THEME.DARK_RED}`, borderRadius: '8px' }
    });
  });

  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh', overflowX: 'hidden' }}>
      {contextHolder}

      {/* SECTION 1: HERO */}
      <div style={{ 
        height: '60vh', minHeight: 400,
        backgroundImage: 'url("https://i.pinimg.com/736x/65/56/c2/6556c202ebb2726c91ac750a44e7906e.jpg")',
        backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: isMobile ? 'scroll' : 'fixed',
        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
      }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, rgba(13, 24, 33, 0.4), ${THEME.NAVY_DARK})` }}></div>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} style={{ textAlign: 'center', zIndex: 1, padding: '0 20px' }}>
          <Sparkle size={48} color={THEME.GOLD} weight="fill" style={{ marginBottom: 20 }} />
          <Title style={{ color: '#fff', fontSize: isMobile ? 32 : 64, letterSpacing: 6, margin: 0 }}>ABCHOTEL</Title>
          <Text style={{ color: THEME.GOLD, fontSize: 18, letterSpacing: 4, textTransform: 'uppercase' }}>Biểu tượng của sự tinh tế & đẳng cấp</Text>
        </motion.div>
      </div>

      {/* SECTION 2: CÂU CHUYỆN */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '60px 24px' : '100px 24px' }}>
        <Row gutter={[64, 40]} align="middle">
          <Col xs={24} lg={12}>
            <Title level={4} style={{ color: THEME.DARK_RED, letterSpacing: 2 }}>CÂU CHUYỆN CỦA CHÚNG TÔI</Title>
            <Title level={2} style={{ color: THEME.NAVY_DARK, fontSize: 36, marginTop: 0 }}>Nơi Nghệ Thuật Sống Được Tôn Vinh</Title>
            <Paragraph style={{ fontSize: 16, lineHeight: 2, color: '#52677D', textAlign: 'justify' }}>
              Được thành lập với tầm nhìn kiến tạo một không gian lưu trú vượt chuẩn mực thông thường. Tại ABCHotel, chúng tôi tin rằng mỗi chi tiết nhỏ từ mùi hương sảnh chờ, ánh sáng hành lang đến độ mềm của nệm đều góp phần tạo nên một kỳ nghỉ hoàn hảo. 
              <br/><br/>
              Chúng tôi kết hợp hoàn mỹ giữa kiến trúc tân cổ điển phương Tây và lòng hiếu khách nồng hậu của người Việt Nam.
            </Paragraph>
          </Col>
          <Col xs={24} lg={12}>
            <div style={{ position: 'relative' }}>
              <img src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80" alt="Lobby" style={{ width: '100%', borderRadius: '4px', zIndex: 2, position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }} />
              {!isMobile && <div style={{ position: 'absolute', top: -20, right: -20, width: '100%', height: '100%', border: `2px solid ${THEME.GOLD}`, zIndex: 1 }}></div>}
            </div>
          </Col>
        </Row>
      </div>

      {/* 🔥 MỚI: SECTION NHÀ SÁNG LẬP & DỊCH VỤ (HIỆU ỨNG LUNG LINH 3D) 🔥 */}
      <div style={{ backgroundColor: THEME.NAVY_DARK, padding: isMobile ? '60px 24px' : '100px 24px', position: 'relative', overflow: 'hidden' }}>
        {/* Hạt background trôi lơ lửng */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={`blob-${i}`}
            style={{
              position: 'absolute', width: Math.random() * 200 + 100, height: Math.random() * 200 + 100,
              borderRadius: '50%', background: THEME.GRADIENT_VIP, opacity: 0.15, filter: 'blur(60px)',
              top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, zIndex: 0
            }}
            animate={{ y: [0, -40, 0], x: [0, 30, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: Math.random() * 5 + 8, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 10 }}>
          
          {/* Nhóm Sáng Lập */}
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <Title level={2} style={{ color: THEME.GOLD, letterSpacing: 2, margin: 0 }}>NHỮNG NGƯỜI KIẾN TẠO</Title>
            <Text style={{ color: '#B4CDED', fontSize: 16 }}>Đội ngũ sáng lập đằng sau sự thành công của ABCHotel</Text>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: isMobile ? '30px' : '40px', marginBottom: 80 }}>
            {FOUNDERS.map((founder, index) => (
              <motion.div 
                key={index} whileHover={{ y: -15, scale: 1.05 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', width: 170 }}
              >
                {/* Hiệu ứng vòng xoay Gradient bọc quanh Avatar */}
                <div style={{ position: 'relative', padding: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', marginBottom: 20 }}>
                  <motion.div
                      animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      style={{ position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderRadius: '50%', background: THEME.GRADIENT_VIP, zIndex: -1 }}
                  />
                  <Avatar src={founder.img} size={140} style={{ border: '4px solid #0D1821', backgroundColor: '#fff' }} />
                </div>
                <Text style={{ color: '#fff', fontWeight: 800, fontSize: 16, textAlign: 'center', letterSpacing: 0.5 }}>{founder.name}</Text>
              </motion.div>
            ))}
          </div>

          {/* Cards Chất Lượng Dịch Vụ (Glassmorphism) */}
          <Row gutter={[32, 32]}>
            <Col xs={24} md={8}>
              <motion.div whileHover={{ scale: 1.05, y: -10 }} style={{ height: '100%' }}>
                <Card bordered={false} style={{ height: '100%', borderRadius: 24, background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: THEME.GRADIENT_PINK, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: '0 10px 20px rgba(255,154,158,0.3)' }}>
                    <HandHeart size={32} color="#fff" weight="duotone" />
                  </div>
                  <Title level={4} style={{ color: '#fff', fontWeight: 800 }}>Đội Ngũ Chuyên Nghiệp</Title>
                  <Paragraph style={{ color: '#B4CDED', fontSize: 15, lineHeight: 1.7, marginBottom: 0 }}>
                    Nhân viên được tinh tuyển và đào tạo theo nghiệp vụ 5 sao quốc tế. Nụ cười thân thiện, sự thấu hiểu và túc trực 24/7 để đáp ứng mọi yêu cầu khắt khe nhất của bạn.
                  </Paragraph>
                </Card>
              </motion.div>
            </Col>

            <Col xs={24} md={8}>
              <motion.div whileHover={{ scale: 1.05, y: -10 }} style={{ height: '100%' }}>
                <Card bordered={false} style={{ height: '100%', borderRadius: 24, background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: `1px solid ${THEME.GOLD}`, position: 'relative', overflow: 'hidden' }}>
                  {/* Tia sáng quét qua */}
                  <motion.div animate={{ x: ['-100%', '200%'] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} style={{ position: 'absolute', top: 0, left: 0, width: '50%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.2), transparent)', transform: 'skewX(-20deg)', zIndex: 0 }} />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: THEME.GRADIENT_VIP, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: '0 10px 20px rgba(212, 175, 55, 0.3)' }}>
                      <Crown size={32} color="#0D1821" weight="duotone" />
                    </div>
                    <Title level={4} style={{ color: THEME.GOLD, fontWeight: 800 }}>Trải Nghiệm Thượng Lưu</Title>
                    <Paragraph style={{ color: '#E9F0F8', fontSize: 15, lineHeight: 1.7, marginBottom: 0 }}>
                      Phòng nghỉ lộng lẫy với nội thất nhập khẩu, hương thơm tinh dầu dịu nhẹ và tầm nhìn panaroma ngoạn mục ôm trọn vẻ đẹp lấp lánh của thành phố về đêm.
                    </Paragraph>
                  </div>
                </Card>
              </motion.div>
            </Col>

            <Col xs={24} md={8}>
              <motion.div whileHover={{ scale: 1.05, y: -10 }} style={{ height: '100%' }}>
                <Card bordered={false} style={{ height: '100%', borderRadius: 24, background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: THEME.GRADIENT_BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: '0 10px 20px rgba(161, 196, 253, 0.3)' }}>
                    <MagicWand size={32} color="#0D1821" weight="duotone" />
                  </div>
                  <Title level={4} style={{ color: '#fff', fontWeight: 800 }}>Dịch Vụ Đỉnh Cao</Title>
                  <Paragraph style={{ color: '#B4CDED', fontSize: 15, lineHeight: 1.7, marginBottom: 0 }}>
                    Hệ sinh thái tiện ích khép kín: Hồ bơi vô cực dát vàng, Spa trị liệu chuyên sâu thanh lọc tâm hồn, và hệ thống nhà hàng ẩm thực Á - Âu đánh thức mọi giác quan.
                  </Paragraph>
                </Card>
              </motion.div>
            </Col>
          </Row>

        </div>
      </div>

      {/* SECTION 3: THƯ VIỆN HÌNH ẢNH */}
      <div style={{ backgroundColor: THEME.BG_LIGHT, padding: isMobile ? '60px 24px' : '100px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 50 }}>
            <Title level={2} style={{ color: THEME.NAVY_DARK }}>Không Gian Tuyệt Mỹ</Title>
            <div style={{ width: 60, height: 3, backgroundColor: THEME.DARK_RED, margin: '0 auto 16px' }}></div>
            <Text type="secondary" style={{ fontSize: 16 }}>Khám phá từng góc nhỏ tinh tế tại ABCHotel</Text>
          </div>
          
          <Row gutter={[16, 16]}>
            <Col xs={24} md={16}>
              <div style={{ height: 400, overflow: 'hidden', borderRadius: 8 }}>
                <img src="https://i.pinimg.com/1200x/a8/f9/90/a8f990304a2de08f6d5ec3161a6ff294.jpg" alt="Master Suite" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}/>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div style={{ height: 400, overflow: 'hidden', borderRadius: 8 }}>
                <img src="https://i.pinimg.com/1200x/63/6b/96/636b96ce06df68c2d011d5c57c2247ac.jpg" alt="Spa" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}/>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div style={{ height: 300, overflow: 'hidden', borderRadius: 8 }}>
                <img src="https://i.pinimg.com/736x/21/35/2c/21352c49f96f07d3a79140e43577eb1e.jpg" alt="Restaurant" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}/>
              </div>
            </Col>
            <Col xs={24} md={16}>
              <div style={{ height: 300, overflow: 'hidden', borderRadius: 8 }}>
                <img src="https://i.pinimg.com/1200x/7e/58/46/7e58462efe97ce3ad1fc9f1b25c263fd.jpg" alt="Pool" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}/>
              </div>
            </Col>
          </Row>
        </div>
      </div>

      {/* SECTION 4: GIÁ TRỊ CỐT LÕI */}
      <div style={{ padding: isMobile ? '60px 24px' : '100px 24px', maxWidth: 1200, margin: '0 auto' }}>
          <Title level={2} style={{ textAlign: 'center', marginBottom: 60 }}>Cam Kết Từ Trái Tim</Title>
          <Row gutter={[24, 24]}>
            {[
              { icon: <Crown />, title: "Đẳng Cấp", desc: "Tiêu chuẩn 5 sao quốc tế." },
              { icon: <ShieldCheck />, title: "An Toàn", desc: "An ninh và bảo mật hàng đầu." },
              { icon: <Heart />, title: "Tận Tâm", desc: "Khách hàng là người thân." },
              { icon: <Clock />, title: "24/7", desc: "Luôn sẵn sàng phục vụ." }
            ].map((v, i) => (
              <Col xs={24} sm={12} lg={6} key={i}>
                <motion.div whileHover={{ y: -10 }}>
                  <Card bordered={true} style={{ textAlign: 'center', height: '100%', borderRadius: 8, borderColor: '#eee' }}>
                    <div style={{ fontSize: 40, color: THEME.DARK_RED, marginBottom: 20 }}>{v.icon}</div>
                    <Title level={4}>{v.title}</Title>
                    <Text type="secondary">{v.desc}</Text>
                  </Card>
                </motion.div>
              </Col>
            ))}
          </Row>
      </div>

      {/* 🔥 SECTION 5: REVIEW TỪ DATABASE THẬT 🔥 */}
      <div style={{ backgroundColor: THEME.NAVY_DARK, padding: isMobile ? '60px 24px' : '100px 24px', color: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Title level={2} style={{ color: '#fff', textAlign: 'center', marginBottom: 60 }}>Khách Hàng Nói Gì Về ABCHotel</Title>
          
          {loadingReviews ? (
            <div style={{ textAlign: 'center' }}><Spin size="large" /></div>
          ) : realReviews.length === 0 ? (
            <div style={{ textAlign: 'center' }}>
               <Empty description={<Text style={{ color: '#fff' }}>Chưa có đánh giá nào được hiển thị.</Text>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
          ) : (
            <Row gutter={[32, 32]}>
              {realReviews.map((review) => (
                <Col xs={24} md={8} key={review.id}>
                  <motion.div whileHover={{ scale: 1.03 }} style={{ height: '100%' }}>
                    <Card bordered={false} style={{ backgroundColor: 'rgba(255,255,255,0.05)', height: '100%', borderRadius: 12, display: 'flex', flexDirection: 'column' }}>
                      <Quotes size={32} color={THEME.GOLD} weight="fill" style={{ marginBottom: 16, opacity: 0.8 }} />
                      <Paragraph style={{ color: '#E9F0F8', fontStyle: 'italic', fontSize: 15, flex: 1 }}>
                        "{review.comment}"
                      </Paragraph>
                      <Divider style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '16px 0' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <Avatar size="large" style={{ backgroundColor: THEME.DARK_RED }}>{review.guestName.charAt(0)}</Avatar>
                        <div>
                          <Text style={{ color: '#fff', display: 'block', fontWeight: 'bold' }}>{review.guestName}</Text>
                          <Text style={{ color: THEME.GOLD, fontSize: 12 }}>{review.roomTypeName}</Text>
                          <div style={{ marginTop: 4 }}>
                            <Rate disabled defaultValue={review.rating} style={{ color: THEME.GOLD, fontSize: 14 }} />
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                </Col>
              ))}
            </Row>
          )}
        </div>
      </div>

    </div>
  );
}