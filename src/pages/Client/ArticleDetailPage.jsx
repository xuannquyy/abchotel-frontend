import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Typography, Skeleton, Tag, Button, Result, Space, Row, Col, Anchor, Card, notification, Modal, Divider } from 'antd';
import { User, ArrowLeft, CalendarBlank, ListBullets, BellRinging, BookOpenText } from '@phosphor-icons/react';
import { articleApi } from '../../api/articleApi'; 
import { useSignalR } from '../../hooks/useSignalR';
import dayjs from 'dayjs';
import DOMPurify from 'dompurify';

const { Title, Text } = Typography;

const LUXURY_THEME = {
    PRIMARY: '#8A1538',
    NAVY: '#0D1821',
    GOLD: '#D4AF37'
};

export default function ArticleDetailPage() {
    const { slug } = useParams(); 
    const navigate = useNavigate();
    
    const [article, setArticle] = useState(null);
    const [relatedArticles, setRelatedArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toc, setToc] = useState([]);
    const [isExpended, setIsExpended] = useState(false); 
    const [processedContent, setProcessedContent] = useState('');

    const [mapModalOpen, setMapModalOpen] = useState(false);
    const [currentMapUrl, setCurrentMapUrl] = useState('');

    const handleContentClick = (e) => {
        const trigger = e.target.closest('.hotel-map-trigger');
        if (trigger) {
            e.preventDefault(); 
            const url = trigger.getAttribute('data-map-url');
            if (url) {
                setCurrentMapUrl(url);
                setMapModalOpen(true);
            }
        }
    };

    const fetchDetail = useCallback(async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const res = await articleApi.getArticleBySlug(slug);
            if (res) {
                setArticle(res);
                const allArticlesRes = await articleApi.getArticles(true);
                const dataArray = Array.isArray(allArticlesRes) ? allArticlesRes : [];
                const related = dataArray.filter(item => item.slug && item.slug !== slug).slice(0, 3);
                setRelatedArticles(related);

                if (res.content) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(res.content, 'text/html');
                    const headings = Array.from(doc.querySelectorAll('h2, h3'));
                    
                    // 🔥 LOGIC ĐÁNH SỐ TỰ ĐỘNG 
                    let h2Count = 0;
                    let h3Count = 0;

                    const tocData = headings.map((h, index) => {
                        const id = `heading-${index}`;
                        h.setAttribute('id', id);
                        
                        const isH2 = h.tagName.toLowerCase() === 'h2';
                        let prefix = "";

                        if (isH2) {
                            h2Count++;
                            h3Count = 0; // Reset đếm H3 khi gặp H2 mới
                            prefix = `${h2Count}. `;
                        } else {
                            h3Count++;
                            prefix = `${h2Count}.${h3Count}. `;
                        }

                        // 1. Dùng Regex lọc bỏ toàn bộ các số, dấu chấm và khoảng trắng do người dùng lỡ gõ tay ở đầu câu
                        const cleanText = h.innerText.replace(/^[\d\.\s]+/, '').trim();

                        // 2. Ghi đè lại nội dung thẻ H2/H3 trong bài viết để hiển thị số tự động cho đồng bộ
                        h.innerText = `${prefix}${cleanText}`;

                        return { 
                            key: id, 
                            href: `#${id}`, 
                            title: (
                                <span style={{ 
                                    fontWeight: isH2 ? '600' : '400',
                                    color: isH2 ? LUXURY_THEME.NAVY : '#57606a',
                                    fontSize: isH2 ? '15px' : '14px',
                                    paddingLeft: isH2 ? '0' : '12px',
                                    display: 'inline-block'
                                }}>
                                    {prefix}{cleanText}
                                </span>
                            )
                        };
                    });
                    setToc(tocData);
                    setProcessedContent(doc.body.innerHTML);
                }
            }
        } catch (err) {
            console.error("Lỗi fetch:", err);
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [slug]);

    useSignalR(useCallback((data) => {
        notification.info({
            message: data.title || 'Cập nhật hệ thống',
            description: data.content || 'Nội dung bài viết đã có sự thay đổi mới.',
            icon: <BellRinging color={LUXURY_THEME.GOLD} />,
            placement: 'bottomRight',
            style: { borderRadius: 0 }
        });
        fetchDetail(false);
    }, [fetchDetail]));

    useEffect(() => {
        if (slug) fetchDetail(true); 
        window.scrollTo(0, 0); 
    }, [slug, fetchDetail]);

    if (loading) return <div style={{ maxWidth: 900, margin: '100px auto', padding: '0 20px' }}><Skeleton active paragraph={{ rows: 15 }} /></div>;
    if (!article) return <Result status="404" title="Không tìm thấy bài viết" extra={<Button onClick={() => navigate('/article')}>Quay lại</Button>} />;

    return (
        <div style={{ backgroundColor: '#fff', minHeight: '100vh', padding: '10px 0' }}>
            <div className="article-container">
                
                <Button type="link" icon={<ArrowLeft />} onClick={() => navigate('/article')} style={{ color: LUXURY_THEME.PRIMARY, padding: 0, marginBottom: 15 }}>
                    Quay lại danh sách
                </Button>

                <Row gutter={[40, 30]}>
                    <Col xs={24} lg={17}>
                        <Title level={1} className="article-main-title">
                            {article.title}
                        </Title>

                        {article.shortDescription && (
                            <div 
                                className="short-desc-card" 
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.shortDescription.replace(/&nbsp;/g, ' ')) }} 
                            />
                        )}

                        <Space size="middle" wrap className="article-meta">
                            <Space><User size={18} /> <Text strong>{article.authorName || 'Quản trị viên'}</Text></Space>
                            <Space><CalendarBlank size={18} /> {dayjs(article.publishedAt).format('DD/MM/YYYY')}</Space>
                            <Tag color="volcano" style={{ margin: 0 }}>{article.categoryName}</Tag>
                        </Space>

                        {article.thumbnailUrl && (
                            <div className="featured-image-wrapper">
                                <img src={article.thumbnailUrl} style={{ width: '100%', display: 'block' }} alt="thumb" />
                            </div>
                        )}

                        {/* MỤC LỤC MOBILE */}
                        {toc.length > 0 && (
                            <div className="mobile-toc-wrapper">
                                <Card 
                                    size="small" 
                                    title={<Space><ListBullets size={20} /> <Text strong>MỤC LỤC BÀI VIẾT</Text></Space>}
                                    onClick={() => setIsExpended(!isExpended)}
                                    style={{ cursor: 'pointer', border: `1px solid ${LUXURY_THEME.GOLD}66` }}
                                    bodyStyle={{ display: isExpended ? 'block' : 'none', padding: '10px 20px' }}
                                >
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <Anchor affix={false} items={toc} targetOffset={80} />
                                    </div>
                                </Card>
                            </div>
                        )}

                        <div 
                            className="article-detail-content"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(processedContent) }}
                            onClick={handleContentClick}
                        />

                        {relatedArticles.length > 0 && (
                            <div style={{ marginTop: 60, paddingBottom: 40 }}>
                                <Divider orientation="left" style={{ borderColor: LUXURY_THEME.GOLD }}>
                                    <Space>
                                        <BookOpenText size={24} color={LUXURY_THEME.PRIMARY} />
                                        <Text strong className="related-title-text">
                                            BÀI VIẾT LIÊN QUAN
                                        </Text>
                                    </Space>
                                </Divider>
                                
                                <Row gutter={[20, 20]}>
                                    {relatedArticles.map(item => (
                                        <Col xs={24} sm={8} key={item.id}>
                                            <Link to={`/article/${item.slug}`}>
                                                <Card
                                                    hoverable
                                                    cover={<img alt={item.title} src={item.thumbnailUrl} style={{ height: 150, objectFit: 'cover' }} />}
                                                    bodyStyle={{ padding: '12px' }}
                                                    style={{ borderRadius: 0, overflow: 'hidden', height: '100%' }}
                                                >
                                                    <Text strong style={{ fontSize: 14, color: LUXURY_THEME.NAVY }} ellipsis={{ rows: 2 }}>
                                                        {item.title}
                                                    </Text>
                                                </Card>
                                            </Link>
                                        </Col>
                                    ))}
                                </Row>
                            </div>
                        )}
                    </Col>

                    {/* MỤC LỤC DESKTOP */}
                    <Col xs={0} lg={7}>
                        <div style={{ position: 'sticky', top: '100px', zIndex: 10 }}>
                            <Card 
                                size="small"
                                title={<Space><ListBullets size={20} weight="bold" /><Text strong>MỤC LỤC</Text></Space>}
                                styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}}
                                style={{ borderRadius: 0 }}
                            >
                                {toc.length > 0 ? <Anchor affix={false} targetOffset={100} items={toc} /> : <Text italic>Không có mục lục</Text>}
                            </Card>
                        </div>
                    </Col>
                </Row>
            </div>

            <Modal 
                title="📍 Bản đồ địa điểm" 
                open={mapModalOpen} 
                onCancel={() => setMapModalOpen(false)} 
                footer={null} width={800} centered destroyOnClose
            >
                <div className="map-iframe-container">
                    <iframe src={currentMapUrl} width="100%" height="100%" style={{ border: 0 }} allowFullScreen="" loading="lazy"></iframe>
                </div>
            </Modal>

            <style>{`
                .article-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 20px;
                }

                .article-main-title {
                    font-family: 'Playfair Display', serif !important;
                    font-size: clamp(24px, 6vw, 40px) !important;
                    color: ${LUXURY_THEME.NAVY} !important;
                    line-height: 1.2 !important;
                    margin-bottom: 20px !important;
                }

                .short-desc-card { 
                    padding: 20px; 
                    border-left: 4px solid ${LUXURY_THEME.GOLD}; 
                    background: #f8f9fa; 
                    margin-bottom: 30px; 
                    font-size: clamp(16px, 4vw, 18px); 
                    font-style: italic; 
                    font-family: 'Playfair Display', serif; 
                    word-break: break-word;
                    overflow-wrap: break-word;
                    white-space: normal;
                }

                .article-meta {
                    margin-bottom: 30px;
                    color: #64748B;
                    width: 100%;
                }

                .featured-image-wrapper {
                    margin-bottom: 30px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                }

                .article-detail-content { 
                    font-size: 17px; 
                    line-height: 1.8; 
                    color: #334155; 
                    word-wrap: break-word;
                }

                .article-detail-content img {
                    max-width: 100% !important;
                    height: auto !important;
                    margin: 20px 0;
                }

                .article-detail-content h2, .article-detail-content h3 { 
                    scroll-margin-top: 110px; 
                    color: ${LUXURY_THEME.NAVY}; 
                    margin-top: 1.5em; 
                    font-family: 'Playfair Display', serif; 
                    line-height: 1.3;
                }

                /* Tùy chỉnh Anchor của Ant Design */
                .ant-anchor-link-title { 
                    white-space: normal !important; 
                    line-height: 1.4 !important;
                    display: block !important;
                }
                
                /* Ẩn thanh ink nếu muốn mục lục sạch hơn */
                .ant-anchor-ink { display: block !important; background-color: ${LUXURY_THEME.GOLD} !important; }

                .mobile-toc-wrapper {
                    display: none;
                    margin-bottom: 30px;
                }

                .map-iframe-container {
                    width: 100%;
                    height: 450px;
                    background: #f1f5f9;
                    overflow: hidden;
                }

                @media (max-width: 991px) {
                    .mobile-toc-wrapper { display: block; }
                }

                * { border-radius: 0 !important; }
            `}</style>
        </div>
    );
}