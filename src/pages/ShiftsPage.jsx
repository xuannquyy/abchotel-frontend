import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Typography, Space, Row, Col, notification, Modal, Form, Input, DatePicker, Tag, Divider, Popconfirm, Grid, List } from 'antd';
import { Clock, SignIn, SignOut, Handshake, CalendarBlank, UserCircle, NotePencil } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import { shiftApi } from '../api/shiftApi';
import { useAuthStore } from '../store/authStore';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const ACCENT_RED = '#8A1538';
const MIDNIGHT_BLUE = '#1C2E4A';
const SUCCESS_GREEN = '#52c41a';

export default function ShiftsPage() {
  const { user } = useAuthStore();
  const screens = useBreakpoint(); // Dùng để check kích thước màn hình
  
  // Biến kiểm tra xem user này có quyền Quản lý Chấm công không
  const isManager = user?.permissions?.includes("MANAGE_SHIFTS");

  const [currentShift, setCurrentShift] = useState(null);
  const [shiftHistory, setShiftHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Bộ lọc cho Quản lý
  const [filterDate, setFilterDate] = useState(dayjs());

  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [handoverForm] = Form.useForm();

  // ================= 1. FETCH DỮ LIỆU =================
  const fetchCurrentShift = async () => {
    try {
      const res = await shiftApi.getCurrentShift();
      setCurrentShift(res);
      // Nếu có biên bản bàn giao cũ thì nạp vào form
      if (res?.handoverNotes) {
        handoverForm.setFieldsValue({ notes: res.handoverNotes });
      }
    } catch (error) {
      // Bỏ qua lỗi 404 (Không có ca đang chạy)
      if (error.response?.status !== 404) {
        console.error("Lỗi lấy ca hiện tại", error);
      }
      setCurrentShift(null);
    }
  };

  const fetchShiftHistory = async (date) => {
    if (!isManager) return; // Nếu không phải quản lý thì không gọi API này
    try {
      setLoading(true);
      const res = await shiftApi.getShifts({ date: date ? date.format('YYYY-MM-DD') : null });
      setShiftHistory(res || []);
    } catch (error) {
      notification.error({ message: 'Lỗi tải lịch sử chấm công', placement: 'bottomRight' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentShift();
    if (isManager) fetchShiftHistory(filterDate);
  }, [isManager, filterDate]);

  // ================= 2. THAO TÁC CHẤM CÔNG =================
  const handleCheckIn = async () => {
    try {
      setLoading(true);
      await shiftApi.checkIn();
      notification.success({ message: 'Đã check-in thành công!', placement: 'bottomRight' });
      fetchCurrentShift();
      if (isManager) fetchShiftHistory(filterDate);
    } catch (error) {
      notification.error({ message: error.response?.data?.message || 'Check-in thất bại', placement: 'bottomRight' });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setLoading(true);
      await shiftApi.checkOut();
      notification.success({ message: 'Đã check-out kết thúc ca!', placement: 'bottomRight' });
      setCurrentShift(null);
      if (isManager) fetchShiftHistory(filterDate);
    } catch (error) {
      notification.error({ message: error.response?.data?.message || 'Check-out thất bại', placement: 'bottomRight' });
    } finally {
      setLoading(false);
    }
  };

  const onHandoverSubmit = async (values) => {
    try {
      setLoading(true);
      await shiftApi.handover(values);
      notification.success({ message: 'Đã lưu biên bản bàn giao!', placement: 'bottomRight' });
      setIsHandoverModalOpen(false);
      fetchCurrentShift();
      if (isManager) fetchShiftHistory(filterDate);
    } catch (error) {
      notification.error({ message: error.response?.data?.message || 'Lưu bàn giao thất bại', placement: 'bottomRight' });
    } finally {
      setLoading(false);
    }
  };

  // ================= 3. CỘT BẢNG LỊCH SỬ (CHỈ DÀNH CHO QUẢN LÝ) =================
  const columns = [
    {
      title: 'Nhân viên', dataIndex: 'fullName', key: 'fullName',
      render: (text) => <Space><UserCircle size={20} color={MIDNIGHT_BLUE} /><Text strong>{text}</Text></Space>
    },
    {
      title: 'Giờ vào ca (Check-in)', dataIndex: 'checkInTime', key: 'checkInTime',
      render: (time) => <Tag color="blue">{dayjs(time).format('HH:mm - DD/MM')}</Tag>
    },
    {
      title: 'Giờ ra ca (Check-out)', dataIndex: 'checkOutTime', key: 'checkOutTime',
      render: (time) => time ? <Tag color="red">{dayjs(time).format('HH:mm - DD/MM')}</Tag> : <Tag color="processing" icon={<Clock />}>Đang làm việc</Tag>
    },
    {
      title: 'Tổng giờ làm', dataIndex: 'totalHoursWorked', key: 'totalHoursWorked',
      render: (hours) => hours ? <Text strong>{hours.toFixed(2)} giờ</Text> : '-'
    },
    {
      title: 'Ghi chú bàn giao', dataIndex: 'handoverNotes', key: 'handoverNotes',
      render: (notes) => notes ? <Text italic type="secondary">{notes}</Text> : <Text type="secondary">-</Text>
    }
  ];

  return (
    <div>
      <Title level={3} style={{ color: MIDNIGHT_BLUE, fontFamily: '"Source Serif 4", serif', marginBottom: 24 }}>Chấm công & Giao ca</Title>

      {/* ================= THẺ THAO TÁC CÁ NHÂN ================= */}
      <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', marginBottom: 24 }}>
        <Row align="middle" justify="space-between" gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Space size="large" align="start" style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ backgroundColor: currentShift ? '#e6f7ff' : '#f5f5f5', padding: screens.xs ? 16 : 20, borderRadius: '50%' }}>
                <Clock size={screens.xs ? 32 : 40} color={currentShift ? '#1890ff' : '#bfbfbf'} weight={currentShift ? "fill" : "regular"} />
              </div>
              <div>
                <Title level={screens.xs ? 5 : 4} style={{ margin: 0, color: currentShift ? '#1890ff' : '#8c8c8c' }}>
                  {currentShift ? 'ĐANG TRONG CA LÀM VIỆC' : 'CHƯA VÀO CA'}
                </Title>
                {currentShift && (
                  <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                    Giờ vào ca: <Text strong>{dayjs(currentShift.checkInTime).format('HH:mm - DD/MM/YYYY')}</Text>
                  </Text>
                )}
                {currentShift?.handoverNotes && (
                  <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                    Đã lưu biên bản: <Text italic>"{currentShift.handoverNotes}"</Text>
                  </Text>
                )}
              </div>
            </Space>
          </Col>

          <Col xs={24} md={12} style={{ textAlign: screens.xs ? 'left' : 'right' }}>
            <Space size="middle" direction={screens.xs ? 'vertical' : 'horizontal'} style={{ width: '100%' }}>
              {!currentShift ? (
                <Popconfirm title="Xác nhận vào ca làm việc bây giờ?" onConfirm={handleCheckIn} okText="Đồng ý" cancelText="Hủy">
                  <Button block={screens.xs} size="large" type="primary" icon={<SignIn size={20} />} loading={loading} style={{ backgroundColor: SUCCESS_GREEN, height: 50, borderRadius: 8, fontWeight: 'bold' }}>
                    CHECK-IN VÀO CA
                  </Button>
                </Popconfirm>
              ) : (
                <>
                  <Button block={screens.xs} size="large" icon={<NotePencil size={20} />} onClick={() => setIsHandoverModalOpen(true)} style={{ height: 50, borderRadius: 8, color: MIDNIGHT_BLUE, borderColor: MIDNIGHT_BLUE }}>
                    Viết Bàn Giao
                  </Button>
                  <Popconfirm title="Bạn có chắc muốn kết thúc ca làm việc?" onConfirm={handleCheckOut} okText="Đồng ý" cancelText="Hủy" placement={screens.xs ? "top" : "bottomRight"}>
                    <Button block={screens.xs} size="large" type="primary" danger icon={<SignOut size={20} />} loading={loading} style={{ height: 50, borderRadius: 8, fontWeight: 'bold' }}>
                      CHECK-OUT RA CA
                    </Button>
                  </Popconfirm>
                </>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* ================= BẢNG LỊCH SỬ (DÀNH CHO QUẢN LÝ) ================= */}
      {isManager && (
        <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }} bodyStyle={{ padding: screens.xs ? 12 : 24 }}>
          <div style={{ display: 'flex', flexDirection: screens.xs ? 'column' : 'row', justifyContent: 'space-between', alignItems: screens.xs ? 'flex-start' : 'center', marginBottom: 20, gap: '12px' }}>
            <Title level={5} style={{ margin: 0, color: MIDNIGHT_BLUE }}>Lịch sử Chấm công toàn Khách sạn</Title>
            <Space>
              <Text strong>Chọn ngày:</Text>
              <DatePicker 
                value={filterDate} 
                onChange={(date) => setFilterDate(date)} 
                format="DD/MM/YYYY" 
                allowClear={false}
                style={{ width: screens.xs ? '100%' : 'auto' }}
              />
            </Space>
          </div>

          {/* HIỂN THỊ DẠNG LIST TRÊN MOBILE VÀ BẢNG TRÊN DESKTOP */}
          {!screens.md ? (
            <List
              loading={loading}
              dataSource={shiftHistory}
              renderItem={(record) => (
                <Card 
                  size="small" 
                  style={{ marginBottom: 12, borderRadius: 8, border: '1px solid #f0f0f0' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                    <UserCircle size={28} color={MIDNIGHT_BLUE} style={{ marginRight: 8 }} />
                    <Text strong style={{ fontSize: 16, color: MIDNIGHT_BLUE }}>{record.fullName}</Text>
                  </div>
                  <Row gutter={[0, 8]}>
                    <Col span={12}><Text type="secondary">Giờ vào:</Text></Col>
                    <Col span={12}><Tag color="blue">{dayjs(record.checkInTime).format('HH:mm - DD/MM')}</Tag></Col>
                    
                    <Col span={12}><Text type="secondary">Giờ ra:</Text></Col>
                    <Col span={12}>
                      {record.checkOutTime ? <Tag color="red">{dayjs(record.checkOutTime).format('HH:mm - DD/MM')}</Tag> : <Tag color="processing" icon={<Clock />}>Đang làm việc</Tag>}
                    </Col>

                    <Col span={12}><Text type="secondary">Tổng giờ:</Text></Col>
                    <Col span={12}>{record.totalHoursWorked ? <Text strong>{record.totalHoursWorked.toFixed(2)} giờ</Text> : '-'}</Col>

                    <Col span={24}>
                      <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>Ghi chú bàn giao:</Text>
                      <div style={{ background: '#f5f5f5', padding: '8px', borderRadius: '6px', marginTop: '4px' }}>
                        {record.handoverNotes ? <Text italic>{record.handoverNotes}</Text> : <Text type="secondary">Không có ghi chú</Text>}
                      </div>
                    </Col>
                  </Row>
                </Card>
              )}
            />
          ) : (
            <Table 
              columns={columns} 
              dataSource={shiftHistory} 
              rowKey="id" 
              loading={loading}
              pagination={{ pageSize: 10 }}
              rowClassName={(record, index) => index % 2 === 0 ? 'table-row-light' : 'table-row-dark'}
            />
          )}
        </Card>
      )}

      {/* ================= MODAL VIẾT BÀN GIAO ================= */}
      <Modal 
        title={<Space><Handshake size={24} color={ACCENT_RED} /><Title level={4} style={{ margin: 0, color: MIDNIGHT_BLUE }}>Biên bản Bàn giao ca</Title></Space>} 
        open={isHandoverModalOpen} 
        onCancel={() => setIsHandoverModalOpen(false)} 
        footer={null} 
        centered
        width={screens.xs ? '95%' : 520}
      >
        <Divider style={{ margin: '12px 0 24px 0' }} />
        <Form form={handoverForm} layout="vertical" onFinish={onHandoverSubmit}>
          <Form.Item 
            name="notes" 
            label={<Text strong>Nội dung cần bàn giao cho ca sau:</Text>} 
            rules={[{ required: true, message: 'Vui lòng nhập nội dung bàn giao' }]}
          >
            <Input.TextArea rows={5} placeholder="Ví dụ: Phòng 201 khách yêu cầu dọn trễ, chưa thu tiền nước phòng 305..." />
          </Form.Item>
          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Space direction={screens.xs ? 'vertical' : 'horizontal'} style={{ width: '100%', justifyContent: screens.xs ? 'center' : 'flex-end' }}>
              <Button block={screens.xs} onClick={() => setIsHandoverModalOpen(false)}>Hủy</Button>
              <Button block={screens.xs} type="primary" htmlType="submit" loading={loading} style={{ backgroundColor: ACCENT_RED }}>Lưu Biên Bản</Button>
            </Space>
          </div>
        </Form>
      </Modal>

      <style>{`
        .ant-table-thead > tr > th { background-color: #e9f0f8 !important; color: #1C2E4A !important; font-weight: 700 !important; }
        .table-row-light { background-color: #ffffff; }
        .table-row-dark { background-color: #fcfcfc; }
      `}</style>
    </div>
  );
}