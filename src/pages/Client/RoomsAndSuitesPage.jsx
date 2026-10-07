import React, { useState, useEffect } from 'react';
import { 
  Button, Typography, Space, Divider, notification, Spin, Tag 
} from 'antd';
import { 
  Users, Bed, ArrowsOut, CheckCircle 
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { roomTypeApi } from "../../api/roomTypeApi";
import { useSignalR } from '../../hooks/useSignalR'; 

const { Title, Text, Paragraph } = Typography;

const THEME = {
  NAVY_DARK: '#0D1821',
  NAVY_LIGHT: '#1C2E4A',
  DARK_RED: '#8A1538',
  GOLD: '#D4AF37', 
  WHITE: '#FFFFFF',
  GRAY_LIGHT: '#F8FAFC'
};

const CONTAINER_STYLE = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: '0 20px'
};

export default function RoomsAndSuitesPage() {
  const navigate = useNavigate();
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        const res = await roomTypeApi.getRoomTypes(true);
        let data = res?.data?.$values || res?.$values || res?.data || res || [];
        setRoomTypes(data);

        // PHỤC HỒI VỊ TRÍ CUỘN TRANG SAU KHI LOAD DATA XONG
        setTimeout(() => {
          const savedScroll = sessionStorage.getItem('roomsScrollPosition');
          if (savedScroll) {
            window.scrollTo({ top: parseInt(savedScroll, 10), behavior: 'instant' });
          }
        }, 100);

      } catch (error) {
        console.error("Lỗi tải danh sách loại phòng:", error);
        notification.error({ message: 'Lỗi kết nối', description: 'Không thể tải dữ liệu phòng.' });
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  useSignalR((message) => {
    notification.open({
      message: <Text strong style={{ color: THEME.DARK_RED }}>Thông báo từ ABCHOTEL</Text>,
      description: typeof message === 'string' ? message : (message.content || message.message),
      placement: 'bottomRight',
      style: { borderLeft: `4px solid ${THEME.DARK_RED}` }
    });
  });

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);
  };

  // HÀM XỬ LÝ CHUYỂN TRANG XEM CHI TIẾT
  const handleViewDetails = (room, index) => {
    // 1. Lưu lại vị trí đang cuộn của trang này
    sessionStorage.setItem('roomsScrollPosition', window.scrollY);
    
    // 2. Chuyển trang và mang theo id + index (để file kia map đúng bài viết)
    navigate('/room-details', { 
      state: { 
        scrollToId: room.id || room.Id, 
        roomIndex: index // Truyền index là cực kỳ quan trọng để fallback
      } 
    });
  };

  return (
    <div className="rooms-page-wrapper" style={{ backgroundColor: THEME.GRAY_LIGHT, minHeight: '100vh', paddingBottom: 80 }}>
      
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;1,500&family=Source+Serif+4:ital,opsz,wght@0,8..60,200..900;1,8..60,200..900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

          .rooms-page-wrapper .room-list-card {
            background: #ffffff;
            overflow: hidden;
            display: flex;
            flex-direction: row;
            box-shadow: 0 10px 30px rgba(13, 24, 33, 0.05);
            margin-bottom: 40px;
            border: 1px solid #eaeaea;
            transition: all 0.4s ease;
          }
          
          .rooms-page-wrapper .room-list-card:hover {
            box-shadow: 0 15px 40px rgba(13, 24, 33, 0.12);
            transform: translateY(-4px);
          }

          .rooms-page-wrapper .room-img-container {
            width: 45%; 
            position: relative;
            overflow: hidden;
          }

          .rooms-page-wrapper .room-img-container img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.8s ease;
          }

          .rooms-page-wrapper .room-list-card:hover .room-img-container img {
            transform: scale(1.05);
          }

          .rooms-page-wrapper .room-content {
            width: 55%; 
            padding: 40px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          .rooms-page-wrapper .amenity-tag {
            background-color: transparent;
            border: 1px solid ${THEME.GOLD};
            color: ${THEME.NAVY_DARK};
            border-radius: 2px;
            padding: 4px 12px;
            font-weight: 500;
          }

          /* Tối ưu Responsive cho Tablet */
          @media (max-width: 992px) {
            .rooms-page-wrapper .room-content { padding: 24px; }
            .rooms-page-wrapper .room-content h2 { font-size: 22px !important; }
          }

          /* Tối ưu Responsive cho Mobile */
          @media (max-width: 768px) {
            .rooms-page-wrapper .room-list-card { flex-direction: column !important; }
            .rooms-page-wrapper .room-img-container { width: 100% !important; height: 250px !important; }
            .rooms-page-wrapper .room-content { width: 100% !important; padding: 20px !important; }
            .rooms-page-wrapper .price-action-container { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
            
            /* Sửa lại nút bấm trải đều toàn màn hình điện thoại */
            .rooms-page-wrapper .action-buttons { width: 100% !important; display: flex !important; flex-direction: column !important; gap: 10px !important; }
            .rooms-page-wrapper .action-buttons button { width: 100% !important; }
          }
        `}
      </style>

      {/* Đã xóa marginTop: '-80px' để không chèn lên Header */}
      <section style={{ 
        position: 'relative', 
        height: '40vh', 
        minHeight: 350,
        backgroundImage: 'url("https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1920&q=80")', 
        backgroundSize: 'cover', 
        backgroundPosition: 'center'
      }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to right, ${THEME.NAVY_DARK}, rgba(13,24,33,0.4))` }} />
        
        <div style={{ ...CONTAINER_STYLE, position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Text style={{ color: THEME.GOLD, fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', fontSize: 13 }}>
            Không Gian Nghỉ Dưỡng
          </Text>
          <Title level={1} style={{ color: '#fff', fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', margin: '16px 0 0 0', fontFamily: '"Source Serif 4", serif' }}>
            Phòng <span style={{ fontFamily: '"Playfair Display", serif', fontStyle: 'italic', fontWeight: 500 }}>&</span> Suites
          </Title>
        </div>
      </section>

      <section style={{ marginTop: 60 }}>
        <div style={CONTAINER_STYLE}>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
              <Spin size="large" />
              <Paragraph style={{ marginTop: 16, color: THEME.NAVY_DARK }}>Đang đồng bộ dữ liệu phòng...</Paragraph>
            </div>
          ) : roomTypes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
              <Title level={4} style={{ color: THEME.DARK_RED, fontFamily: '"Source Serif 4", serif' }}>Hiện chưa có loại phòng nào được mở bán.</Title>
            </div>
          ) : (
            roomTypes.map((room, index) => {
              const name = room.name || room.Name;
              const basePrice = room.basePrice || room.BasePrice;
              const capacityAdults = room.capacityAdults || room.CapacityAdults;
              const capacityChildren = room.capacityChildren || room.CapacityChildren;
              const sizeSqm = room.sizeSqm || room.SizeSqm;
              const bedType = room.bedType || room.BedType;
              const description = room.description || room.Description;
              
              const images = room.images?.$values || room.images || room.Images?.$values || room.Images || [];
              const amenities = room.amenities?.$values || room.amenities || room.Amenities?.$values || room.Amenities || [];
              
              const primaryImg = images.find(img => img.isPrimary || img.IsPrimary)?.imageUrl 
                                 || images.find(img => img.isPrimary || img.IsPrimary)?.ImageUrl 
                                 || images[0]?.imageUrl || images[0]?.ImageUrl 
                                 || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80';

              return (
                <div key={room.id || room.Id} className="room-list-card" style={{ flexDirection: 'row' }}>
                  <div className="room-img-container">
                    <img src={primaryImg} alt={name} />
                  </div>

                  <div className="room-content">
                    <div>
                      <Title level={2} style={{ color: THEME.NAVY_DARK, margin: '0 0 16px 0', fontSize: 26, fontFamily: '"Source Serif 4", serif' }}>
                        {name}
                      </Title>

                      <Space size="large" wrap style={{ marginBottom: 20 }}>
                        <Space style={{ color: THEME.textGray }}><ArrowsOut size={18} color={THEME.DARK_RED}/> <Text strong>{sizeSqm} m²</Text></Space>
                        <Space style={{ color: THEME.textGray }}><Users size={18} color={THEME.DARK_RED}/> <Text strong>{capacityAdults} NL {capacityChildren > 0 && `, ${capacityChildren} TE`}</Text></Space>
                        <Space style={{ color: THEME.textGray }}><Bed size={18} color={THEME.DARK_RED}/> <Text strong>{bedType}</Text></Space>
                      </Space>

                      <Paragraph style={{ color: THEME.textGray, fontSize: 15, lineHeight: 1.6, marginBottom: 24, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {description || `Trải nghiệm kỳ nghỉ dưỡng đẳng cấp với không gian sang trọng, nội thất hiện đại và dịch vụ tận tâm tại ABCHOTEL.`}
                      </Paragraph>

                      {amenities.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                          {amenities.slice(0, 4).map((amenity, idx) => (
                            <Tag key={idx} className="amenity-tag">
                              <CheckCircle size={14} style={{ marginRight: 6, verticalAlign: 'text-top' }} color={THEME.DARK_RED} weight="fill" />
                              {amenity.name || amenity.Name}
                            </Tag>
                          ))}
                          {amenities.length > 4 && <Tag className="amenity-tag" style={{ border: 'none', background: 'transparent' }}>+ {amenities.length - 4} khác</Tag>}
                        </div>
                      )}
                    </div>

                    <Divider style={{ margin: '16px 0', borderColor: 'rgba(0,0,0,0.06)' }} />

                    <div className="price-action-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text style={{ fontSize: 12, color: THEME.textGray, textTransform: 'uppercase', letterSpacing: '1px' }}>Chỉ từ</Text>
                        <div style={{ color: THEME.DARK_RED, fontSize: 24, fontWeight: 700, fontFamily: '"Source Serif 4", serif' }}>
                          {formatPrice(basePrice)} <span style={{ fontSize: 14, color: THEME.textGray, fontWeight: 400, fontFamily: 'sans-serif' }}>/ đêm</span>
                        </div>
                      </div>
                      
                      <div className="action-buttons" style={{ display: 'flex', gap: 16 }}>
                        <Button 
                          size="large" 
                          style={{ borderColor: THEME.NAVY_DARK, color: THEME.NAVY_DARK, borderRadius: 0, fontWeight: 600, height: 44, padding: '0 24px' }}
                          onClick={() => handleViewDetails(room, index)}
                        >
                          XEM CHI TIẾT
                        </Button>
                        <Button 
                          type="primary" 
                          size="large" 
                          style={{ backgroundColor: THEME.DARK_RED, borderRadius: 0, border: 'none', fontWeight: 600, height: 44, padding: '0 32px', letterSpacing: '1px' }}
                          onClick={() => navigate('#booking')}
                        >
                          ĐẶT PHÒNG
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}