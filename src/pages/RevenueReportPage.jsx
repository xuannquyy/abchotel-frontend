import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, DatePicker, Button, Table, Tag, Statistic, notification, Grid, Space, Empty } from 'antd';
import { 
  ChartBar, DownloadSimple, Wallet, Money, ShoppingCart, WarningCircle, ArrowRight, CalendarBlank 
} from '@phosphor-icons/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx'; // Thư viện xuất Excel

import axiosClient from '../api/axiosClient';
import { useSignalR } from '../hooks/useSignalR';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;

// 🔥 TÔNG MÀU CHỦ ĐẠO YÊU CẦU: XANH DƯƠNG ĐEN & ĐỎ SẪM
const THEME = {
  NAVY_DARK: '#0D1821',   // Đen nhám
  NAVY_LIGHT: '#1C2E4A',  // Xanh dương đen
  DARK_RED: '#8A1538',    // Đỏ sẫm
  GOLD: '#D4AF37',
  WHITE: '#FFFFFF',
  LIGHT_BLUE: '#E9F0F8',
  MUTED: '#7D92AD'
};

const PIE_COLORS = [THEME.NAVY_LIGHT, THEME.DARK_RED, THEME.GOLD];

export default function RevenueReportPage() {
  const screens = useBreakpoint();
  const [api, contextHolder] = notification.useNotification();
  const [loading, setLoading] = useState(false);
  
  // Mặc định xem tháng hiện tại
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  
  const [reportData, setReportData] = useState({
    kpis: { totalRevenue: 0, roomRevenue: 0, serviceRevenue: 0, damageRevenue: 0 },
    chartData: [],
    pieData: [],
    recentTransactions: []
  });

  const fetchReport = async (isSilent = false) => {
    if (!dateRange || dateRange.length < 2) return;
    try {
      if (!isSilent) setLoading(true);
      // Gọi API báo cáo với khoảng thời gian
      const res = await axiosClient.get('/Reports/revenue', {
        params: {
          startDate: dateRange[0].format('YYYY-MM-DD'),
          endDate: dateRange[1].format('YYYY-MM-DD')
        }
      });
      setReportData(res.data || res);
    } catch (error) {
      if (!isSilent) api.error({ message: 'Lỗi tải báo cáo', description: 'Vui lòng kiểm tra lại kết nối Backend.' });
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, [dateRange]);

  // 🔥 SIGNAL R: Tự động cập nhật biểu đồ khi Lễ tân thu tiền xong!
  useSignalR((notif) => {
    if (notif.permission === "MANAGE_INVOICES") {
      fetchReport(true); // Load ngầm, không hiện xoay loading làm phiền sếp
    }
  });

  // 🔥 HÀM XUẤT EXCEL CHUYÊN NGHIỆP
  const handleExportExcel = () => {
    try {
      // 1. Tạo Workbook
      const wb = XLSX.utils.book_new();

      // 2. Sheet 1: Tổng quan KPI
      const wsKpiData = [
        ['BÁO CÁO DOANH THU KHÁCH SẠN ABC'],
        [`Từ ngày: ${dateRange[0].format('DD/MM/YYYY')} - Đến ngày: ${dateRange[1].format('DD/MM/YYYY')}`],
        [], // Dòng trống
        ['HẠNG MỤC', 'DOANH THU (VNĐ)'],
        ['Tổng doanh thu', reportData.kpis.totalRevenue],
        ['Doanh thu Tiền phòng', reportData.kpis.roomRevenue],
        ['Doanh thu Dịch vụ', reportData.kpis.serviceRevenue],
        ['Thu Phạt/Đền bù', reportData.kpis.damageRevenue]
      ];
      const wsKpi = XLSX.utils.aoa_to_sheet(wsKpiData);
      wsKpi['!cols'] = [{ wch: 25 }, { wch: 20 }]; // Chỉnh độ rộng cột
      XLSX.utils.book_append_sheet(wb, wsKpi, "Tổng quan");

      // 3. Sheet 2: Danh sách giao dịch chi tiết
      const wsTransData = [
        ['MÃ HĐ', 'KHÁCH HÀNG', 'TỔNG TIỀN (VNĐ)', 'NGÀY THU', 'TRẠNG THÁI']
      ];
      reportData.recentTransactions.forEach(item => {
        wsTransData.push([
          `INV-${item.id}`, 
          item.guestName, 
          item.finalTotal, 
          dayjs(item.paymentDate).format('DD/MM/YYYY HH:mm'),
          item.status === 'Cancelled' ? 'Đã hủy' : 'Đã thu'
        ]);
      });
      const wsTrans = XLSX.utils.aoa_to_sheet(wsTransData);
      wsTrans['!cols'] = [{ wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsTrans, "Chi tiết Giao dịch");

      // 4. Xuất file và tải về
      XLSX.writeFile(wb, `Bao_Cao_Doanh_Thu_${dayjs().format('DD_MM_YYYY')}.xlsx`);
      api.success({ message: 'Xuất file thành công!' });
    } catch (err) {
      api.error({ message: 'Lỗi xuất file Excel' });
    }
  };

  // 🔥 LUỒNG XỬ LÝ: Đẩy hóa đơn đã hủy xuống đáy và làm mờ
  const sortedTransactions = [...reportData.recentTransactions].sort((a, b) => {
    if (a.status === 'Cancelled' && b.status !== 'Cancelled') return 1; // A xuống đáy
    if (b.status === 'Cancelled' && a.status !== 'Cancelled') return -1; // B xuống đáy
    return dayjs(b.paymentDate).valueOf() - dayjs(a.paymentDate).valueOf(); // Còn lại xếp theo ngày mới nhất
  });

  const columns = [
    { title: 'Mã HĐ', dataIndex: 'id', render: (id) => <Text strong>INV-{id}</Text> },
    { title: 'Khách hàng', dataIndex: 'guestName', render: (name) => <Text strong style={{ color: THEME.NAVY_LIGHT }}>{name || 'Khách lẻ'}</Text> },
    { title: 'Thanh toán lúc', dataIndex: 'paymentDate', render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm') },
    { title: 'Tổng thu', dataIndex: 'finalTotal', align: 'right', render: (val, record) => <Text strong style={{ color: record.status === 'Cancelled' ? THEME.MUTED : THEME.DARK_RED }}>{new Intl.NumberFormat('vi-VN').format(val)}đ</Text> },
    { title: 'Trạng thái', align: 'center', render: (_, record) => (
        record.status === 'Cancelled' 
          ? <Tag color="default">Đã Hủy</Tag> 
          : <Tag color="success">Hợp lệ</Tag>
    )}
  ];

  return (
    <div style={{ animation: 'fadeIn 0.4s ease', paddingBottom: 24 }}>
      {contextHolder}
      
      {/* 1. HEADER & BỘ LỌC */}
      <div style={{ display: 'flex', flexDirection: screens.md ? 'row' : 'column', justifyContent: 'space-between', alignItems: screens.md ? 'flex-end' : 'stretch', gap: 16, marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ color: THEME.NAVY_DARK, margin: 0, fontFamily: '"Source Serif 4", serif' }}>Báo Cáo Doanh Thu</Title>
          <Text type="secondary">Phân tích dòng tiền và hiệu quả kinh doanh</Text>
        </div>
        <Space direction={screens.xs ? 'vertical' : 'horizontal'} style={{ width: screens.xs ? '100%' : 'auto' }}>
          <RangePicker 
            value={dateRange} 
            onChange={(dates) => setDateRange(dates)} 
            format="DD/MM/YYYY"
            size="large"
            style={{ width: screens.xs ? '100%' : 260, borderColor: THEME.NAVY_LIGHT }}
          />
          <Button type="primary" size="large" icon={<DownloadSimple size={20}/>} onClick={handleExportExcel} style={{ backgroundColor: THEME.DARK_RED, width: screens.xs ? '100%' : 'auto' }}>
            Xuất Excel
          </Button>
        </Space>
      </div>

      {/* 2. THẺ KPI TỔNG QUAN */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" style={{ borderRadius: 12, backgroundColor: THEME.NAVY_DARK, color: '#fff', boxShadow: '0 4px 15px rgba(13,24,33,0.3)' }}>
            <Statistic 
              title={<span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>TỔNG DOANH THU</span>}
              value={reportData.kpis.totalRevenue} suffix="₫" formatter={v => new Intl.NumberFormat('vi-VN').format(v)}
              styles={{ content: { color: '#fff', fontWeight: 'bold', fontSize: 26 } }} prefix={<Wallet size={28} style={{ opacity: 0.8, marginRight: 8 }}/>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" style={{ borderRadius: 12, borderLeft: `4px solid ${THEME.NAVY_LIGHT}`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <Statistic 
              title={<span style={{ color: THEME.MUTED, fontWeight: 600 }}>TỪ TIỀN PHÒNG</span>}
              value={reportData.kpis.roomRevenue} suffix="₫" formatter={v => new Intl.NumberFormat('vi-VN').format(v)}
              styles={{ content: { color: THEME.NAVY_LIGHT, fontWeight: 'bold' } }} prefix={<CalendarBlank size={24} color={THEME.NAVY_LIGHT} style={{ marginRight: 8 }}/>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" style={{ borderRadius: 12, borderLeft: `4px solid ${THEME.GOLD}`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <Statistic 
              title={<span style={{ color: THEME.MUTED, fontWeight: 600 }}>TỪ DỊCH VỤ</span>}
              value={reportData.kpis.serviceRevenue} suffix="₫" formatter={v => new Intl.NumberFormat('vi-VN').format(v)}
              styles={{ content: { color: THEME.NAVY_LIGHT, fontWeight: 'bold' } }} prefix={<ShoppingCart size={24} color={THEME.GOLD} style={{ marginRight: 8 }}/>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" style={{ borderRadius: 12, borderLeft: `4px solid ${THEME.DARK_RED}`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <Statistic 
              title={<span style={{ color: THEME.MUTED, fontWeight: 600 }}>TỪ PHẠT/ĐỀN BÙ</span>}
              value={reportData.kpis.damageRevenue} suffix="₫" formatter={v => new Intl.NumberFormat('vi-VN').format(v)}
              styles={{ content: { color: THEME.DARK_RED, fontWeight: 'bold' } }} prefix={<WarningCircle size={24} color={THEME.DARK_RED} style={{ marginRight: 8 }}/>}
            />
          </Card>
        </Col>
      </Row>

      {/* 3. BIỂU ĐỒ (CHARTS) */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} xl={16}>
          <Card title={<span style={{ color: THEME.NAVY_LIGHT, fontSize: 16 }}><ChartBar size={20} style={{verticalAlign:'sub', marginRight: 8}}/> BIỂU ĐỒ DOANH THU THEO NGÀY</span>} variant="borderless" style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            {/* 🔥 VÁ LỖI: BỌC THÊM THẺ DIV NÀY ĐỂ ÉP CHIỀU CAO CHO BIỂU ĐỒ */}
            <div style={{ width: '100%', height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData.chartData} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E9F0F8" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: THEME.MUTED, fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: THEME.MUTED, fontSize: 12 }} tickFormatter={(val) => `${val / 1000000}M`} />
                  <Tooltip cursor={{ fill: 'rgba(28, 46, 74, 0.05)' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(value) => new Intl.NumberFormat('vi-VN').format(value) + ' đ'} />
                  <Bar dataKey="revenue" fill={THEME.NAVY_LIGHT} radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card title={<span style={{ color: THEME.NAVY_LIGHT, fontSize: 16 }}>CƠ CẤU NGUỒN THU</span>} variant="borderless" style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
             {/* 🔥 VÁ LỖI: BỌC THÊM THẺ DIV NÀY NỮA LÀ XONG */}
            <div style={{ width: '100%', height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={reportData.pieData} cx="50%" cy="45%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                    {reportData.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => new Intl.NumberFormat('vi-VN').format(value) + ' đ'} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 4. DANH SÁCH HÓA ĐƠN CHI TIẾT (RESPONSIVE CHUYỂN QUA CARD TRÊN MOBILE) */}
      <Card title={<span style={{ color: THEME.NAVY_DARK, fontSize: 16 }}>GIAO DỊCH THU TIỀN TRONG KỲ</span>} variant="borderless" style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        {screens.md ? (
          /* BẢNG TRÊN MÀN HÌNH MÁY TÍNH */
          <Table 
            columns={columns} 
            dataSource={sortedTransactions} 
            rowKey="id" 
            pagination={{ pageSize: 10 }}
            loading={loading}
            rowClassName={(record) => record.status === 'Cancelled' ? 'row-cancelled' : ''}
          />
        ) : (
          /* HIỂN THỊ DẠNG CARD TRÊN ĐIỆN THOẠI */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sortedTransactions.length === 0 ? <Empty description="Không có giao dịch nào" /> : sortedTransactions.map(item => {
              const isCancelled = item.status === 'Cancelled';
              return (
                <div key={item.id} style={{ border: `1px solid ${isCancelled ? '#f0f0f0' : THEME.LIGHT_BLUE}`, borderRadius: 8, padding: 16, backgroundColor: isCancelled ? '#fcfcfc' : '#fff', opacity: isCancelled ? 0.6 : 1, pointerEvents: isCancelled ? 'none' : 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text strong style={{ textDecoration: isCancelled ? 'line-through' : 'none' }}>INV-{item.id}</Text>
                    {isCancelled ? <Tag color="default">Đã hủy</Tag> : <Tag color="success">Hợp lệ</Tag>}
                  </div>
                  <Text strong style={{ color: THEME.NAVY_LIGHT, display: 'block', marginBottom: 4 }}>{item.guestName || 'Khách lẻ'}</Text>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>{dayjs(item.paymentDate).format('DD/MM/YYYY HH:mm')}</Text>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <Text>Thuực thu:</Text>
                    <Text strong style={{ color: isCancelled ? THEME.MUTED : THEME.DARK_RED, fontSize: 16 }}>{new Intl.NumberFormat('vi-VN').format(item.finalTotal)}đ</Text>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* CSS CHO CÁC DÒNG BỊ HỦY */}
      <style>{`
        .row-cancelled { background-color: #f5f5f5; opacity: 0.6; pointer-events: none; }
        .row-cancelled .ant-typography { text-decoration: line-through; color: ${THEME.MUTED} !important; }
      `}</style>
    </div>
  );
}