import React, { useState, useEffect } from 'react';
import { Card, Typography, Table, Tag, notification, Input, Row, Col, Button, Popconfirm, Tooltip, Grid, Space, Divider, Image, Select } from 'antd';
import { MagnifyingGlass, Plus, PencilSimple, Trash, Eye, EyeSlash, Article, ImageSquare, CheckCircle, ArrowLeft } from '@phosphor-icons/react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { articleApi } from '../../api/articleApi';   
import { categoryApi } from '../../api/categoryApi';
import { COLORS } from '../../constants/theme';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function ArticleManagementPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryCategoryId = searchParams.get('category'); 

  const [api, contextHolder] = notification.useNotification({ placement: 'bottomRight' });
  const screens = useBreakpoint();

  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);

  const [search, setSearch] = useState('');
  const [filterPub, setFilterPub] = useState(null);
  const [filterCat, setFilterCat] = useState(queryCategoryId ? parseInt(queryCategoryId) : null);

  useEffect(() => {
    categoryApi.getCategories(true).then(res => setCategories(res || []));
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const res = await articleApi.getArticles(false, filterCat); 
      setArticles(res.items || res || []);
    } catch (error) {
      api.error({ title: 'Lỗi', description: 'Không tải được bài viết.' }); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
    if (filterCat) {
      setSearchParams({ category: filterCat });
    } else {
      setSearchParams({});
    }
  }, [filterCat]); 

  const handleTogglePublish = async (id) => {
    try {
      setLoading(true);
      await articleApi.togglePublish(id); 
      api.success({ title: 'Thành công', description: 'Đã đổi trạng thái xuất bản.' }); 
      fetchArticles();
    } catch (error) {
      api.error({ title: 'Lỗi', description: 'Cập nhật thất bại.' }); 
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      await articleApi.deleteArticle(id); 
      api.success({ title: 'Thành công', description: 'Đã thay đổi trạng thái Ẩn/Hiện bài viết.' }); 
      fetchArticles();
    } catch (error) {
      api.error({ title: 'Lỗi', description: 'Thao tác thất bại.' }); 
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = articles
    .filter(a => {
      const matchSearch = a.title.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterPub === null || (a.publishedAt != null) === filterPub;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => b.isActive === a.isActive ? 0 : a.isActive ? -1 : 1);

  return (
    <div style={{ paddingBottom: 24 }}>
      {contextHolder}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <Title level={3} style={{ color: COLORS.MIDNIGHT_BLUE, margin: 0, fontFamily: '"Source Serif 4", serif' }}>
          <Article size={28} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Quản lý Bài viết
        </Title>

        <Space>
          <Button size="large" icon={<ArrowLeft />} onClick={() => navigate('/admin/categories')}>
            Danh Mục
          </Button>
          <Button type="primary" size="large" icon={<Plus />} style={{ backgroundColor: COLORS.MIDNIGHT_BLUE }} onClick={() => navigate(filterCat ? `/admin/articles/editor?category=${filterCat}` : `/admin/articles/editor`)}>
            Viết Bài Mới
          </Button>
        </Space>
      </div>

      <Card variant="borderless" style={{ borderRadius: 12, border: `1px solid ${COLORS.LIGHTEST}` }}>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={10}><Input placeholder="Tìm tiêu đề bài viết..." size="large" prefix={<MagnifyingGlass color={COLORS.MUTED} />} value={search} onChange={e => setSearch(e.target.value)} allowClear /></Col>
          <Col xs={24} md={7}>
            <Select size="large" style={{ width: '100%' }} placeholder="Lọc theo Danh mục" allowClear value={filterCat} onChange={setFilterCat} options={categories.map(c => ({ label: c.name, value: c.id }))} />
          </Col>
          <Col xs={24} md={7}>
            <Select size="large" style={{ width: '100%' }} placeholder="Lọc xuất bản" allowClear value={filterPub} onChange={setFilterPub} options={[{ label: 'Đã xuất bản', value: true }, { label: 'Bản nháp', value: false }]} />
          </Col>
        </Row>

        {screens.md ? (
          <Table 
            dataSource={filteredArticles} rowKey="id" loading={loading} rowClassName={r => !r.isActive ? 'inactive-row' : ''}
            columns={[
              { title: 'Ảnh bìa', dataIndex: 'thumbnailUrl', width: 100, align: 'center', render: url => url ? <Image src={url} width={60} height={40} style={{objectFit: 'cover', borderRadius: 4}} /> : <div style={{width: 60, height: 40, background: '#e8e8e8', borderRadius: 4}} /> },
              { title: 'Tiêu đề', dataIndex: 'title', render: (text, record) => <Text strong style={{ color: record.isActive ? COLORS.MIDNIGHT_BLUE : COLORS.MUTED }}>{text}</Text> },
              { title: 'Danh mục', dataIndex: 'categoryName', render: text => <Tag>{text || 'Chưa phân loại'}</Tag> },
              { title: 'Trạng thái', dataIndex: 'isActive', align: 'center', render: (_, record) => !record.isActive ? <Tag color="error">Bị ẩn/Xóa</Tag> : (record.publishedAt ? <Tag color="blue">Đã xuất bản</Tag> : <Tag color="default">Bản nháp</Tag>) },
              { title: 'Ngày tạo', dataIndex: 'createdAt', render: date => date ? new Date(date).toLocaleDateString('vi-VN') : 'N/A' },
              { 
                title: 'Hành động', key: 'action', align: 'right', width: 160,
                render: (_, record) => (
                  <Space size="small">
                    <Tooltip title="Chuyển xuất bản/nháp"><Button type="dashed" icon={record.publishedAt ? <EyeSlash size={16} /> : <CheckCircle size={16} />} onClick={() => handleTogglePublish(record.id)} disabled={!record.isActive} /></Tooltip>
                    <Tooltip title="Chỉnh sửa"><Button type="primary" style={{ backgroundColor: record.isActive ? COLORS.MIDNIGHT_BLUE : COLORS.MUTED }} icon={<PencilSimple size={16} />} onClick={() => navigate(`/admin/articles/editor/${record.id}?category=${filterCat || ''}`)} disabled={!record.isActive} /></Tooltip>
                    <Popconfirm title={record.isActive ? "Ẩn bài viết này?" : "Phục hồi bài viết?"} onConfirm={() => handleDelete(record.id)}>
                      <Button danger={record.isActive} type={!record.isActive ? "primary" : "default"} icon={record.isActive ? <Trash size={16} /> : <Eye size={16} />} />
                    </Popconfirm>
                  </Space>
                ) 
              }
            ]}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredArticles.map(art => (
              <div key={art.id} style={{ padding: 16, border: '1px solid #f0f0f0', borderRadius: 8, background: art.isActive ? '#fff' : '#f5f5f5', opacity: art.isActive ? 1 : 0.65 }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                  {art.thumbnailUrl ? <Image src={art.thumbnailUrl} width={60} height={60} style={{objectFit: 'cover', borderRadius: 6}} /> : <div style={{width: 60, height: 60, background: '#e8e8e8', borderRadius: 6}} />}
                  <div style={{ flex: 1 }}>
                    <Text strong style={{ color: COLORS.MIDNIGHT_BLUE, display: 'block', marginBottom: 4 }}>{art.title}</Text>
                    {!art.isActive ? <Tag color="error">Bị ẩn/Xóa</Tag> : (art.publishedAt ? <Tag color="blue">Xuất bản</Tag> : <Tag color="default">Nháp</Tag>)}
                  </div>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <Button size="small" icon={art.publishedAt ? <EyeSlash/> : <CheckCircle/>} onClick={() => handleTogglePublish(art.id)} disabled={!art.isActive} />
                  <Button size="small" type="primary" style={{ backgroundColor: art.isActive ? COLORS.MIDNIGHT_BLUE : COLORS.MUTED }} icon={<PencilSimple/>} onClick={() => navigate(`/admin/articles/editor/${art.id}?category=${filterCat || ''}`)} disabled={!art.isActive}>Sửa</Button>
                  <Popconfirm title="Đổi trạng thái?" onConfirm={() => handleDelete(art.id)}>
                    <Button size="small" danger={art.isActive} type={!art.isActive ? "primary" : "default"} icon={art.isActive ? <Trash/> : <Eye/>} />
                  </Popconfirm>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <style>{`.inactive-row { opacity: 0.55; background-color: #f9f9f9; }`}</style>
    </div>
  );
}