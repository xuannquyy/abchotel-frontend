import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Row, Col, Card, Typography, Spin, Empty, Skeleton, 
  Space, Timeline, Grid, Tag, Badge, Table 
} from 'antd';
import { 
  Wallet, CalendarCheck, Article, Package, Receipt, ChatCenteredDots, 
  EyeSlash, ShieldCheck, Plus, Pencil, Trash, Crown, UsersThree, 
  TrendUp, WarningCircle, ClockClockwise, ChartBar, BellRinging, Table as TableIcon
} from '@phosphor-icons/react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { motion } from 'framer-motion';

import axiosClient from '../api/axiosClient';
import { useAuthStore } from '../store/authStore';
import { useSignalR } from '../hooks/useSignalR';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

// ===========================================================================
// BẢNG MÀU LUXURY 
// ===========================================================================
const THEME = {
  NAVY_MAX: '#0A1128',    
  NAVY_DARK: '#1C2E4A',   
  DARK_RED: '#8A1538',    
  GOLD: '#D4AF37',        
  MUTED: '#64748B',       
  BG_PAGE: '#F4F7FE',     
  CARD_BG: '#FFFFFF'      
};

const formatCurrency = (value) => new Intl.NumberFormat('vi-VN').format(value || 0);

// ===========================================================================
// 1. THẺ THỐNG KÊ
// ===========================================================================
const WidgetStatCard = ({ widget, data, loading }) => {
  if (!widget) return null;
  const isRevenue = widget.id.includes("REV");
  const value = data?.value || 0;
  const displayValue = isRevenue ? formatCurrency(value) + ' ₫' : new Intl.NumberFormat('vi-VN').format(value);

  return (
    <motion.div whileHover={{ y: -6, scale: 1.01 }} transition={{ duration: 0.3 }} style={{ height: '100%' }}>
      <Card 
        bordered={false} 
        style={{ borderRadius: 20, boxShadow: '0 10px 40px -10px rgba(28,46,74,0.06)', height: '100%', background: THEME.CARD_BG }}
        bodyStyle={{ padding: '24px 20px' }}
      >
        <Skeleton loading={loading && !data} active paragraph={{ rows: 1 }} title={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
              <Text style={{ fontSize: 12, color: THEME.MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                {widget.title}
              </Text>
              <div style={{ margin: '12px 0' }}>
                <Text style={{ fontSize: 26, fontWeight: 900, color: THEME.NAVY_MAX, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                  {displayValue}
                </Text>
              </div>
              {isRevenue && (
                <div style={{ display: 'inline-flex', alignItems: 'center', background: '#ecfdf5', color: '#10b981', padding: '4px 10px', borderRadius: 20, fontWeight: 700, fontSize: 11 }}>
                  <TrendUp weight="bold" style={{ marginRight: 4 }} /> +5.2%
                </div>
              )}
            </div>
            <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg, #F4F7FE 0%, #E9EDF7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5)' }}>
               {isRevenue ? <Wallet size={26} color={THEME.NAVY_DARK} weight="fill" /> : 
                widget.id.includes("BOOK") ? <CalendarCheck size={26} color={THEME.NAVY_DARK} weight="fill" /> : 
                <UsersThree size={26} color={THEME.NAVY_DARK} weight="fill" />}
            </div>
          </div>
        </Skeleton>
      </Card>
    </motion.div>
  );
};

// ===========================================================================
// 2. CẦN XỬ LÝ
// ===========================================================================
const WidgetActionAlerts = ({ widget, data, loading }) => {
  if (!widget) return null;
  const navigate = useNavigate();
  const alerts = [
    { key: 'lowInventory', label: 'Vật tư cạn', color: '#f59e0b', bg: '#fffbeb', icon: <Package size={24} weight="duotone" /> },
    { key: 'unpaidInvoices', label: 'Hóa đơn nợ', color: '#ef4444', bg: '#fef2f2', icon: <Receipt size={24} weight="duotone" /> },
    { key: 'unrepliedReviews', label: 'Đánh giá chờ', color: '#8b5cf6', bg: '#f5f3ff', icon: <ChatCenteredDots size={24} weight="duotone" /> },
    { key: 'unpublishedArticles', label: 'Bài viết nháp', color: '#3b82f6', bg: '#eff6ff', icon: <EyeSlash size={24} weight="duotone" /> },
  ];

  return (
    <Card 
      title={<Space><BellRinging size={22} color={THEME.DARK_RED} weight="fill"/><Text style={{fontSize: 16, fontWeight: 800, color: THEME.NAVY_MAX}}>{widget.title || "CẦN XỬ LÝ"}</Text></Space>}
      bordered={false} 
      style={{ borderRadius: 20, boxShadow: '0 10px 40px -10px rgba(28,46,74,0.06)', height: '100%' }}
      bodyStyle={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
    >
      <Skeleton loading={loading && !data} active paragraph={{ rows: 4 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {alerts.map(item => (
            <motion.div key={item.key} whileHover={{ scale: 1.04, y: -2 }} onClick={() => navigate('/admin/tasks')}
              style={{ padding: '16px 12px', background: item.bg, borderRadius: 16, textAlign: 'center', cursor: 'pointer', border: `1px solid ${item.bg.replace('f', 'e')}` }}
            >
              <div style={{ color: item.color, marginBottom: 8 }}>{item.icon}</div>
              <Text style={{ fontSize: 22, fontWeight: 900, color: item.color, lineHeight: 1 }}>{data?.[item.key] || 0}</Text>
              <br/><Text style={{ fontSize: 12, fontWeight: 700, color: item.color, opacity: 0.8, marginTop: 4, display: 'block' }}>{item.label}</Text>
            </motion.div>
          ))}
        </div>
      </Skeleton>
    </Card>
  );
};

// ===========================================================================
// 3. BIỂU ĐỒ DOANH THU 
// ===========================================================================
const WidgetRevenueBar = ({ widget, data, loading }) => {
  if (!widget) return null;
  return (
    <Card 
      title={<Space><ChartBar size={22} color={THEME.NAVY_DARK} weight="fill"/><Text style={{fontSize: 16, fontWeight: 800, color: THEME.NAVY_MAX}}>{widget.title}</Text></Space>}
      bordered={false} style={{ borderRadius: 20, boxShadow: '0 10px 40px -10px rgba(28,46,74,0.06)', height: '100%' }}
      bodyStyle={{ padding: '24px 20px 0 0' }}
    >
      <Skeleton loading={loading && !data} active paragraph={{ rows: 8 }}>
        <div style={{ height: 320, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data || []} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={THEME.NAVY_DARK} stopOpacity={1}/>
                  <stop offset="100%" stopColor={THEME.NAVY_DARK} stopOpacity={0.4}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: THEME.MUTED, fontWeight: 600 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: THEME.MUTED, fontWeight: 600 }} tickFormatter={v => `${v/1000000}M`} />
              <RechartsTooltip 
                cursor={{ fill: 'rgba(244,247,254,0.6)' }} 
                contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: '16px' }} 
                itemStyle={{ fontWeight: 800, color: THEME.NAVY_MAX }}
                formatter={(value) => [formatCurrency(value) + ' ₫', 'Doanh thu']}
              />
              <Bar dataKey="value" fill="url(#barGrad)" radius={[8, 8, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Skeleton>
    </Card>
  );
};

// ===========================================================================
// 4. BIỂU ĐỒ TRÒN 
// ===========================================================================
const WidgetCustomPie = ({ widget, data, loading }) => {
  if (!widget) return null;
  const PIE_COLORS = [THEME.NAVY_DARK, THEME.DARK_RED, THEME.GOLD, '#64748B', '#0EA5E9'];
  const processedData = (data || []).map((item, index) => ({ name: item.name, value: item.value, fill: PIE_COLORS[index % PIE_COLORS.length] }));
  const total = processedData.reduce((sum, i) => sum + i.value, 0);

  return (
    <Card 
      title={<Space><Crown size={22} color={THEME.GOLD} weight="fill"/><Text style={{fontSize: 16, fontWeight: 800, color: THEME.NAVY_MAX}}>{widget.title}</Text></Space>}
      bordered={false} style={{ borderRadius: 20, boxShadow: '0 10px 40px -10px rgba(28,46,74,0.06)', height: '100%' }}
      bodyStyle={{ padding: '24px 16px' }}
    >
      <Skeleton loading={loading && !data} active paragraph={{ rows: 6 }}>
        <div style={{ height: 320, width: '100%', position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={processedData} cx="50%" cy="45%" innerRadius={60} outerRadius={90} paddingAngle={6} dataKey="value" stroke="none" cornerRadius={8}>
                {processedData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
              </Pie>
              <RechartsTooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} itemStyle={{ fontWeight: 800 }} />
              <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontWeight: 600, color: THEME.NAVY_MAX, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
             <Text style={{ fontSize: 11, color: THEME.MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Tổng số</Text><br/>
             <Text style={{ fontSize: 28, fontWeight: 900, color: THEME.NAVY_MAX, lineHeight: 1 }}>{total}</Text>
          </div>
        </div>
      </Skeleton>
    </Card>
  );
};

// ===========================================================================
// 5. DATATABLE (RESPONSIVE SCROLL X 800)
// ===========================================================================
const WidgetDataTable = ({ widget, data, loading }) => {
  if (!widget) return null;
  const columns = [
    { title: 'MÃ ĐỊNH DANH', dataIndex: 'id', key: 'id', render: text => <Text style={{ color: THEME.COLD_BLUE, fontWeight: 800 }}>{text}</Text> },
    { title: 'ĐỐI TƯỢNG', dataIndex: 'name', key: 'name', render: text => <Text strong style={{ color: THEME.NAVY_MAX }}>{text}</Text> },
    { title: 'THÔNG TIN', dataIndex: 'info', key: 'info', render: text => <Text style={{ color: THEME.MUTED, fontWeight: 500 }}>{text}</Text> },
    { 
      title: 'TRẠNG THÁI', dataIndex: 'status', key: 'status',
      render: status => {
        let color = 'default', bg = '#F1F5F9', textCol = THEME.MUTED;
        if (['Paid', 'Confirmed', 'Clean'].includes(status)) { color = 'success'; bg = '#ecfdf5'; textCol = '#10b981'; }
        if (['Pending', 'Unpaid', 'Dirty'].includes(status)) { color = 'warning'; bg = '#fffbeb'; textCol = '#f59e0b'; }
        if (['Cancelled', 'Maintenance'].includes(status)) { color = 'error'; bg = '#fef2f2'; textCol = '#ef4444'; }
        return <div style={{ background: bg, color: textCol, padding: '4px 12px', borderRadius: 20, display: 'inline-block', fontWeight: 800, fontSize: 11 }}>{status?.toUpperCase()}</div>;
      }
    },
    { title: 'THỜI GIAN', dataIndex: 'date', key: 'date', render: date => <Text style={{ fontSize: 13, color: THEME.MUTED, fontWeight: 600 }}>{dayjs(date).format('HH:mm - DD/MM')}</Text> },
  ];

  return (
    <Card 
      title={<Space><TableIcon size={22} color={THEME.NAVY_DARK} weight="fill"/><Text style={{fontSize: 16, fontWeight: 800, color: THEME.NAVY_MAX}}>{widget.title}</Text></Space>} 
      bordered={false}
      style={{ borderRadius: 20, boxShadow: '0 10px 40px -10px rgba(28,46,74,0.06)', height: '100%' }}
      bodyStyle={{ padding: '0 24px 24px 24px' }}
    >
      {/* Thêm scroll x: 800 để chống méo bảng trên mobile */}
      <Table columns={columns} dataSource={data || []} loading={loading && !data} pagination={false} rowKey="id" size="middle" scroll={{ x: 800, y: 320 }} className="vip-table" />
    </Card>
  );
};

// ===========================================================================
// 6. LUỒNG HOẠT ĐỘNG
// ===========================================================================
const WidgetCreativeLogs = ({ widget, data, loading }) => {
  if (!widget) return null;
  const screens = useBreakpoint();
  const timelineItems = (data || []).map(act => {
    const isCreate = act.action?.includes('CREATE');
    const isDelete = act.action?.includes('DELETE');
    const color = isCreate ? '#10b981' : isDelete ? '#ef4444' : '#3b82f6';
    
    return {
      color: color,
      dot: <div style={{ width: 14, height: 14, borderRadius: '50%', background: color, border: '3px solid #fff', boxShadow: `0 0 0 2px ${color}40` }} />,
      children: (
        <div style={{ padding: '0 10px 24px 10px' }}>
          <Text style={{ color: THEME.NAVY_MAX, fontSize: 15, fontWeight: 800 }}>{act.actor}</Text>
          <div style={{ marginTop: 6 }}>
            <Text style={{ color: THEME.MUTED, fontSize: 13, lineHeight: 1.5 }}>{act.desc}</Text>
          </div>
          <div style={{ marginTop: 8 }}>
            <Tag color="default" style={{ borderRadius: 12, color: THEME.MUTED, border: 'none', background: '#F1F5F9', fontWeight: 600 }}>{dayjs(act.date).fromNow()}</Tag>
          </div>
        </div>
      )
    };
  });

  return (
    <Card 
      title={<Space><ClockClockwise size={22} color={THEME.NAVY_DARK} weight="bold"/><Text style={{fontSize: 16, fontWeight: 800, color: THEME.NAVY_MAX}}>{widget.title}</Text></Space>}
      bordered={false} style={{ borderRadius: 20, boxShadow: '0 10px 40px -10px rgba(28,46,74,0.06)' }}
      bodyStyle={{ padding: '24px 16px 8px 16px' }}
    >
      <Skeleton loading={loading && !data} active paragraph={{ rows: 8 }}>
        <div style={{ maxHeight: 600, overflowY: 'auto', paddingRight: 6 }} className="vip-scrollbar">
          {timelineItems.length > 0 ? (
            <Timeline mode={screens.md ? "alternate" : "left"} items={timelineItems} />
          ) : (
            <Empty description="Không có hoạt động" />
          )}
        </div>
      </Skeleton>
    </Card>
  );
};

// ===========================================================================
// TRẠM ĐIỀU KHIỂN CHÍNH
// ===========================================================================
export default function AdminDashboard() {
  const { user } = useAuthStore();
  const screens = useBreakpoint();
  const [dashboardConfig, setDashboardConfig] = useState(null);
  const [widgetData, setWidgetData] = useState({});
  const [loadingWidgets, setLoadingWidgets] = useState({});
  const [globalLoading, setGlobalLoading] = useState(true);
  const [lastSync, setLastSync] = useState(new Date());

  const fetchWidgetData = useCallback(async (id, endpoint) => {
    setLoadingWidgets(prev => ({ ...prev, [id]: true }));
    try {
      const res = await axiosClient.get(endpoint.replace('/api/', ''));
      setWidgetData(prev => ({ ...prev, [id]: res }));
    } catch (e) {} 
    finally { setLoadingWidgets(prev => ({ ...prev, [id]: false })); }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        setGlobalLoading(true);
        const config = await axiosClient.get('/Dashboard/config');
        setDashboardConfig(config);
        config.widgets.forEach(w => fetchWidgetData(w.id, w.apiEndpoint));
      } catch (e) {} finally { setGlobalLoading(false); }
    };
    init();
  }, [fetchWidgetData]);

  useSignalR((msg) => {
    if (msg?.startsWith("REFRESH_WIDGET_")) {
      const id = msg.replace("REFRESH_WIDGET_", "");
      const w = dashboardConfig?.widgets.find(x => x.id === id);
      if (w) fetchWidgetData(w.id, w.apiEndpoint);
    }
  });

  if (globalLoading) return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: THEME.BG_PAGE }}><Spin size="large" /></div>;

  const widgets = dashboardConfig?.widgets || [];
  const statWidgets = widgets.filter(w => w.type === 'StatisticCard');
  const alertWidget = widgets.find(w => w.type === 'ActionAlertGrid');
  const barWidget = widgets.find(w => w.type === 'BarChart');
  const pieWidgets = widgets.filter(w => w.type === 'PieChart' || w.type === 'RoleMembershipDist');
  const dataTableWidget = widgets.find(w => w.type === 'DataTable');
  const logWidget = widgets.find(w => w.type === 'ActivityFeed');

  return (
    // Điều chỉnh padding nhỏ lại trên mobile để tối ưu diện tích
    <div style={{ padding: screens.xs ? '16px 12px' : '32px', backgroundColor: THEME.BG_PAGE, minHeight: '100vh', fontFamily: "'Inter', sans-serif", overflowX: 'hidden' }}>
      
      {/* HEADER LUXURY RESPONSIVE: Thêm flexWrap và gap */}
      <div style={{ marginBottom: screens.xs ? 24 : 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ flex: '1 1 250px' }}>
          <Title level={screens.xs ? 3 : 2} style={{ margin: 0, fontWeight: 900, color: THEME.NAVY_MAX, letterSpacing: '-0.5px' }}>{dashboardConfig?.dashboardName}</Title>
          <Text style={{ fontSize: screens.xs ? 13 : 15, color: THEME.MUTED, fontWeight: 500, marginTop: 4, display: 'block' }}>
            Hệ thống quản trị cấp cao. Xin chào, <Text style={{color: THEME.DARK_RED, fontWeight: 800}}>{user?.fullName}</Text>.
          </Text>
        </div>
        <div style={{ background: '#fff', padding: '10px 20px', borderRadius: 30, boxShadow: '0 4px 15px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 12 }}>
           <Badge status="processing" color="#10b981" />
           <Text style={{ color: '#10b981', fontWeight: 800, fontSize: 13, letterSpacing: 1 }}>LIVE SYNC</Text>
        </div>
      </div>

      {/* KHỐI 1: THẺ SỐ LIỆU TỰ ĐỘNG CHIA LƯỚI */}
      {statWidgets.length > 0 && (
        <Row gutter={[screens.xs ? 16 : 24, screens.xs ? 16 : 24]} style={{ marginBottom: screens.xs ? 16 : 24 }}>
          {statWidgets.map((w, index) => {
            let lgCols = 8;
            if (statWidgets.length === 5 && index >= 3) lgCols = 12; 
            else if (statWidgets.length === 4) lgCols = 6;           
            else if (statWidgets.length < 4) lgCols = 24 / statWidgets.length; 
            return (
              <Col xs={24} lg={lgCols} key={w.id}>
                <WidgetStatCard widget={w} data={widgetData[w.id]} loading={loadingWidgets[w.id]} />
              </Col>
            );
          })}
        </Row>
      )}

      {/* KHỐI 2: CẦN XỬ LÝ & DOANH THU */}
      {(alertWidget || barWidget) && (
        <Row gutter={[screens.xs ? 16 : 24, screens.xs ? 16 : 24]} style={{ marginBottom: screens.xs ? 16 : 24 }} align="stretch">
          {alertWidget && (
            <Col xs={24} lg={barWidget ? 8 : 24}>
              <WidgetActionAlerts widget={alertWidget} data={widgetData[alertWidget.id]} loading={loadingWidgets[alertWidget.id]} />
            </Col>
          )}
          {barWidget && (
            <Col xs={24} lg={alertWidget ? 16 : 24}>
              <WidgetRevenueBar widget={barWidget} data={widgetData[barWidget.id]} loading={loadingWidgets[barWidget.id]} />
            </Col>
          )}
        </Row>
      )}

      {/* KHỐI 3: BIỂU ĐỒ TRÒN */}
      {pieWidgets.length > 0 && (
        <Row gutter={[screens.xs ? 16 : 24, screens.xs ? 16 : 24]} style={{ marginBottom: screens.xs ? 16 : 24 }} align="stretch">
          {pieWidgets.map(w => (
            <Col xs={24} lg={24 / pieWidgets.length} key={w.id}>
              <WidgetCustomPie widget={w} data={widgetData[w.id]} loading={loadingWidgets[w.id]} />
            </Col>
          ))}
        </Row>
      )}

      {/* KHỐI 4: BẢNG DỮ LIỆU ĐỘNG */}
      {dataTableWidget && (
        <Row gutter={[screens.xs ? 16 : 24, screens.xs ? 16 : 24]} style={{ marginBottom: screens.xs ? 16 : 24 }}>
          <Col span={24} style={{ overflow: 'hidden' }}>
            <WidgetDataTable widget={dataTableWidget} data={widgetData[dataTableWidget.id]} loading={loadingWidgets[dataTableWidget.id]} />
          </Col>
        </Row>
      )}

      {/* KHỐI 5: NHẬT KÝ ZICZAC CỘT SỐNG */}
      {logWidget && (
        <Row gutter={[screens.xs ? 16 : 24, screens.xs ? 16 : 24]}>
          <Col span={24}>
            <WidgetCreativeLogs widget={logWidget} data={widgetData[logWidget.id]} loading={loadingWidgets[logWidget.id]} />
          </Col>
        </Row>
      )}

      <style>{`
        /* Ẩn viền gai của Timeline, tạo cảm giác sạch sẽ */
        .ant-timeline-item-tail { border-inline-start: 2px solid #E2E8F0 !important; }
        .ant-timeline-item-content { top: -12px !important; }
        
        /* Bảng Table Cao Cấp - Có Horizontal Scroll cho Mobile */
        .vip-table .ant-table-wrapper { background: transparent; max-width: 100vw; }
        .vip-table .ant-table-thead > tr > th { background-color: transparent !important; color: #64748B; font-weight: 800; font-size: 12px; letter-spacing: 0.5px; border-bottom: 2px solid #E2E8F0; white-space: nowrap; }
        .vip-table .ant-table-tbody > tr > td { border-bottom: 1px solid #F1F5F9; padding: 16px 12px !important; white-space: nowrap; }
        .vip-table .ant-table-tbody > tr:hover > td { background-color: #F8FAFC !important; }

        /* Thanh cuộn tàng hình/siêu mảnh */
        .vip-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .vip-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .vip-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
        .vip-scrollbar::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
      `}</style>
    </div>
  );
}