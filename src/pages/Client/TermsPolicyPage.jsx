import React from 'react';
import { Typography, Row, Col, Card, Divider, Grid } from 'antd';
import { 
  Crown, ShieldCheck, Sparkle, Quotes,
  Fingerprint, Scales, FileText, WarningCircle, ShieldPlus
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

const THEME = { 
  NAVY_DARK: '#0D1821', 
  DARK_RED: '#8A1538', 
  GOLD: '#D4AF37', 
  BG_LIGHT: '#F8FAFC',
  GRADIENT_VIP: 'linear-gradient(to right, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c)',
};

export default function TermsPolicyPage() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh', overflowX: 'hidden' }}>
      
      {/* SECTION 1: HERO - ĐỔI ẢNH NỀN SANG TRỌNG HƠN */}
      <div style={{ 
        height: '65vh', minHeight: 450,
        // Sử dụng ảnh nội thất khách sạn hạng sang tông tối
        backgroundImage: 'url("https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1920&q=80")',
        backgroundSize: 'cover', 
        backgroundPosition: 'center', 
        backgroundAttachment: isMobile ? 'scroll' : 'fixed',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        position: 'relative'
      }}>
        {/* Lớp phủ Overlay tối hơn để tăng độ Luxury */}
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          background: `linear-gradient(to bottom, rgba(13, 24, 33, 0.6), ${THEME.NAVY_DARK})` 
        }}></div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 1 }} 
          style={{ textAlign: 'center', zIndex: 1, padding: '0 20px' }}
        >
          <motion.div
            animate={{ rotateY: [0, 180, 360] }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          >
            <Crown size={60} color={THEME.GOLD} weight="fill" style={{ marginBottom: 20 }} />
          </motion.div>
          <Title style={{ 
            color: '#fff', 
            fontSize: isMobile ? 36 : 72, 
            letterSpacing: 10, 
            margin: 0, 
            fontFamily: '"Source Serif 4", serif',
            textShadow: '0 10px 20px rgba(0,0,0,0.5)'
          }}>
            CHÍNH SÁCH & ĐIỀU KHOẢN
          </Title>
          <div style={{ width: 100, height: 2, background: THEME.GRADIENT_VIP, margin: '20px auto' }}></div>
          <Text style={{ color: THEME.GOLD, fontSize: 18, letterSpacing: 5, textTransform: 'uppercase', fontWeight: 300 }}>
            ABC Hotel
          </Text>
        </motion.div>
      </div>

      {/* SECTION 2: CHÍNH SÁCH (Hạt background lung linh) */}
      <div style={{ backgroundColor: THEME.NAVY_DARK, padding: isMobile ? '80px 24px' : '120px 24px', position: 'relative', overflow: 'hidden' }}>
        
        {/* Hạt background trôi lơ lửng - Giống About 100% */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`policy-blob-${i}`}
            style={{
              position: 'absolute', 
              width: Math.random() * 300 + 150, 
              height: Math.random() * 300 + 150,
              borderRadius: '50%', 
              background: THEME.GRADIENT_VIP, 
              opacity: 0.1, 
              filter: 'blur(80px)',
              top: `${Math.random() * 100}%`, 
              left: `${Math.random() * 100}%`, 
              zIndex: 0
            }}
            animate={{ 
              y: [0, -60, 0], 
              x: [0, 40, 0], 
              scale: [1, 1.3, 1],
              opacity: [0.1, 0.15, 0.1]
            }}
            transition={{ duration: Math.random() * 7 + 10, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 10 }}>
          <Row gutter={[40, 40]}>
            {[
              { icon: <Fingerprint />, title: "Bảo Mật Tuyệt Đối", desc: "Hệ thống bảo mật đa lớp bảo vệ danh tính khách hàng, đảm bảo mọi kỳ nghỉ là một không gian riêng tư hoàn hảo." },
              { icon: <Scales />, title: "Minh Bạch Pháp Lý", desc: "Các điều khoản được xây dựng rõ ràng, tôn trọng quyền lợi của khách hàng và tiêu chuẩn dịch vụ khách sạn." },
              { icon: <ShieldPlus />, title: "Đảm Bảo Quyền Lợi", desc: "Cam kết hỗ trợ tối đa trong mọi tình huống phát sinh, mang lại sự an tâm tuyệt đối cho quý khách." }
            ].map((item, index) => (
              <Col xs={24} md={8} key={index}>
                <motion.div 
                  whileHover={{ y: -15 }} 
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 }}
                  style={{ height: '100%' }}
                >
                  <Card bordered={false} style={{ 
                    height: '100%', 
                    borderRadius: 30, 
                    background: 'rgba(255,255,255,0.03)', 
                    backdropFilter: 'blur(25px)', 
                    border: '1px solid rgba(212, 175, 55, 0.15)',
                    textAlign: 'center',
                    padding: '20px 0'
                  }}>
                    <div style={{ 
                      width: 80, height: 80, 
                      borderRadius: '50%', 
                      background: 'rgba(212, 175, 55, 0.1)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      margin: '0 auto 25px',
                      border: `1px solid ${THEME.GOLD}`
                    }}>
                      {React.cloneElement(item.icon, { size: 40, color: THEME.GOLD, weight: "duotone" })}
                    </div>
                    <Title level={3} style={{ color: '#fff', fontFamily: '"Source Serif 4", serif', marginBottom: 20 }}>
                      {item.title}
                    </Title>
                    <Paragraph style={{ color: '#A0AABF', fontSize: 16, lineHeight: 1.8 }}>
                      {item.desc}
                    </Paragraph>
                  </Card>
                </motion.div>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      {/* SECTION 3: NỘI DUNG VĂN BẢN (Nền trắng tinh tế) */}
      <div style={{ padding: '100px 24px', maxWidth: 900, margin: '0 auto' }}>
        <motion.div 
          initial={{ opacity: 0 }} 
          whileInView={{ opacity: 1 }} 
          transition={{ duration: 1 }}
        >
          <Title level={2} style={{ textAlign: 'center', color: THEME.NAVY_DARK, fontFamily: '"Source Serif 4", serif' }}>
            Quy Định Chung
          </Title>
          <Divider><Sparkle size={24} color={THEME.GOLD} weight="fill" /></Divider>
          <Paragraph style={{ fontSize: 18, lineHeight: 2.2, color: '#4A5568', textAlign: 'justify' }}>
            Chào mừng quý khách đến với hệ thống nghỉ dưỡng <b>ABCHotel</b>. Việc quý khách sử dụng dịch vụ đồng nghĩa với việc chấp nhận các quy chuẩn về an ninh, an toàn và văn hóa lưu trú của chúng tôi. Chúng tôi bảo lưu quyền cập nhật các điều khoản này để phù hợp với quy định pháp luật và nâng cao chất lượng phục vụ.
          </Paragraph>
          
          <div style={{ 
            marginTop: 50, 
            padding: 40, 
            background: THEME.NAVY_DARK, 
            borderRadius: 20, 
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)' 
          }}>
            <Title level={4} style={{ color: THEME.GOLD }}><WarningCircle size={28} weight="fill" /> Lưu ý quan trọng</Title>
            <Text style={{ color: '#fff', fontSize: 16, opacity: 0.8 }}>
              Yêu cầu hoàn tiền hoặc thay đổi lịch trình phải được gửi qua hệ thống chính thức trước 48 giờ. Mọi tranh chấp phát sinh sẽ được ưu tiên giải quyết trên tinh thần thương lượng và tôn trọng khách hàng.
            </Text>
          </div>
        </motion.div>
      </div>

      {/* SECTION 4: FOOTER QUOTE (Phong cách sang trọng) */}
      <div style={{ 
        backgroundColor: THEME.NAVY_DARK, 
        padding: '100px 24px', 
        textAlign: 'center',
        borderTop: `1px solid ${THEME.GOLD}`
      }}>
        <Quotes size={60} color={THEME.GOLD} weight="fill" style={{ marginBottom: 30, opacity: 0.3 }} />
        <Title level={2} style={{ 
          color: '#fff', 
          fontStyle: 'italic', 
          fontFamily: '"Source Serif 4", serif',
          fontWeight: 300,
          maxWidth: 900,
          margin: '0 auto 40px'
        }}>
          "Pháp lý không chỉ là quy định, đó là lời hứa về sự an toàn và niềm tin tuyệt đối mà ABCHotel dành tặng quý khách."
        </Title>
        <Text style={{ color: THEME.GOLD, letterSpacing: 5, fontSize: 14, textTransform: 'uppercase' }}>
          — Executive Board of ABCHotel —
        </Text>
      </div>

    </div>
  );
}