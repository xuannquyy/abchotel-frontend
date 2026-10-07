import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Row, Col, Tag, Input, Space, Divider, ConfigProvider, Pagination, Empty, Card } from 'antd';
import { MagnifyingGlass, Clock, Eye, Fire, ArrowRight } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { articleApi } from '../../api/articleApi';
import { categoryApi } from '../../api/categoryApi'; 
import dayjs from 'dayjs';
import { useSignalR } from '../../hooks/useSignalR';

const { Title, Text, Paragraph } = Typography;

const THEME = {
    NAVY: '#0D1821',
    GOLD: '#D4AF37',
    PRIMARY: '#8A1538',
    BORDER: '#F1F5F9',
    SOFT_GRAY: '#64748B'
};

export default function ArticlePage() {
    const navigate = useNavigate();
    const [articles, setArticles] = useState([]);
    const [categories, setCategories] = useState([]); 
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState(null); 
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 5;

    // Hàm loadData hỗ trợ chế độ silent để không gây giật lag giao diện khi SignalR cập nhật
    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [artRes, catRes] = await Promise.all([
                articleApi.getArticles(true),
                categoryApi.getCategories(true)
            ]);
            setArticles(artRes || []);
            setCategories(catRes || []);
        } catch (err) { 
            console.error(err); 
        } finally { 
            if (!silent) setLoading(false); 
        }
    }, []);

    // Lắng nghe sự kiện từ SignalR để tự động cập nhật danh sách bài viết
    useSignalR(useCallback((notification) => {
        console.log("SignalR: Nhận thông báo cập nhật bài viết mới.");
        loadData(true); // Cập nhật ngầm (silent)
    }, [loadData]));

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Logic lọc bài viết theo tìm kiếm và danh mục
    const filtered = articles.filter(a => {
        const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase());
        const matchesCat = activeCategory ? a.categoryId === activeCategory : true;
        return matchesSearch && matchesCat;
    });

    const topArticle = filtered[0]; 
    const mainList = filtered.slice(1);
    const trending = [...articles].reverse().slice(0, 5); 
    const currentMainList = mainList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <ConfigProvider theme={{ token: { fontFamily: '"Source Serif 4", serif', borderRadius: 0 } }}>
            <div style={{ background: '#fff', minHeight: '100vh' }}>
                
                {/* HERO SECTION */}
                <section className="hero-modern">
                    <img src="https://i1-c.pinimg.com/736x/2e/d4/65/2ed465b287365a4753eb4a02be29f3da.jpg" className="hero-img" alt="beach-banner" />
                    <div className="hero-overlay" />
                    <div className="hero-inner">
                        <Title level={1} className="hero-title">CẨM NANG <span style={{ color: THEME.GOLD }}>DU LỊCH</span></Title>
                        <Text className="hero-subtitle">Khám phá hành trình nghỉ dưỡng đẳng cấp</Text>
                        <div className="hero-search-box">
                            <Input 
                                prefix={<MagnifyingGlass size={22} weight="bold" color={THEME.NAVY} />}
                                placeholder="Tìm kiếm bài viết..." 
                                onChange={e => setSearch(e.target.value)}
                                className="search-input-modern"
                            />
                        </div>
                    </div>
                </section>

                {/* THANH DANH MỤC - Scroll ngang trên mobile */}
                <nav className="category-bar-modern">
                    <div className="category-container">
                        <div className="category-scroll-wrapper">
                            <span 
                                className={`category-item ${!activeCategory ? 'active' : ''}`}
                                onClick={() => {setActiveCategory(null); setCurrentPage(1);}}
                            >
                                TẤT CẢ
                            </span>
                            {categories.map(cat => (
                                <span 
                                    key={cat.id} 
                                    className={`category-item ${activeCategory === cat.id ? 'active' : ''}`}
                                    onClick={() => {setActiveCategory(cat.id); setCurrentPage(1);}}
                                >
                                    {cat.name.toUpperCase()}
                                </span>
                            ))}
                        </div>
                    </div>
                </nav>

                <main className="main-content-wrapper">
                    <Row gutter={[40, 0]}>
                        {/* CỘT TRÁI */}
                        <Col xs={24} lg={17}>
                            {topArticle && (
                                <article className="top-post-card" onClick={() => navigate(`/article/${topArticle.slug}`)}>
                                    <div className="top-post-img">
                                        <img src={topArticle.thumbnailUrl || 'https://via.placeholder.com/800x450'} alt="top" />
                                        <div className="top-post-badge">{topArticle.categoryName || 'NỔI BẬT'}</div>
                                    </div>
                                    <div className="top-post-content">
                                        <Title level={2} className="title-serif">{topArticle.title}</Title>
                                        <Paragraph className="desc-serif" ellipsis={{ rows: 3 }}>
                                            {topArticle.shortDescription?.replace(/<[^>]*>/g, '')}
                                        </Paragraph>
                                        <div className="btn-read-more">TIẾP TỤC ĐỌC <ArrowRight size={18} /></div>
                                    </div>
                                </article>
                            )}

                            <div className="section-divider">
                                <Title level={3} className="section-title">BÀI VIẾT MỚI</Title>
                            </div>

                            <div className="article-list-container">
                                {currentMainList.length > 0 ? currentMainList.map(art => (
                                    <div key={art.id} className="post-item-wrapper" onClick={() => navigate(`/article/${art.slug}`)}>
                                        {/* Desktop View */}
                                        <div className="post-row-item desktop-only">
                                            <Row gutter={25} align="middle">
                                                <Col span={9}>
                                                    <div className="row-item-img">
                                                        <img src={art.thumbnailUrl || 'https://via.placeholder.com/300x200'} alt="thumb" />
                                                    </div>
                                                </Col>
                                                <Col span={15}>
                                                    <Title level={4} className="row-item-title">{art.title}</Title>
                                                    <Space className="item-meta">
                                                        <Clock size={14} /> {dayjs(art.publishedAt).format('DD/MM/YYYY')}
                                                        <Divider type="vertical" />
                                                        <Eye size={14} /> {Math.floor(Math.random() * 500) + 10} xem
                                                    </Space>
                                                    <Paragraph className="row-item-desc" ellipsis={{ rows: 2 }}>
                                                        {art.shortDescription?.replace(/<[^>]*>/g, '')}
                                                    </Paragraph>
                                                </Col>
                                            </Row>
                                        </div>

                                        {/* Mobile Card View */}
                                        <Card 
                                            className="mobile-only mobile-article-card"
                                            cover={<div className="mobile-card-img"><img alt="thumb" src={art.thumbnailUrl} /></div>}
                                            bodyStyle={{ padding: '15px' }}
                                        >
                                            <Tag color="volcano" style={{ marginBottom: 8 }}>{art.categoryName}</Tag>
                                            <Title level={4} style={{ fontSize: 17, marginBottom: 8, lineHeight: 1.4 }}>{art.title}</Title>
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                <Clock size={12} style={{ marginRight: 4 }} />
                                                {dayjs(art.publishedAt).format('DD/MM/YYYY')}
                                            </Text>
                                        </Card>
                                    </div>
                                )) : <Empty description="Không có bài viết" />}
                            </div>
                            
                            <div className="pagination-wrapper">
                                <Pagination 
                                    current={currentPage} 
                                    total={filtered.length} 
                                    pageSize={pageSize} 
                                    onChange={setCurrentPage} 
                                    size="small" 
                                />
                            </div>
                        </Col>

                        {/* CỘT PHẢI */}
                        <Col xs={24} lg={7}>
                            <aside className="sidebar-sticky">
                                <div className="sidebar-title-box">
                                    <Fire size={24} weight="fill" color={THEME.PRIMARY} />
                                    <Title level={4} style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>TIN TỨC PHỔ BIẾN</Title>
                                </div>
                                
                                <div className="trending-container">
                                    {trending.map((t, index) => (
                                        <div key={t.id} className="trending-row" onClick={() => navigate(`/article/${t.slug}`)}>
                                            <div className="trending-num">0{index + 1}</div>
                                            <div className="trending-body">
                                                <Text strong className="trending-link">{t.title}</Text>
                                                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                                                    {dayjs(t.publishedAt).format('DD/MM/YYYY')}
                                                </Text>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </aside>
                        </Col>
                    </Row>
                </main>

                <style>{`
                    /* GLOBAL GÓC VUÔNG */
                    * { border-radius: 0 !important; }

                    /* HERO RESPONSIVE */
                    .hero-modern { position: relative; height: 480px; display: flex; align-items: center; justify-content: center; text-align: center; overflow: hidden; }
                    .hero-img { position: absolute; width: 100%; height: 100%; object-fit: cover; z-index: 1; }
                    .hero-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.45); z-index: 2; }
                    .hero-inner { position: relative; z-index: 3; width: 100%; max-width: 800px; padding: 0 20px; }
                    .hero-title { color: #fff !important; font-size: clamp(28px, 7vw, 56px) !important; font-weight: 900 !important; margin: 0 !important; text-transform: uppercase; }
                    .hero-subtitle { color: #fff; font-size: clamp(14px, 4vw, 18px); opacity: 0.9; display: block; margin: 10px 0 25px; }
                    .search-input-modern { height: 50px !important; border: none !important; }

                    /* CATEGORY BAR MOBILE */
                    .category-bar-modern { background: #fff; border-bottom: 1px solid ${THEME.BORDER}; position: sticky; top: 0; z-index: 1000; }
                    .category-container { max-width: 1300px; margin: 0 auto; }
                    .category-scroll-wrapper { display: flex; overflow-x: auto; white-space: nowrap; padding: 15px 20px; gap: 30px; scrollbar-width: none; }
                    .category-scroll-wrapper::-webkit-scrollbar { display: none; }
                    .category-item { font-weight: 700; font-size: 12px; color: ${THEME.SOFT_GRAY}; letter-spacing: 1px; cursor: pointer; transition: 0.3s; position: relative; }
                    .category-item.active { color: ${THEME.GOLD}; }
                    .category-item.active::after { content: ''; position: absolute; bottom: -15px; left: 0; width: 100%; height: 3px; background: ${THEME.GOLD}; }

                    /* MAIN CONTENT */
                    .main-content-wrapper { max-width: 1300px; margin: 40px auto; padding: 0 20px; }
                    .section-divider { margin: 40px 0 20px; }
                    .section-title { font-weight: 800; border-left: 5px solid ${THEME.GOLD}; padding-left: 15px; font-size: 20px !important; }

                    /* TOP POST RESPONSIVE */
                    .top-post-card { cursor: pointer; margin-bottom: 30px; border-bottom: 1px solid ${THEME.BORDER}; padding-bottom: 30px; }
                    .top-post-img { position: relative; height: clamp(250px, 50vh, 420px); background: #eee; }
                    .top-post-img img { width: 100%; height: 100%; object-fit: cover; }
                    .title-serif { margin-top: 20px !important; font-size: clamp(22px, 5vw, 34px) !important; font-weight: 800 !important; line-height: 1.3 !important; }

                    /* ARTICLE LIST */
                    .post-row-item { padding: 20px 0; border-bottom: 1px solid ${THEME.BORDER}; cursor: pointer; }
                    .row-item-img { height: 170px; border: 1px solid ${THEME.BORDER}; overflow: hidden; }
                    .row-item-img img { width: 100%; height: 100%; object-fit: cover; transition: 0.5s; }
                    .post-row-item:hover img { transform: scale(1.05); }

                    /* MOBILE CARD */
                    .mobile-article-card { margin-bottom: 25px; border: 1px solid ${THEME.BORDER} !important; box-shadow: none !important; }
                    .mobile-card-img { height: 200px; overflow: hidden; }
                    .mobile-card-img img { width: 100%; height: 100%; object-fit: cover; }

                    /* SIDEBAR */
                    .sidebar-sticky { position: sticky; top: 80px; margin-top: 40px; }
                    .sidebar-title-box { display: flex; align-items: center; gap: 10px; padding-bottom: 12px; border-bottom: 2px solid ${THEME.NAVY}; margin-bottom: 15px; }
                    .trending-row { display: flex; gap: 15px; padding: 12px 0; border-bottom: 1px solid ${THEME.BORDER}; cursor: pointer; }
                    .trending-num { font-size: 20px; font-weight: 900; color: ${THEME.GOLD}; opacity: 0.4; min-width: 30px; }

                    .pagination-wrapper { text-align: center; margin-top: 30px; padding-bottom: 40px; }

                    /* RESPONSIVE DISPLAY CONTROL */
                    @media (max-width: 768px) {
                        .desktop-only { display: none; }
                        .mobile-only { display: block; }
                        .hero-modern { height: 350px; }
                        .main-content-wrapper { margin: 20px auto; padding: 0 15px; }
                        .sidebar-sticky { margin-top: 20px; }
                    }
                    @media (min-width: 769px) {
                        .desktop-only { display: block; }
                        .mobile-only { display: none; }
                    }
                `}</style>
            </div>
        </ConfigProvider>
    );
}