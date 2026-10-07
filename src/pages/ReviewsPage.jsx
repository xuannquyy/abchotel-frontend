import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Tag, Modal, Form, Input, notification, Tooltip, Popconfirm, Row, Col, Select, Rate, Grid } from 'antd';
import { Star, MagnifyingGlass, CheckCircle, XCircle, ChatText, Trash, PaperPlaneRight, UserCircle, Clock } from '@phosphor-icons/react';
import { reviewApi } from '../api/reviewApi';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid; // Thêm cái này để nhận diện mobile
const ACCENT_RED = '#8A1538';
const MIDNIGHT_BLUE = '#1C2E4A';
const PALETTE = {
  muted: '#7D92AD',
  lightest: '#E9F0F8',
};

export default function ReviewsPage() {
  const [searchText, setSearchText] = useState('');
  const [filterVisibility, setFilterVisibility] = useState('');
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const screens = useBreakpoint(); // Check màn hình
  const isMobile = !screens.md;

  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [form] = Form.useForm();

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await reviewApi.getAllAdminReviews(filterVisibility);
      setReviews(res || []);
    } catch (error) {
      notification.error({ message: 'Lỗi tải danh sách đánh giá', placement: 'bottomRight' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [filterVisibility]);

  const handleApprove = async (id) => {
    try {
      setLoading(true);
      await reviewApi.approveReview(id);
      notification.success({ message: 'Đã duyệt hiển thị đánh giá này!', placement: 'bottomRight' });
      fetchReviews();
    } catch (error) {
      notification.error({ message: 'Lỗi khi duyệt', placement: 'bottomRight' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      await reviewApi.deleteReview(id);
      notification.success({ message: 'Đã xóa bỏ đánh giá vi phạm!', placement: 'bottomRight' });
      fetchReviews();
    } catch (error) {
      notification.error({ message: 'Lỗi khi xóa đánh giá', placement: 'bottomRight' });
    } finally {
      setLoading(false);
    }
  };

  const openReplyModal = (review) => {
    setSelectedReview(review);
    form.setFieldsValue({ replyComment: review.replyComment });
    setIsReplyModalOpen(true);
  };

  const onReplyFinish = async (values) => {
    try {
      setLoading(true);
      await reviewApi.replyToReview(selectedReview.id, values.replyComment);
      notification.success({ message: 'Đã gửi phản hồi thành công!', placement: 'bottomRight' });
      setIsReplyModalOpen(false);
      fetchReviews();
    } catch (error) {
      notification.error({ message: 'Lỗi khi gửi phản hồi', placement: 'bottomRight' });
    } finally {
      setLoading(false);
    }
  };

  const displayedReviews = reviews.filter(r => 
    r.guestName.toLowerCase().includes(searchText.toLowerCase()) || 
    r.roomTypeName.toLowerCase().includes(searchText.toLowerCase())
  );

  // GIỮ NGUYÊN COLUMNS CỦA BÀ
  const columns = [
    {
      title: 'Khách hàng', dataIndex: 'guestName', key: 'guestName', width: 200,
      render: (text) => (
        <Space>
          <UserCircle size={28} color={PALETTE.muted} weight="fill" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Text strong style={{ color: MIDNIGHT_BLUE, fontSize: 14 }}>{text}</Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Đánh giá Loại phòng', dataIndex: 'roomTypeName', key: 'roomTypeName', width: 200,
      render: (text) => <Text style={{ color: '#52677D', fontWeight: 500 }}>{text}</Text>
    },
    {
      title: 'Rating', dataIndex: 'rating', key: 'rating', width: 150,
      render: (rating) => <Rate disabled defaultValue={rating} style={{ color: '#faad14', fontSize: 14 }} />
    },
    {
      title: 'Nội dung', dataIndex: 'comment', key: 'comment',
      render: (text, record) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: ' xem thêm' }} style={{ margin: 0, fontStyle: 'italic' }}>
            "{text}"
          </Paragraph>
          {record.replyComment && (
            <div style={{ backgroundColor: '#f9fbfd', padding: '8px 12px', borderLeft: `3px solid ${ACCENT_RED}`, borderRadius: '0 8px 8px 0' }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}><PaperPlaneRight size={12} style={{ marginRight: 4 }}/>Khách sạn phản hồi:</Text>
              <Text style={{ fontSize: 13, color: MIDNIGHT_BLUE }}>{record.replyComment}</Text>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Trạng thái Web', dataIndex: 'isVisible', key: 'isVisible', align: 'center', width: 150,
      render: (isVisible) => (
        isVisible 
          ? <Tag icon={<CheckCircle size={14}/>} color="success">Đang hiển thị</Tag> 
          : <Tag icon={<Clock size={14}/>} color="warning">Chờ duyệt</Tag>
      )
    },
    {
      title: 'Thao tác', key: 'actions', align: 'right', width: 150,
      render: (_, record) => (
        <Space size="small">
          {!record.isVisible && (
            <Tooltip title="Duyệt cho hiển thị lên Web">
              <Button type="text" icon={<CheckCircle size={20} color="#52c41a" />} onClick={() => handleApprove(record.id)} />
            </Tooltip>
          )}
          <Tooltip title="Trả lời khách">
            <Button type="text" icon={<ChatText size={20} color={MIDNIGHT_BLUE} />} onClick={() => openReplyModal(record)} />
          </Tooltip>
          <Popconfirm title="Đưa đánh giá này vào danh sách Spam/Vi phạm và ẩn hoàn toàn?" onConfirm={() => handleDelete(record.id)} okText="Đồng ý ẩn" cancelText="Hủy" placement="topRight">
            <Button type="text" danger icon={<Trash size={20} />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  // THÊM PHẦN CARD MOBILE (CHỈ HIỆN KHI MÀN HÌNH NHỎ)
  const renderMobileCards = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {displayedReviews.map(record => (
        <Card key={record.id} style={{ borderRadius: 12, border: '1px solid #f0f0f0' }} bodyStyle={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <Space>
              <UserCircle size={32} color={PALETTE.muted} weight="fill" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <Text strong style={{ color: MIDNIGHT_BLUE }}>{record.guestName}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{record.roomTypeName}</Text>
              </div>
            </Space>
            <div style={{ textAlign: 'right' }}>
               <Rate disabled defaultValue={record.rating} style={{ fontSize: 10, display: 'block' }} />
               {record.isVisible ? <Tag color="success" style={{ fontSize: 10, margin: 0 }}>Hiển thị</Tag> : <Tag color="warning" style={{ fontSize: 10, margin: 0 }}>Chờ</Tag>}
            </div>
          </div>
          <Paragraph italic style={{ fontSize: 14 }}>"{record.comment}"</Paragraph>
          {record.replyComment && (
            <div style={{ backgroundColor: '#f9fbfd', padding: 8, borderLeft: `3px solid ${ACCENT_RED}`, borderRadius: 4, marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 11 }}><PaperPlaneRight size={10}/> Phản hồi:</Text>
              <Text style={{ fontSize: 12, display: 'block' }}>{record.replyComment}</Text>
            </div>
          )}
          <div style={{ borderTop: '1px solid #f5f5f5', paddingTop: 12, textAlign: 'right' }}>
            <Space size="middle">
              {!record.isVisible && <Button type="text" icon={<CheckCircle size={22} color="#52c41a" />} onClick={() => handleApprove(record.id)} />}
              <Button type="text" icon={<ChatText size={22} color={MIDNIGHT_BLUE} />} onClick={() => openReplyModal(record)} />
              <Popconfirm title="Ẩn?" onConfirm={() => handleDelete(record.id)}><Button type="text" danger icon={<Trash size={22} />} /></Popconfirm>
            </Space>
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div style={{ padding: isMobile ? '8px' : '0' }}>
      <Title level={3} style={{ color: MIDNIGHT_BLUE, fontFamily: '"Source Serif 4", serif', marginBottom: 24 }}>Đánh Giá Từ Khách Hàng</Title>

      <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', marginBottom: 24 }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              {!isMobile && <Text style={{ color: '#52677D', fontSize: 15 }}>Kiểm duyệt và trả lời các đánh giá của khách hàng.</Text>}
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10 }}>
                <Input 
                  placeholder={isMobile ? "Tìm kiếm..." : "Tìm theo tên khách hoặc loại phòng..."} 
                  size="large"
                  prefix={<MagnifyingGlass color={PALETTE.muted} />}
                  style={{ width: isMobile ? '100%' : 300 }}
                  onChange={(e) => setSearchText(e.target.value)}
                />
                <Select 
                  size="large" 
                  style={{ width: isMobile ? '100%' : 180 }} 
                  placeholder="Lọc trạng thái"
                  allowClear
                  onChange={(val) => setFilterVisibility(val !== undefined ? val : '')}
                  options={[{ value: false, label: 'Chờ duyệt' }, { value: true, label: 'Đang hiển thị' }]}
                />
              </div>
            </Space>
          </Col>
          {!isMobile && (
            <Col md={8} style={{ textAlign: 'right' }}>
              <div style={{ padding: '12px 24px', backgroundColor: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8, display: 'inline-block', textAlign: 'left' }}>
                <Space><Star size={32} weight="fill" color="#faad14" /><div><Text strong style={{ color: '#d48806' }}>Quản lý Uy tín</Text></div></Space>
              </div>
            </Col>
          )}
        </Row>
      </Card>

      {/* TỰ ĐỘNG CHUYỂN GIỮA TABLE VÀ CARD */}
      {isMobile ? renderMobileCards() : (
        <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <Table columns={columns} dataSource={displayedReviews} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
        </Card>
      )}

      {/* MODAL TRẢ LỜI - GIỮ NGUYÊN 100% CỦA BÀ */}
      <Modal 
        title={<Space><ChatText size={24} color={MIDNIGHT_BLUE}/><Title level={4} style={{ color: MIDNIGHT_BLUE, margin: 0 }}>Phản hồi Đánh giá</Title></Space>} 
        open={isReplyModalOpen} 
        onCancel={() => setIsReplyModalOpen(false)} 
        footer={null} 
        centered
        width={isMobile ? '95%' : 500}
      >
        {selectedReview && (
          <div style={{ backgroundColor: '#f9fbfd', padding: 16, borderRadius: 8, marginBottom: 20, border: '1px dashed #d9d9d9' }}>
            <Text strong>{selectedReview.guestName}</Text> <Rate disabled defaultValue={selectedReview.rating} style={{ color: '#faad14', fontSize: 12, marginLeft: 8 }} />
            <Paragraph style={{ fontStyle: 'italic', marginTop: 8, color: '#52677D', marginBottom: 0 }}>"{selectedReview.comment}"</Paragraph>
          </div>
        )}
        <Form form={form} layout="vertical" onFinish={onReplyFinish}>
          <Form.Item name="replyComment" label="Khách sạn phản hồi:" rules={[{ required: true, message: 'Vui lòng nhập nội dung phản hồi' }]}>
            <Input.TextArea rows={4} placeholder="Ví dụ: Cảm ơn bạn đã tin tưởng..." />
          </Form.Item>
          <div style={{ textAlign: 'right', marginTop: 8 }}>
            <Space>
              <Button size="large" onClick={() => setIsReplyModalOpen(false)}>Hủy</Button>
              <Button size="large" type="primary" htmlType="submit" loading={loading} style={{ backgroundColor: MIDNIGHT_BLUE }} icon={<PaperPlaneRight />}>Gửi Phản Hồi</Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}