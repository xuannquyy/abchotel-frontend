import React, { useState, useEffect } from 'react';
import { Card, Typography, Table, Tag, notification, Select, Input, Row, Col, Button, Popconfirm, Tooltip, Grid, DatePicker, Statistic, Dropdown, Modal, Image, Divider, Space } from 'antd';
import { WarningCircle, CheckCircle, XCircle, MagnifyingGlass, HandCoins, Info, Money, CalendarBlank, ClockClockwise, ThumbsUp, ShieldWarning, DotsThreeOutlineVertical, ArrowsClockwise, HandDeposit } from '@phosphor-icons/react';
import dayjs from 'dayjs';

import { lossDamageApi } from '../api/lossDamageApi';
import { COLORS } from '../constants/theme';
import { useAuthStore } from '../store/authStore';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;

export default function LossDamagesPage() {
  // 🔥 Đã cấu hình thông báo cá nhân luôn nằm ở góc dưới bên phải (bottomRight)
  const [api, contextHolder] = notification.useNotification({ placement: 'bottomRight' });
  const screens = useBreakpoint();
  
  const { user } = useAuthStore();
  const userPermissions = user?.Permission || user?.permissions || []; 
  const canManageInvoices = userPermissions.includes('MANAGE_INVOICES');

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  const [summary, setSummary] = useState({
    totalIncidents: 0,
    pendingAmount: 0,
    paidAmount: 0,
    lastUpdated: null
  });

  const [filter, setFilter] = useState({
    search: '',
    status: undefined, 
    issueType: undefined, 
    startDate: null,
    endDate: null,
    page: 1,
    pageSize: 10
  });

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await lossDamageApi.getReports({
        ...filter,
        startDate: filter.startDate ? filter.startDate.format('YYYY-MM-DD') : undefined,
        endDate: filter.endDate ? filter.endDate.format('YYYY-MM-DD') : undefined,
      });

      const items = res.items || [];
      setReports(items);
      setTotalItems(res.total || 0);

      // Phân tách số tiền dự kiến và thực thu
      const pendingSum = items.filter(i => ['PENDING', 'CONFIRMED', 'DISPUTED'].includes(i.status?.toUpperCase()))
                              .reduce((sum, i) => sum + (i.penaltyAmount || 0), 0);
      const paidSum = items.filter(i => i.status?.toUpperCase() === 'PAID')
                           .reduce((sum, i) => sum + (i.penaltyAmount || 0), 0);

      setSummary({
        totalIncidents: res.total || 0,
        pendingAmount: pendingSum,
        paidAmount: paidSum,
        lastUpdated: new Date()
      });
    } catch (error) {
      api.error({ title: 'Lỗi', description: 'Không thể tải danh sách báo cáo.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const handleFilterChange = (key, value) => {
    setFilter(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleDateRangeChange = (dates) => {
    if (dates) {
      setFilter(prev => ({ ...prev, startDate: dates[0], endDate: dates[1], page: 1 }));
    } else {
      setFilter(prev => ({ ...prev, startDate: null, endDate: null, page: 1 }));
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      setLoading(true);
      await lossDamageApi.updateStatus(id, newStatus);
      api.success({ title: 'Thành công', description: `Đã chuyển trạng thái thành: ${newStatus}` });
      fetchReports(); 
    } catch (error) {
      api.error({ title: 'Lỗi', description: 'Không thể cập nhật trạng thái.' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = (record) => {
    setSelectedReport(record);
    setIsDetailModalOpen(true);
  };

  const getStatusTag = (status) => {
    switch (status?.toUpperCase()) {
      case 'PENDING': return <Tag color="warning" icon={<WarningCircle />}>Chờ xử lý</Tag>;
      case 'CONFIRMED': return <Tag color="processing" icon={<ThumbsUp />}>Khách xác nhận</Tag>;
      case 'DISPUTED': return <Tag color="error" icon={<ShieldWarning />}>Khách tranh chấp</Tag>;
      case 'PAID': return <Tag color="success" icon={<CheckCircle />}>Đã thanh toán</Tag>;
      case 'CANCELLED': return <Tag color="default" icon={<XCircle />}>Đã hủy bỏ</Tag>;
      default: return <Tag>{status}</Tag>;
    }
  };

  // Menu Hành động linh hoạt
  const getActionMenu = (record) => {
    const currentStatus = record.status?.toUpperCase();
    const actionItems = [];

    if (currentStatus === 'PENDING') {
      actionItems.push({ key: 'CONFIRMED', label: 'Xác nhận sự cố', icon: <ThumbsUp size={16} color="#1890ff" /> });
      actionItems.push({ key: 'DISPUTED', label: 'Khách tranh chấp', icon: <ShieldWarning size={16} color="#ff4d4f" /> });
    }
    
    if (['PENDING', 'CONFIRMED', 'DISPUTED'].includes(currentStatus)) {
      if(actionItems.length > 0) actionItems.push({ type: 'divider' });
      actionItems.push({ key: 'PAID', label: 'Thu tiền trực tiếp', icon: <HandCoins size={16} color="#52c41a" /> });
      actionItems.push({ key: 'CANCELLED', label: 'Hủy báo cáo', icon: <XCircle size={16} color="#ff4d4f" />, danger: true });
    }

    return actionItems;
  };

  const columns = [
    {
      title: 'Mã / Ngày báo',
      key: 'info',
      render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Text strong>#{record.id}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {new Date(record.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </div>
      )
    },
    {
      title: 'Phòng & Khách',
      key: 'room',
      render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Text strong style={{ color: COLORS.MIDNIGHT_BLUE }}>Phòng: {record.roomNumber || 'N/A'}</Text>
          <Text type="secondary" style={{ fontSize: 13 }}>Khách: {record.customerName || 'N/A'}</Text>
        </div>
      )
    },
    {
      title: 'Sự cố',
      key: 'equipment',
      render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <Text strong>{record.equipmentName}</Text>
          {record.issueType?.toUpperCase() === 'LOST' 
            ? <Tag color="magenta" style={{marginTop: 4}}>Mất mát</Tag> 
            : <Tag color="orange" style={{marginTop: 4}}>Hư hỏng</Tag>}
        </div>
      )
    },
    {
      title: 'Phí đền bù',
      dataIndex: 'penaltyAmount',
      align: 'right',
      render: (amount) => <Text strong style={{ color: COLORS.ACCENT_RED, fontSize: 15 }}>{new Intl.NumberFormat('vi-VN').format(amount || 0)} đ</Text>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      align: 'center',
      render: (status) => getStatusTag(status)
    },
    {
      title: 'Hành động',
      key: 'action',
      align: 'right',
      render: (_, record) => {
        const actionItems = getActionMenu(record);
        return (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {canManageInvoices && actionItems.length > 0 && (
              <Dropdown menu={{ items: actionItems, onClick: ({ key }) => handleUpdateStatus(record.id, key) }} trigger={['click']}>
                <Button type="primary" style={{ backgroundColor: COLORS.MIDNIGHT_BLUE }}>
                  Xử lý <DotsThreeOutlineVertical weight="fill" />
                </Button>
              </Dropdown>
            )}
            <Tooltip title="Xem chi tiết sự cố">
              <Button icon={<Info size={18} />} onClick={() => handleOpenDetail(record)} />
            </Tooltip>
          </div>
        );
      }
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: 24 }}>
      {contextHolder}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={3} style={{ color: COLORS.MIDNIGHT_BLUE, margin: '0 0 8px 0', fontFamily: '"Source Serif 4", serif' }}>
            <WarningCircle size={28} style={{ verticalAlign: 'middle', marginRight: 8, color: COLORS.ACCENT_RED }} />
            Báo cáo Hư hỏng & Mất mát
          </Title>
          <Text type="secondary">Quản lý các sự cố về tài sản phòng do khách hàng gây ra.</Text>
        </div>
        
        {/* NÚT LÀM MỚI DỮ LIỆU */}
        <Space>
          <Text type="secondary" style={{ marginRight: 8 }}>
            Cập nhật: {summary.lastUpdated ? dayjs(summary.lastUpdated).format('HH:mm:ss') : '--'}
          </Text>
          <Tooltip title="Làm mới dữ liệu">
            <Button 
              type="primary" 
              icon={<ArrowsClockwise size={20} />} 
              onClick={fetchReports} 
              loading={loading}
              style={{ backgroundColor: COLORS.MIDNIGHT_BLUE }}
            />
          </Tooltip>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: `4px solid ${COLORS.MIDNIGHT_BLUE}` }}>
            <Statistic 
              title={<span style={{ fontWeight: 600, color: COLORS.MUTED }}>Tổng số sự cố (Theo bộ lọc)</span>}
              value={summary.totalIncidents}
              prefix={<CalendarBlank size={24} color={COLORS.MIDNIGHT_BLUE} style={{ marginRight: 8 }}/>}
              styles={{ content: { color: COLORS.DARKEST, fontWeight: 'bold' } }} 
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: `4px solid #8A1538` }}>
            <Statistic 
              title={<span style={{ fontWeight: 600, color: COLORS.MUTED }}>Dự kiến thu (Chưa thanh toán)</span>}
              value={summary.pendingAmount}
              prefix={<HandDeposit size={24} color="#8A1538" style={{ marginRight: 8 }} />}
              suffix="₫"
              styles={{ content: { color: '#8A1538', fontWeight: 'bold' } }}
              formatter={value => new Intl.NumberFormat('vi-VN').format(value)}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: `4px solid #B4CDED` }}>
            <Statistic 
              title={<span style={{ fontWeight: 600, color: COLORS.MUTED }}>Thực thu (Đã thanh toán)</span>}
              value={summary.paidAmount}
              prefix={<Money size={24} color="#B4CDED" style={{ marginRight: 8 }} />}
              suffix="₫"
              styles={{ content: { color: '#B4CDED', fontWeight: 'bold' } }}
              formatter={value => new Intl.NumberFormat('vi-VN').format(value)}
            />
          </Card>
        </Col>
      </Row>

      <Card variant="borderless" style={{ borderRadius: 12, marginBottom: 24, backgroundColor: COLORS.LIGHTEST }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={6}>
            <Input 
              placeholder="Tìm số phòng hoặc khách..." 
              size="large" 
              allowClear
              prefix={<MagnifyingGlass color={COLORS.MUTED} />}
              value={filter.search} 
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </Col>
          <Col xs={24} md={6}>
            <RangePicker 
              size="large" 
              style={{ width: '100%' }} 
              placeholder={['Từ ngày', 'Đến ngày']}
              format="DD/MM/YYYY"
              value={[filter.startDate, filter.endDate]}
              onChange={handleDateRangeChange}
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              size="large" 
              style={{ width: '100%' }} 
              placeholder="Lọc theo Loại sự cố"
              allowClear
              value={filter.issueType} 
              onChange={(val) => handleFilterChange('issueType', val)}
              options={[
                { value: 'DAMAGE', label: 'Bị hư hỏng' },
                { value: 'LOST', label: 'Bị mất mát' }
              ]}
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              size="large" 
              style={{ width: '100%' }} 
              placeholder="Trạng thái xử lý"
              allowClear
              value={filter.status} 
              onChange={(val) => handleFilterChange('status', val)}
              options={[
                { value: 'Pending', label: 'Chờ xử lý' },
                { value: 'Confirmed', label: 'Khách xác nhận' },
                { value: 'Disputed', label: 'Khách tranh chấp' },
                { value: 'Paid', label: 'Đã đền bù' },
                { value: 'Cancelled', label: 'Đã hủy' }
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Card variant="borderless" style={{ borderRadius: 12, border: `1px solid ${COLORS.LIGHTEST}`, flex: 1, padding: screens.md ? '0' : '16px 0' }}>
        {screens.md ? (
          <Table 
            dataSource={reports} 
            rowKey="id" 
            loading={loading}
            scroll={{ x: 1000 }} 
            pagination={{ 
              current: filter.page, 
              pageSize: filter.pageSize, 
              total: totalItems,
              showSizeChanger: true,
              onChange: (page, pageSize) => setFilter(prev => ({ ...prev, page, pageSize }))
            }}
            columns={columns}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 12px' }}>
            {reports.map(item => {
               const actionItems = getActionMenu(item);
               return (
                <div key={item.id} style={{ background: '#fff', border: `1px solid ${COLORS.LIGHTEST}`, borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <Text strong style={{ fontSize: 16, display: 'block' }}>#{item.id} - {item.roomNumber || 'N/A'}</Text>
                      <Text type="secondary" style={{ fontSize: 13 }}>{dayjs(item.createdAt).format('HH:mm DD/MM/YYYY')}</Text>
                    </div>
                    {getStatusTag(item.status)}
                  </div>
                  
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Khách: <Text strong>{item.customerName}</Text></Text>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong>{item.equipmentName} {item.issueType?.toUpperCase() === 'LOST' ? '(Mất)' : '(Hư hỏng)'}</Text>
                      <Text strong style={{ color: COLORS.ACCENT_RED, fontSize: 15 }}>{new Intl.NumberFormat('vi-VN').format(item.penaltyAmount || 0)} đ</Text>
                    </div>
                  </div>

                  <Divider style={{ margin: '12px 0' }} />
                  
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <Button icon={<Info size={18} />} onClick={() => handleOpenDetail(item)}>Chi tiết</Button>
                    
                    {canManageInvoices && actionItems.length > 0 && (
                      <Dropdown menu={{ items: actionItems, onClick: ({ key }) => handleUpdateStatus(item.id, key) }} trigger={['click']}>
                        <Button type="primary" style={{ backgroundColor: COLORS.MIDNIGHT_BLUE }}>
                          Xử lý <DotsThreeOutlineVertical weight="fill" />
                        </Button>
                      </Dropdown>
                    )}
                  </div>
                </div>
               );
            })}
          </div>
        )}
      </Card>

      <Modal
        title={<span style={{color: COLORS.DARKEST, fontSize: 18}}>Chi tiết Báo cáo sự cố #{selectedReport?.id}</span>}
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsDetailModalOpen(false)} style={{ backgroundColor: COLORS.MIDNIGHT_BLUE }}>
            Đóng
          </Button>
        ]}
        width={600}
      >
        {selectedReport && (
          <div style={{ padding: '16px 0' }}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text type="secondary">Phòng:</Text><br/>
                <Text strong style={{ fontSize: 16 }}>{selectedReport.roomNumber}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">Khách hàng:</Text><br/>
                <Text strong style={{ fontSize: 16 }}>{selectedReport.customerName}</Text>
              </Col>
              
              <Col span={24}><Divider style={{ margin: '8px 0' }} /></Col>

              <Col span={12}>
                <Text type="secondary">Vật tư gặp sự cố:</Text><br/>
                <Text strong>{selectedReport.equipmentName} <Tag color="blue">{selectedReport.quantity} món</Tag></Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">Phân loại sự cố:</Text><br/>
                {selectedReport.issueType?.toUpperCase() === 'LOST' ? <Tag color="magenta">Mất mát</Tag> : <Tag color="orange">Hư hỏng</Tag>}
              </Col>

              <Col span={12}>
                <Text type="secondary">Người lập báo cáo:</Text><br/>
                <Text strong>{selectedReport.reportedByName}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">Trạng thái hiện tại:</Text><br/>
                {getStatusTag(selectedReport.status)}
              </Col>

              <Col span={24}><Divider style={{ margin: '8px 0' }} /></Col>

              <Col span={24}>
                <Text type="secondary">Số tiền phạt:</Text><br/>
                <Text strong style={{ color: COLORS.ACCENT_RED, fontSize: 20 }}>{new Intl.NumberFormat('vi-VN').format(selectedReport.penaltyAmount || 0)} đ</Text>
              </Col>

              <Col span={24}>
                <Text type="secondary">Ghi chú từ nhân viên:</Text><br/>
                <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: 8, marginTop: 4, fontStyle: 'italic' }}>
                  <Text>{selectedReport.description || 'Không có ghi chú thêm.'}</Text>
                </div>
              </Col>

              {selectedReport.evidenceImageUrl && (
                <Col span={24} style={{ marginTop: 12 }}>
                  <Text type="secondary">Hình ảnh minh chứng:</Text><br/>
                  <Image src={selectedReport.evidenceImageUrl} style={{ maxHeight: 250, objectFit: 'cover', borderRadius: 8, marginTop: 8, border: '1px solid #e8e8e8' }} />
                </Col>
              )}
            </Row>
          </div>
        )}
      </Modal>

    </div>
  );
}