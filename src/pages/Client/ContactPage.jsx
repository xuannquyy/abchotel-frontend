import React from 'react';
import { Row, Col, Typography, Form, Input, Button, Space, Card, message, Collapse, theme } from 'antd';
import { MapPin, Phone, EnvelopeSimple, Clock, CaretRight, Question } from '@phosphor-icons/react';

const { Title, Text } = Typography;
const THEME = { NAVY: '#0D1821', RED: '#8A1538', BG_LIGHT: '#F8FAFC', GOLD: '#D4AF37' };

export default function ContactPage() {
  const { token } = theme.useToken();

  const onFinish = (values) => {
    console.log('Contact form:', values);
    message.success('Cảm ơn bạn! Yêu cầu của bạn đã được gửi đi thành công.');
  };

  // ================= DỮ LIỆU CÂU HỎI THƯỜNG GẶP (FAQ) =================
  const faqItems = [
    {
      key: '1',
      label: <Text strong style={{ fontSize: 16, color: THEME.NAVY }}>Giờ nhận phòng và trả phòng là mấy giờ?</Text>,
      children: <Text type="secondary" style={{ fontSize: 15 }}>Giờ nhận phòng (Check-in) tiêu chuẩn là từ 14:00 và giờ trả phòng (Check-out) là trước 12:00 trưa. Nếu quý khách có nhu cầu nhận phòng sớm hoặc trả phòng trễ, vui lòng liên hệ trước để chúng tôi sắp xếp (có thể phát sinh phụ phí).</Text>,
    },
    {
      key: '2',
      label: <Text strong style={{ fontSize: 16, color: THEME.NAVY }}>Khách sạn có dịch vụ đưa đón sân bay không?</Text>,
      children: <Text type="secondary" style={{ fontSize: 15 }}>Có, ABCHotel cung cấp dịch vụ đưa đón sân bay quốc tế Đà Nẵng bằng xe sang. Vui lòng cung cấp thông tin chuyến bay cho chúng tôi ít nhất 24 giờ trước khi đến để được phục vụ chu đáo nhất.</Text>,
    },
    {
      key: '3',
      label: <Text strong style={{ fontSize: 16, color: THEME.NAVY }}>Chính sách hủy đặt phòng như thế nào?</Text>,
      children: <Text type="secondary" style={{ fontSize: 15 }}>Quý khách được miễn phí hủy phòng nếu thông báo trước 3 ngày so với ngày nhận phòng. Nếu hủy trong vòng 3 ngày, khách sạn sẽ tính phí bằng 100% giá trị đêm đầu tiên. Các gói phòng khuyến mãi đặc biệt (Non-refundable) sẽ không được hoàn hủy.</Text>,
    },
    {
      key: '4',
      label: <Text strong style={{ fontSize: 16, color: THEME.NAVY }}>Tôi có thể mang theo thú cưng (chó, mèo) không?</Text>,
      children: <Text type="secondary" style={{ fontSize: 15 }}>Để đảm bảo không gian nghỉ dưỡng yên tĩnh và vệ sinh tuyệt đối cho mọi khách hàng, ABCHotel rất tiếc chưa có chính sách tiếp nhận thú cưng. Mong quý khách thông cảm.</Text>,
    },
  ];

  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh', paddingBottom: 80 }}>
      {/* HERO SECTION */}
      <div style={{ backgroundColor: THEME.NAVY, padding: '80px 20px', textAlign: 'center' }}>
        <Title style={{ color: '#fff', margin: 0, letterSpacing: 2 }}>LIÊN HỆ & HỖ TRỢ</Title>
        <Text style={{ color: '#A0AABF', fontSize: 16 }}>Chúng tôi luôn lắng nghe và sẵn sàng phục vụ quý khách 24/7</Text>
      </div>

      <div style={{ maxWidth: 1200, margin: '-40px auto 0', padding: '0 20px' }}>
        
        {/* ================= KHỐI THÔNG TIN VÀ FORM ================= */}
        <Row gutter={[32, 32]}>
          
          {/* CỘT TRÁI: THÔNG TIN & BẢN ĐỒ */}
          <Col xs={24} lg={10}>
            <Card bordered={false} style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.08)', height: '100%', borderRadius: 12 }}>
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Title level={3} style={{ color: THEME.NAVY, marginBottom: 0 }}>Trụ Sở Chính</Title>
                
                <div style={{ display: 'flex', gap: 16 }}>
                  <MapPin size={28} color={THEME.RED} weight="fill" />
                  <div>
                    <Text strong style={{ fontSize: 16 }}>Địa chỉ</Text><br />
                    <Text type="secondary">123 Nguyễn Văn Linh, Quận Hải Châu, TP. Đà Nẵng</Text>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: 16 }}>
                  <Phone size={28} color={THEME.RED} weight="fill" />
                  <div>
                    <Text strong style={{ fontSize: 16 }}>Đường dây nóng</Text><br />
                    <Text type="secondary">+84 236 123 4567 (Hỗ trợ 24/7)</Text>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: 16 }}>
                  <EnvelopeSimple size={28} color={THEME.RED} weight="fill" />
                  <div>
                    <Text strong style={{ fontSize: 16 }}>Thư điện tử</Text><br />
                    <Text type="secondary">booking@abchotel.com</Text>
                  </div>
                </div>
              </Space>
              
              {/* BẢN ĐỒ GOOGLE MAPS THẬT */}
              <div style={{ marginTop: 40, width: '100%', height: 250, borderRadius: 8, overflow: 'hidden', border: `1px solid ${token.colorBorder}` }}>
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d30672.585497142438!2d108.2088304!3d16.0616915!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31421782f7fa0ee3%3A0xeafb8ba272ee55ac!2zQsOjaSBiaeG7g24gTeG7uSBLaMOq!5e0!3m2!1svi!2s!4v1776283221393!5m2!1svi!2s"
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen="" 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                  title="ABCHotel Location"
                ></iframe>
              </div>
            </Card>
          </Col>

          {/* CỘT PHẢI: FORM GỬI TIN NHẮN */}
          <Col xs={24} lg={14}>
            <Card bordered={false} style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.08)', borderRadius: 12 }}>
              <Title level={3} style={{ color: THEME.NAVY, marginBottom: 30 }}>Gửi Lời Nhắn</Title>
              <Form layout="vertical" onFinish={onFinish} size="large">
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item name="name" label={<Text strong>Họ và Tên</Text>} rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
                      <Input placeholder="Nguyễn Văn A" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="email" label={<Text strong>Email</Text>} rules={[{ required: true, type: 'email', message: 'Vui lòng nhập email hợp lệ' }]}>
                      <Input placeholder="example@gmail.com" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="phone" label={<Text strong>Số điện thoại</Text>}>
                  <Input placeholder="090123xxxx" />
                </Form.Item>

                <Form.Item name="subject" label={<Text strong>Chủ đề</Text>}>
                  <Input placeholder="Bạn cần hỗ trợ về vấn đề gì?" />
                </Form.Item>

                <Form.Item name="message" label={<Text strong>Nội dung</Text>} rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]}>
                  <Input.TextArea rows={6} placeholder="Nhập chi tiết yêu cầu của bạn tại đây..." />
                </Form.Item>

                <Button type="primary" htmlType="submit" block style={{ backgroundColor: THEME.NAVY, height: 50, fontSize: 16, fontWeight: 'bold', letterSpacing: 1 }}>
                  GỬI YÊU CẦU NGAY
                </Button>
              </Form>
            </Card>
          </Col>
        </Row>

        {/* ================= KHỐI FAQ (CÂU HỎI THƯỜNG GẶP) ================= */}
        <div style={{ marginTop: 80 }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <Question size={48} color={THEME.GOLD} weight="duotone" style={{ marginBottom: 16 }} />
            <Title level={2} style={{ color: THEME.NAVY, margin: 0 }}>Câu Hỏi Thường Gặp</Title>
            <div style={{ width: 60, height: 3, backgroundColor: THEME.RED, margin: '16px auto 0' }}></div>
          </div>
          
          <Row justify="center">
            <Col xs={24} lg={20}>
              <Collapse 
                items={faqItems} 
                bordered={false}
                expandIcon={({ isActive }) => <CaretRight size={16} color={THEME.RED} weight="bold" style={{ transform: `rotate(${isActive ? 90 : 0}deg)`, transition: '0.2s' }} />}
                style={{ background: '#fff' }}
                expandIconPosition="end"
                className="luxury-collapse"
              />
            </Col>
          </Row>
        </div>

      </div>

      {/* STYLE CSS CHO COLLAPSE */}
      <style>{`
        .luxury-collapse .ant-collapse-item {
          border: 1px solid #f0f0f0;
          border-radius: 8px !important;
          margin-bottom: 16px;
          background: ${THEME.BG_LIGHT};
          overflow: hidden;
        }
        .luxury-collapse .ant-collapse-header {
          padding: 16px 24px !important;
          align-items: center !important;
        }
        .luxury-collapse .ant-collapse-content {
          border-top: 1px solid #f0f0f0;
        }
        .luxury-collapse .ant-collapse-content-box {
          padding: 24px !important;
          background: #fff;
        }
      `}</style>
    </div>
  );
}