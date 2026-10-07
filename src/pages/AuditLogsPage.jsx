import React, { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Space, Select, Table, Avatar, Badge, DatePicker, Button, notification, Row, Col } from 'antd';
import { User, DownloadSimple, FileXls, Funnel } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { reportApi } from '../api/reportApi';
import { useSignalR } from '../hooks/useSignalR';

const { Title, Text } = Typography;

// Bảng màu Luxury
const THEME = {
    NAVY_DARK: '#0D1821', 
    DARK_RED: '#8A1538', 
    COLD_BLUE: '#1C2E4A',
    BG_LIGHT: '#F8FAFC',
    GOLD: '#D4AF37'
};

export default function AuditLogsPage() {
  const [api, contextHolder] = notification.useNotification();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // State cho bộ lọc
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  // 1. TỪ ĐIỂN DỊCH ENTITY CHO FRONTEND
  const translateEntity = (entity) => {
      const dict = {
          'LossAndDamage': 'Thất thoát & Đền bù',
          'Rooms': 'Phòng', 'RoomInventory': 'Vật tư phòng',
          'Bookings': 'Đặt phòng', 'Users': 'Nhân sự',
          'Invoices': 'Hóa đơn', 'Equipments': 'Vật tư',
          'Services': 'Dịch vụ', 'Vouchers': 'Khuyến mãi',
          'Articles': 'Bài viết'
      };
      return dict[entity] || entity;
  };

  const fetchLogs = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await reportApi.getAuditLogs({ top: 500 }); 
      const rawData = res?.data?.$values || res?.$values || res || [];

      const parsedData = rawData.map(item => {
          let detailObj = { TotalEvents: 0, Events: [] };
          try {
              if (item.logData) detailObj = JSON.parse(item.logData);
          } catch (error) {
              console.error("Lỗi parse JSON log:", error);
          }
          return { ...item, detail: detailObj };
      });
      setLogs(parsedData);
    } catch (e) { 
        console.error(e); 
        api.error({ message: 'Lỗi tải dữ liệu', description: 'Không thể lấy nhật ký hệ thống.' });
    } 
    finally { if (!isSilent) setLoading(false); }
  }, [api]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useSignalR(() => { fetchLogs(true); });

  // Lấy danh sách nhân viên duy nhất cho Dropdown
  const uniqueUsers = [...new Set(logs.map(item => item.performedBy))].filter(Boolean);

  // Lọc dữ liệu
  const filteredLogs = logs.filter(log => {
    let matchUser = selectedUser ? log.performedBy === selectedUser : true;
    let matchDate = selectedDate ? dayjs(log.createdAt).isSame(selectedDate, 'day') : true;
    return matchUser && matchDate;
  });

  // =========================================================================
  // 🔥 TẠO TÓM TẮT THÔNG MINH
  // =========================================================================
  const generateSmartSummary = (events, userName) => {
      if (!events || events.length === 0) return "Hoạt động hệ thống.";

      const roomInvEvents = events.filter(e => e.entityType.includes('RoomInventory') || e.entityType.includes('Room_Inventory'));
      if (roomInvEvents.length > 5) {
          const firstMsg = roomInvEvents[0].message;
          const roomMatch = firstMsg.match(/phòng\s(\w+)/);
          const roomNum = roomMatch ? roomMatch[1] : "";
          return `${userName} đã thêm hàng loạt ${roomInvEvents.length} vật tư vào phòng ${roomNum}.`;
      }

      const priorityEvent = events.find(e => ['LossAndDamage', 'Bookings', 'Rooms'].some(p => e.entityType.includes(p))) || events[0];
      const message = priorityEvent.message;
      const extra = events.length - 1;
      
      return extra > 0 ? `${message} (và ${extra} sự kiện khác)` : message;
  };

  // =========================================================================
  // 🔥 GOM NHÓM SỰ KIỆN SPAM
  // =========================================================================
  const groupSpammyEvents = (events) => {
    if (!events) return [];
    const grouped = {};
    events.forEach(ev => {
        const key = `${ev.actionType}_${ev.entityType}_${ev.message}`;
        if (!grouped[key]) {
            grouped[key] = { ...ev, quantity: 0, firstTime: ev.timestamp };
        }
        grouped[key].quantity++;
        grouped[key].timestamp = ev.timestamp; 
    });
    return Object.values(grouped).sort((a, b) => dayjs(b.timestamp).diff(dayjs(a.timestamp)));
  };

  // =========================================================================
  // 🔥 XUẤT EXCEL
  // =========================================================================
  const handleExportExcel = (dataToExport, fileName) => {
      if (!dataToExport || dataToExport.length === 0) {
          api.warning({ message: 'Không có dữ liệu', description: 'Không có dữ liệu nào để xuất.' });
          return;
      }

      const excelData = [];
      
      dataToExport.forEach(log => {
          const groupedEvents = groupSpammyEvents(log.detail?.Events);
          const baseRow = {
              "Ngày tạo": dayjs(log.createdAt).format('DD/MM/YYYY HH:mm:ss'),
              "Nhân sự": log.performedBy || 'Hệ thống',
              "Tóm tắt hành động": generateSmartSummary(log.detail?.Events, log.performedBy || 'Hệ thống')
          };

          if (groupedEvents.length === 0) {
              excelData.push({ ...baseRow, "Giờ chi tiết": "", "Loại thao tác": "", "Phân hệ": "", "Nội dung chi tiết": "", "Số lượng thao tác": "" });
          } else {
              // Bung dữ liệu bảng con ra các cột chi tiết
              groupedEvents.forEach(ev => {
                  excelData.push({
                      ...baseRow,
                      "Giờ chi tiết": dayjs(ev.timestamp).format('HH:mm:ss'),
                      "Loại thao tác": ev.actionType,
                      "Phân hệ": translateEntity(ev.entityType),
                      "Nội dung chi tiết": ev.message,
                      "Số lượng thao tác": ev.quantity > 1 ? `Lặp lại ${ev.quantity} lần` : 1
                  });
              });
          }
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Tự động căn chỉnh độ rộng cột
      const wscols = [
          { wch: 20 }, { wch: 20 }, { wch: 45 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 50 }, { wch: 15 }
      ];
      worksheet['!cols'] = wscols;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "NhatKyHeThong");
      XLSX.writeFile(workbook, `${fileName}_${dayjs().format('DDMMYYYY_HHmm')}.xlsx`);
  };

  const getActionTag = (type) => {
    switch(type?.toUpperCase()) {
        case 'CREATE': case 'ADDED': return <Text strong style={{ color: '#d97706', fontSize: 13 }}>CREATE</Text>;
        case 'UPDATE': case 'MODIFIED': return <Text strong style={{ color: '#2563eb', fontSize: 13 }}>UPDATE</Text>;
        case 'DELETE': case 'DELETED': return <Text strong style={{ color: '#dc2626', fontSize: 13 }}>DELETE</Text>;
        default: return <Text strong style={{ color: '#475569', fontSize: 13 }}>{type}</Text>;
    }
  };

  const columns = [
    { 
        title: <Text strong style={{ color: THEME.COLD_BLUE }}>Ngày</Text>, 
        dataIndex: 'createdAt', width: 150,
        render: (val) => <Text strong>{dayjs(val).format('DD/MM/YYYY')}</Text> 
    },
    { 
        title: <Text strong style={{ color: THEME.COLD_BLUE }}>Nhân viên</Text>, width: 250,
        render: (_, record) => (
            <Space>
                <Avatar size="small" icon={<User />} style={{ backgroundColor: THEME.COLD_BLUE }} />
                <Text strong>{record.performedBy || 'Hệ thống'}</Text>
            </Space>
        )
    },
    { 
        title: <Text strong style={{ color: THEME.COLD_BLUE }}>Tóm tắt hoạt động</Text>, 
        render: (_, record) => (
            <Text style={{ color: THEME.NAVY_DARK }}>
                {generateSmartSummary(record.detail?.Events, record.performedBy || 'Hệ thống')}
            </Text>
        )
    }
  ];

  const expandedRowRender = (record) => {
    const groupedData = groupSpammyEvents(record.detail?.Events);
    const nestedColumns = [
      { title: 'Giờ (mới nhất)', dataIndex: 'timestamp', width: 120, render: (val) => <Text type="secondary">{dayjs(val).format('HH:mm:ss')}</Text> },
      { title: 'Hành động', dataIndex: 'actionType', width: 120, render: (val) => getActionTag(val) },
      { title: 'Đối tượng', dataIndex: 'entityType', width: 180, render: (val) => <Text>{translateEntity(val)}</Text> },
      { 
          title: 'Nội dung', key: 'message',
          render: (_, record) => (
              <Space>
                  <Text style={{ color: THEME.NAVY_DARK }}>{record.message}</Text>
                  {record.quantity > 1 && (
                      <Badge count={`x${record.quantity}`} style={{ backgroundColor: '#52c41a' }} />
                  )}
              </Space>
          )
      },
    ];

    return (
        <div style={{ padding: '8px 24px 24px 24px', backgroundColor: THEME.BG_LIGHT, borderLeft: `4px solid ${THEME.COLD_BLUE}` }}>
            <Table 
                columns={nestedColumns} dataSource={groupedData} pagination={false} 
                rowKey={(item) => item.eventId || Math.random().toString()}
                size="small" scroll={{ x: 700 }}
            />
        </div>
    );
  };

  return (
    <div style={{ padding: 24, animation: 'fadeIn 0.5s ease-in-out', minHeight: '100vh', backgroundColor: '#F0F2F5' }}>
        {contextHolder}
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            
            {/* HEADER & CONTROLS */}
            <Card style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Row justify="space-between" align="middle" gutter={[16, 16]}>
                    <Col xs={24} md={8}>
                        <Title level={3} style={{ margin: 0, color: THEME.NAVY_DARK }}>
                            Nhật ký hệ thống
                        </Title>
                        <Text type="secondary">Theo dõi các thay đổi và thao tác</Text>
                    </Col>
                    
                    <Col xs={24} md={16}>
                        <Row gutter={[12, 12]} justify="end">
                            {/* BỘ LỌC */}
                            <Col>
                                <Select
                                    allowClear
                                    placeholder={<span><Funnel size={16} style={{ verticalAlign: 'middle', marginRight: 4 }}/> Nhân viên</span>}
                                    style={{ width: 180 }}
                                    onChange={setSelectedUser}
                                    options={uniqueUsers.map(u => ({ label: u, value: u }))}
                                />
                            </Col>
                            <Col>
                                <DatePicker 
                                    placeholder="Chọn ngày" 
                                    style={{ width: 150 }} 
                                    format="DD/MM/YYYY"
                                    onChange={setSelectedDate}
                                    allowClear
                                />
                            </Col>
                            
                            {/* NÚT XUẤT EXCEL */}
                            <Col>
                                <Button 
                                    icon={<DownloadSimple size={18} />} 
                                    onClick={() => handleExportExcel(filteredLogs, 'AuditLogs_Filtered')}
                                    disabled={filteredLogs.length === 0}
                                >
                                    Xuất bộ lọc
                                </Button>
                            </Col>
                            <Col>
                                <Button 
                                    type="primary" 
                                    icon={<FileXls size={18} />} 
                                    style={{ backgroundColor: THEME.COLD_BLUE }}
                                    onClick={() => handleExportExcel(logs, 'AuditLogs_All')}
                                >
                                    Xuất toàn bộ
                                </Button>
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </Card>

            {/* BẢNG DỮ LIỆU */}
            <Card style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }} bodyStyle={{ padding: 0 }}>
                <Table 
                    columns={columns} 
                    dataSource={filteredLogs} 
                    rowKey={(record) => record.id || Math.random().toString()} 
                    loading={loading}
                    expandable={{ expandedRowRender, expandRowByClick: true }}
                    pagination={{ pageSize: 15, showSizeChanger: false, position: ['bottomCenter'] }}
                />
            </Card>
        </Space>
    </div>
  );
}