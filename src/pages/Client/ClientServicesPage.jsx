import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Row, Col, Spin, Tag, Input, ConfigProvider, Divider, notification } from 'antd';
import { 
  MagnifyingGlass, Crown, Sparkle, CaretRight, BellRinging, Diamond,
  Coffee, ForkKnife, BeerStein, Car, Martini, Campfire, 
  Bicycle, Waves, Scissors, Pill, Leaf, Calendar
} from '@phosphor-icons/react';
import { serviceApi } from '../../api/serviceApi';
import { useSignalR } from '../../hooks/useSignalR';

const { Title, Text, Paragraph } = Typography;

const THEME = {
  NAVY_DARK: '#0D1821',
  GOLD: '#D4AF37',
  GOLD_BRIGHT: '#F3E5AB',
  GOLD_SOFT: 'rgba(212, 175, 55, 0.1)',
  SLATE: '#64748b',
  WHITE: '#FFFFFF',
  BG_SOFT: '#F8FAFC',
};

export default function ClientServicesPage() {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState(null);

  // --- SỬA: Thêm tham số showLoading để cập nhật ngầm ---
  const loadData = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      if (serviceApi) {
        const [s, c] = await Promise.all([
          serviceApi.getServices(true), 
          serviceApi.getCategories()
        ]);
        const activeCats = Array.isArray(c) ? c : [];
        setServices(Array.isArray(s) ? s : []);
        setCategories(activeCats);
        
        // Chỉ set activeCat mặc định ở lần đầu tiên load trang
        if (activeCats.length > 0 && showLoading && !activeCat) {
          setActiveCat(activeCats[0].id);
        }
      }
    } catch (e) { 
      console.error("Lỗi tải dữ liệu", e); 
    } finally { 
      if (showLoading) setLoading(false); 
    }
  }, [activeCat]);

  // --- SỬA: Lắng nghe SignalR để tự động tải lại dữ liệu ---
  useSignalR(useCallback((msg) => {
    // Kiểm tra nếu tin nhắn yêu cầu reload hoặc đơn giản là có thông báo mới
    const content = typeof msg === 'object' ? msg.content : msg;
    const action = typeof msg === 'object' ? msg.action : null;

    // Nếu Backend gửi kèm action "reload_services" hoặc nội dung liên quan đến cập nhật
    if (action === "reload_services" || !action) {
        loadData(false); // Tải lại dữ liệu mới nhất (không hiện loading xoay xoay)
    }

    notification.open({
      message: <span style={{ color: THEME.GOLD, fontWeight: 'bold' }}>Elite Concierge</span>,
      description: content || "Dịch vụ đã có cập nhật mới!",
      icon: <BellRinging weight="fill" color={THEME.GOLD} />,
      placement: 'bottomRight',
      className: 'luxury-notification'
    });
  }, [loadData]));

  useEffect(() => {
    loadData(true); // Lần đầu vào trang thì hiện loading
  }, []); // Chỉ chạy 1 lần khi mount

  const getServiceIcon = (name) => {
    const n = name.toLowerCase();
    if (n.includes('buffet') || n.includes('ăn') || n.includes('sáng')) return <ForkKnife size={48} weight="duotone" />;
    if (n.includes('uống') || n.includes('cafe') || n.includes('cà phê')) return <Coffee size={48} weight="duotone" />;
    if (n.includes('rượu') || n.includes('bar') || n.includes('cocktail')) return <Martini size={48} weight="duotone" />;
    if (n.includes('spa') || n.includes('massage') || n.includes('thư giãn')) return <Leaf size={48} weight="duotone" />;
    if (n.includes('xe') || n.includes('vận chuyển') || n.includes('đưa đón')) return <Car size={48} weight="duotone" />;
    if (n.includes('biển') || n.includes('bơi') || n.includes('tắm')) return <Waves size={48} weight="duotone" />;
    if (n.includes('gym') || n.includes('thể thao')) return <Bicycle size={48} weight="duotone" />;
    if (n.includes('tiệc') || n.includes('sự kiện')) return <Calendar size={48} weight="duotone" />;
    return <Sparkle size={48} weight="duotone" />;
  };

  const scrollToCategory = (id) => {
    setActiveCat(id);
    const element = document.getElementById(`category-${id}`);
    if (element) {
      const offset = window.innerWidth < 768 ? 150 : 100;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
    }
  };

  if (loading) return (
    <div className="elite-loader">
      <div className="loader-diamond"></div>
      <Text style={{ marginTop: 24, color: THEME.GOLD, letterSpacing: 8, fontSize: 12, fontWeight: 300 }}>ELITE SERVICES</Text>
    </div>
  );

  return (
    <ConfigProvider theme={{ token: { fontFamily: '"Source Serif 4", serif' } }}>
      <div style={{ minHeight: '100vh', background: THEME.BG_SOFT }}>
        
        <section className="hero-banner">
          <img 
            src="https://i1-c.pinimg.com/1200x/01/21/05/012105866ee6a760fc76a8bf93ef440a.jpg" 
            className="hero-media"
            alt="Luxury Hotel"
          />
          <div className="hero-overlay"></div>
          
          <div className="hero-content">
            <div className="floating-crown">
                <Crown size={32} weight="fill" color={THEME.GOLD} />
            </div>
            <Text className="hero-subtitle">ABC HOTEL</Text>
            <Title className="hero-title">
              Trải Nghiệm <span className="shimmer-gold">Đặc Quyền</span>
            </Title>
            <div className="hero-search-bar">
              <MagnifyingGlass size={22} color={THEME.GOLD} weight="bold" />
              <input 
                placeholder="Tìm kiếm dịch vụ..." 
                onChange={e => setSearch(e.target.value)} 
                className="hero-search-input-native"
              />
            </div>
          </div>
        </section>

        <div className="content-wrapper">
          <Row gutter={[40, 0]}>
            <Col xs={24} md={7} lg={6}>
              <div className="sidebar-container">
                <div className="sidebar-label-group hide-mobile">
                  <div className="label-line"></div>
                  <Text className="sidebar-label">Danh Mục</Text>
                </div>
                
                <nav className="sidebar-nav">
                  {categories.map(cat => (
                    <div 
                      key={cat.id}
                      onClick={() => scrollToCategory(cat.id)}
                      className={`nav-item ${activeCat === cat.id ? 'active' : ''}`}
                    >
                      <span className="nav-text">{cat.name}</span>
                      <span className="nav-count">{services.filter(s => s.categoryId === cat.id).length}</span>
                    </div>
                  ))}
                </nav>
              </div>
            </Col>

            <Col xs={24} md={17} lg={18}>
              {categories.map((cat) => {
                const filtered = services.filter(s => s.categoryId === cat.id && s.name.toLowerCase().includes(search.toLowerCase()));
                if (filtered.length === 0) return null;

                return (
                  <div key={cat.id} id={`category-${cat.id}`} className="service-group">
                    <div className="group-header">
                      <Title level={2} className="group-title">{cat.name}</Title>
                      <div className="group-divider"></div>
                    </div>

                    <Row gutter={[20, 30]}>
                      {filtered.map(svc => (
                        <Col xs={24} sm={12} xl={8} key={svc.id}>
                          <div className="service-card-premium">
                            <div className="card-image-placeholder">
                                <div className="icon-bg-circle"></div>
                                <div className="icon-wrapper">
                                  {getServiceIcon(svc.name)}
                                </div>
                            </div>
                            <div className="card-body">
                              <div className="card-top-info">
                                <Tag className="card-tag">PREMIUM</Tag>
                                <Sparkle size={16} color={THEME.GOLD} weight="fill" />
                              </div>
                              <Title level={4} className="card-title">{svc.name}</Title>
                              <Paragraph className="card-desc" ellipsis={{ rows: 2 }}>
                                {svc.description ? svc.description.replace(/<[^>]*>/g, '') : 'Trải nghiệm tinh hoa dịch vụ đẳng cấp.'}
                              </Paragraph>
                              <div className="card-footer">
                                <div className="card-price">
                                  <span className="price-label">Giá từ</span>
                                  <div>
                                    <span className="price-num">{svc.price?.toLocaleString()}</span>
                                    <span className="price-unit">VND</span>
                                  </div>
                                </div>
                                <div className="card-action-btn">
                                    <CaretRight size={18} weight="bold" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </div>
                );
              })}
            </Col>
          </Row>
        </div>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@300;400;600;700&family=Inter:wght@300;400;500&display=swap');
          
          body { overflow-x: hidden; scroll-behavior: smooth; }

          /* HERO SECTION */
          .hero-banner { 
            height: 550px; background: #000; position: relative; 
            display: flex; align-items: center; justify-content: center; overflow: hidden;
          }
          .hero-media { position: absolute; width: 100%; height: 100%; object-fit: cover; top: 0; left: 0; z-index: 0; filter: brightness(0.7); animation: slowZoom 20s infinite alternate; }
          @keyframes slowZoom { from { transform: scale(1); } to { transform: scale(1.1); } }
          
          .hero-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(13,24,33,0.8), transparent, ${THEME.BG_SOFT}); z-index: 1; }
          .hero-content { position: relative; z-index: 2; text-align: center; width: 100%; padding: 0 20px; }
          .hero-subtitle { color: ${THEME.GOLD}; letter-spacing: 6px; font-size: 12px; font-weight: 600; display: block; margin-bottom: 10px; }
          .hero-title { color: white !important; font-size: clamp(32px, 8vw, 72px) !important; margin: 0 0 30px !important; font-weight: 700 !important; }
          
          .hero-search-bar {
            max-width: 600px; margin: 0 auto; background: rgba(255,255,255,0.1);
            backdrop-filter: blur(15px); border: 1px solid rgba(255,255,255,0.2);
            border-radius: 100px; padding: 12px 25px; display: flex; align-items: center; gap: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          }
          .hero-search-input-native { background: transparent; border: none; outline: none; color: white; width: 100%; font-size: 16px; }
          .hero-search-input-native::placeholder { color: rgba(255,255,255,0.6); }

          /* CONTENT LAYOUT */
          .content-wrapper { max-width: 1400px; margin: 0 auto; padding: 0 24px 100px; }
          .sidebar-container { position: sticky; top: 100px; z-index: 10; }
          
          .sidebar-nav { 
            background: white; padding: 10px; border-radius: 20px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.03);
            max-height: 70vh; overflow-y: auto;
          }
          .nav-item { padding: 15px 20px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; border-radius: 12px; margin-bottom: 4px; transition: 0.3s; }
          .nav-item.active { background: ${THEME.NAVY_DARK}; }
          .nav-item.active .nav-text { color: ${THEME.GOLD}; font-weight: 600; }
          .nav-text { font-size: 14px; color: #475569; }
          .nav-count { font-size: 10px; padding: 2px 8px; border-radius: 10px; background: #f1f5f9; color: #94a3b8; }

          /* SERVICE CARDS */
          .service-card-premium { 
            background: white; border-radius: 20px; overflow: hidden;
            transition: 0.4s; height: 100%; display: flex; flex-direction: column; 
            border: 1px solid rgba(0,0,0,0.03);
          }
          .service-card-premium:hover { transform: translateY(-10px); box-shadow: 0 20px 40px rgba(0,0,0,0.08); }
          .card-image-placeholder { height: 180px; background: ${THEME.NAVY_DARK}; display: flex; align-items: center; justify-content: center; position: relative; }
          .icon-wrapper { color: ${THEME.GOLD}; z-index: 1; transition: 0.4s; }
          .service-card-premium:hover .icon-wrapper { transform: scale(1.1); color: #fff; }
          .service-card-premium:hover .card-image-placeholder { background: ${THEME.GOLD}; }

          .card-body { padding: 25px; flex: 1; display: flex; flex-direction: column; }
          .card-title { font-size: 20px !important; margin-bottom: 12px !important; }
          .card-desc { color: ${THEME.SLATE}; font-size: 14px; margin-bottom: 20px !important; }
          .price-num { font-size: 24px; font-weight: 700; color: ${THEME.NAVY_DARK}; }

          .group-title { font-size: 28px !important; margin-bottom: 8px !important; }
          .group-divider { height: 3px; width: 50px; background: ${THEME.GOLD}; margin-bottom: 30px; }

          /* LOADER */
          .elite-loader { height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; background: ${THEME.NAVY_DARK}; }
          .loader-diamond { width: 40px; height: 40px; border: 1px solid ${THEME.GOLD}; transform: rotate(45deg); animation: rotate 2s infinite; }
          @keyframes rotate { 0% { transform: rotate(45deg); } 100% { transform: rotate(405deg); } }

          /* SHIMMER EFFECT */
          .shimmer-gold {
            background: linear-gradient(to right, #BF953F, #FCF6BA, #AA771C);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: shimmer 3s infinite linear;
            background-size: 200% auto;
          }
          @keyframes shimmer { to { background-position: 200% center; } }

          /* MOBILE RESPONSIVE TỐI ƯU */
          @media (max-width: 768px) {
            .hero-banner { height: 380px; }
            .hero-subtitle { letter-spacing: 4px; }
            .hide-mobile { display: none; }
            
            .sidebar-container { 
              position: sticky; 
              top: 0; 
              background: ${THEME.BG_SOFT}; 
              margin: 0 -15px 25px; 
              padding: 10px 15px;
              z-index: 10;
            }
            
            .sidebar-nav { 
              display: flex; 
              overflow-x: auto; 
              white-space: nowrap; 
              background: transparent; 
              box-shadow: none;
              padding: 0;
              gap: 10px;
              scrollbar-width: none;
            }
            .sidebar-nav::-webkit-scrollbar { display: none; }
            
            .nav-item { 
              display: inline-flex;
              background: white;
              padding: 10px 18px;
              border: 1px solid #edf2f7;
            }
            .nav-item.active { box-shadow: 0 8px 15px rgba(0,0,0,0.1); }
            
            .content-wrapper { padding: 0 15px 60px; }
            .service-group { margin-bottom: 40px; }
            .card-body { padding: 20px; }
          }
        `}</style>
      </div>
    </ConfigProvider>
  );
}