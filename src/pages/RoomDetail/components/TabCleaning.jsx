import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Form, Input, InputNumber, Select, notification, Tag, Upload, Modal, Table, Grid, Popconfirm } from 'antd';
import { WarningCircle, Broom, MagnifyingGlass, CheckCircle, Warning, UploadSimple, XCircle, ClockCounterClockwise, Trash } from '@phosphor-icons/react';
import { roomApi } from '../../../api/roomApi';
import { roomInventoryApi } from '../../../api/roomInventoryApi';
import { lossDamageApi } from '../../../api/lossDamageApi';
import { mediaApi } from '../../../api/mediaApi'; 
import { COLORS } from '../../../constants/theme';
import { useSignalR } from '../../../hooks/useSignalR'; 

const { Title, Text } = Typography;
const { useBreakpoint } = Grid; 

const CLEANING_LABELS = {
  Clean: 'Sạch sẽ',   
  Dirty: 'Dơ (Cần dọn)',   
  Cleaning: 'Đang dọn dẹp',
  Inspected: 'Chờ kiểm tra'
};

export default function TabCleaning({ room, roomId, onRefreshRoom }) {
  const [api, contextHolder] = notification.useNotification({ placement: 'bottomRight' });
  const screens = useBreakpoint(); 

  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState(''); 
  
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportItem, setReportItem] = useState(null);
  const [reportForm] = Form.useForm();

  const [reportedItems, setReportedItems] = useState({});
  const [evidenceImageUrl, setEvidenceImageUrl] = useState(null); 

  const fetchInventories = async (isRealtime = false) => {
    if (!roomId) return;
    try {
      if (!isRealtime) setLoading(true);
      const data = await roomInventoryApi.getInventoryByRoom(roomId, true);
      setInventories(data || []);
    } catch (e) {
      if (!isRealtime) api.error({ message: 'Lỗi', description: 'Không thể tải danh sách.' });
    } finally {
      if (!isRealtime) setLoading(false);
    }
  };

  useEffect(() => { fetchInventories(false); }, [roomId]);
  useSignalR(() => { fetchInventories(true); });

  const handleUpdateCleaning = async (newCleaning) => {
    try {
      setLoading(true);
      await roomApi.updateCleaningStatus(roomId, newCleaning);
      api.success({ message: 'Thành công', description: 'Đã cập nhật tiến độ cho Lễ tân!' });
      onRefreshRoom();
    } catch (e) { 
      api.error({ message: 'Lỗi', description: 'Không thể cập nhật trạng thái.' }); 
    } 
    finally { setLoading(false); }
  };

  const handleUploadImage = async (options) => {
    const { file, onSuccess, onError } = options;
    try {
      setLoading(true);
      const uploadRes = await mediaApi.uploadImage(file);
      const newUrl = uploadRes.data?.url || uploadRes.url || uploadRes;
      setEvidenceImageUrl(newUrl); 
      onSuccess("ok");
      api.success({ message: 'Thành công', description: 'Đã tải ảnh minh chứng lên hệ thống.' });
    } catch (error) {
      api.error({ message: 'Lỗi', description: 'Tải ảnh thất bại.' });
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  const submitDamageReport = async (values) => {
    try {
      setLoading(true);
      const payload = { 
        ...values, 
        roomInventoryId: reportItem.id,
        evidenceImageUrl: evidenceImageUrl 
      };
      const res = await lossDamageApi.reportDamage(payload);
      
      const newReportId = res.data?.id || res.id || true;
      setReportedItems(prev => ({ ...prev, [reportItem.id]: newReportId }));

      api.success({ message: 'Thành công', description: 'Biên bản sự cố đã gửi về Lễ Tân!' });
      setIsReportModalOpen(false);
      fetchInventories(false); 
    } catch (error) {
      api.error({ message: 'Lỗi báo cáo', description: error.response?.data?.message || 'Có lỗi xảy ra' });
    } finally { setLoading(false); }
  };

  const handleCancelReport = async (inventoryId, reportId) => {
    try {
      setLoading(true);
      if (typeof reportId === 'number' || typeof reportId === 'string') {
        await lossDamageApi.updateStatus(reportId, 'CANCELLED');
      }
      
      setReportedItems(prev => {
        const nextState = { ...prev };
        delete nextState[inventoryId];
        return nextState;
      });

      api.success({ message: 'Thành công', description: 'Đã thu hồi báo cáo sự cố!' });
      fetchInventories(false);
    } catch (error) {
      api.error({ message: 'Lỗi', description: 'Không thể hủy báo cáo lúc này.' });
    } finally { setLoading(false); }
  };

  const getNextStateInfo = () => {
    switch (room?.cleaningStatus) {
      case 'Inspected': return { next: 'Dirty', label: 'Đã kiểm xong -> Báo Dơ', color: COLORS.ACCENT_RED, icon: <Warning size={20}/> };
      case 'Dirty': return { next: 'Cleaning', label: 'Bắt đầu Dọn Dẹp', color: COLORS.MUTED, icon: <Broom size={20}/> };
      case 'Cleaning': return { next: 'Clean', label: 'Đã Dọn Sạch Sẽ', color: COLORS.MIDNIGHT_BLUE, icon: <CheckCircle size={20}/> };
      case 'Clean': return { next: 'Dirty', label: 'Đánh dấu Cần dọn dẹp', color: COLORS.DARKEST, icon: <WarningCircle size={20}/> };
      default: return { next: 'Inspected', label: 'Bắt đầu Kiểm tra', color: COLORS.DARKEST, icon: <MagnifyingGlass size={20}/> };
    }
  };

  const nextState = getNextStateInfo();
  const filteredInventories = inventories.filter(item => item.equipmentName?.toLowerCase().includes(searchText.toLowerCase()));

  const openReportModal = (item) => {
    setReportItem(item); 
    reportForm.resetFields(); 
    setEvidenceImageUrl(null); 
    setIsReportModalOpen(true);
  };

  return (
    <div style={{paddingTop: 12}}>
      {contextHolder}
      <Card variant="borderless" style={{ background: COLORS.LIGHTEST, marginBottom: 24, borderRadius: 12, textAlign: 'center', padding: '16px 8px' }}>
        <Text style={{ fontSize: 15, color: COLORS.MUTED, display: 'block', marginBottom: 16 }}>
          Trạng thái hiện tại: <strong style={{color: COLORS.DARKEST}}>{CLEANING_LABELS[room?.cleaningStatus] || room?.cleaningStatus}</strong>
        </Text>
        <Button 
          type="primary" onClick={() => handleUpdateCleaning(nextState.next)} 
          style={{ backgroundColor: nextState.color, height: 50, fontSize: 16, borderRadius: 25, width: '100%', maxWidth: 350, fontWeight: 'bold', border: 'none' }} 
          icon={nextState.icon}
        >
          {nextState.label}
        </Button>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <Title level={5} style={{ color: COLORS.DARKEST, margin: 0, fontSize: 16 }}>Danh sách đồ dùng:</Title>
        <Input placeholder="Tìm nhanh vật tư..." prefix={<MagnifyingGlass />} allowClear onChange={e => setSearchText(e.target.value)} style={{ width: '100%', maxWidth: 300, borderRadius: 8 }} size="large" />
      </div>
      
      {screens.md ? (
        <Table 
          size="middle" dataSource={filteredInventories} rowKey="id" pagination={false} loading={loading}
          columns={[
            { title: 'Tên Vật Tư', dataIndex: 'equipmentName', render: (t) => <Text strong style={{color: COLORS.DARKEST, fontSize: 15}}>{t}</Text> },
            { title: 'Số lượng', dataIndex: 'quantity', align: 'center', width: 300, render: q => <Tag color={q > 0 ? "blue" : "error"} style={{ margin: 0, padding: '2px 12px', fontSize: 14, fontWeight: 'bold' }}>{q || 0}</Tag> },
            { title: 'Trạng thái / Báo cáo', key: 'action', align: 'center', width: 300, 
              render: (_, record) => {
                const isReported = reportedItems[record.id];
                const isOutOfStock = record.quantity === 0 || !record.quantity; 
                
                // 🔥 LOGIC ĐÃ SỬA: ƯU TIÊN NÚT HỦY LÊN HÀNG ĐẦU
                if (isReported) {
                  return (
                    <Popconfirm title="Bạn có chắc muốn hủy báo cáo này?" onConfirm={() => handleCancelReport(record.id, isReported)} okText="Đồng ý" cancelText="Đóng">
                      <Button style={{ color: COLORS.ACCENT_RED, borderColor: COLORS.ACCENT_RED, background: '#fff', fontWeight: 600, borderRadius: 6 }} icon={<XCircle size={18} />}>Hủy báo cáo</Button>
                    </Popconfirm>
                  );
                }

                if (isOutOfStock) {
                  return <Tag icon={<ClockCounterClockwise />} color="warning" style={{ padding: '4px 12px', fontSize: 13 }}>Đang chờ kho bổ sung</Tag>;
                }

                return (
                  <Button type="primary" icon={<WarningCircle size={18} />} onClick={() => openReportModal(record)} style={{ backgroundColor: COLORS.ACCENT_RED, borderColor: COLORS.ACCENT_RED, color: '#fff', fontWeight: 600, borderRadius: 6 }}>Báo hỏng / Mất</Button>
                );
              }
            }
          ]}
          style={{ border: `1px solid ${COLORS.LIGHTEST}`, borderRadius: 8, overflow: 'hidden' }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredInventories.map(item => {
            const isReported = reportedItems[item.id];
            const isOutOfStock = item.quantity === 0 || !item.quantity; 
            
            return (
              <div key={item.id} style={{ background: '#fff', border: `1px solid ${COLORS.LIGHTEST}`, borderRadius: 10, padding: 16, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text strong style={{ fontSize: 15, color: COLORS.DARKEST, flex: 1, paddingRight: 12 }}>{item.equipmentName}</Text>
                  <Tag color={isOutOfStock ? "error" : "processing"} style={{ margin: 0, fontWeight: 'bold', fontSize: 13, padding: '4px 8px', borderRadius: 6 }}>SL: {item.quantity || 0}</Tag>
                </div>
                
                {/* 🔥 LOGIC ĐÃ SỬA: ƯU TIÊN NÚT HỦY LÊN HÀNG ĐẦU */}
                {isReported ? (
                  <Popconfirm title="Thu hồi báo cáo sự cố này?" onConfirm={() => handleCancelReport(item.id, isReported)} okText="Đồng ý" cancelText="Đóng">
                    <Button block icon={<XCircle size={18} />} style={{ color: COLORS.ACCENT_RED, borderColor: COLORS.ACCENT_RED, background: '#fff', fontWeight: 600, height: 40, borderRadius: 8, fontSize: 14 }}>Hủy báo cáo</Button>
                  </Popconfirm>
                ) : isOutOfStock ? (
                  <div style={{ textAlign: 'center', padding: '8px 0', background: '#fffbe6', borderRadius: 6, border: '1px solid #ffe58f' }}>
                    <Text type="warning" style={{fontWeight: 600}}><ClockCounterClockwise style={{verticalAlign: 'middle', marginRight: 4}}/>Đang chờ kho bổ sung</Text>
                  </div>
                ) : (
                  <Button type="primary" block icon={<WarningCircle size={18} weight="bold" />} onClick={() => openReportModal(item)} style={{ backgroundColor: COLORS.ACCENT_RED, borderColor: COLORS.ACCENT_RED, color: '#fff', fontWeight: 600, height: 40, borderRadius: 8, fontSize: 14 }}>Báo hỏng / Mất</Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal title={<span style={{color: COLORS.DARKEST, fontSize: 18}}>Lập Biên Bản Sự Cố</span>} open={isReportModalOpen} onCancel={() => setIsReportModalOpen(false)} footer={null}>
        <Form form={reportForm} layout="vertical" onFinish={submitDamageReport}>
          <div style={{ padding: '12px', background: '#fff1f0', borderLeft: `4px solid ${COLORS.ACCENT_RED}`, marginBottom: 16, borderRadius: '0 8px 8px 0' }}>
            <Text strong style={{ color: COLORS.ACCENT_RED }}>Tài sản báo lỗi: {reportItem?.equipmentName}</Text>
          </div>
          
          <Form.Item name="issueType" label={<span style={{fontWeight: 600}}>Loại Sự cố</span>} rules={[{ required: true, message: 'Vui lòng chọn loại sự cố' }]}>
            <Select size="large" options={[{value: 'Damaged', label: 'Bị hư hỏng / Rơi vỡ'}, {value: 'Lost', label: 'Khách làm mất'}]} />
          </Form.Item>
          
          <Form.Item name="quantity" label={<span style={{fontWeight: 600}}>Số lượng bị ảnh hưởng</span>} rules={[{ required: true, message: 'Nhập số lượng' }]}>
            <InputNumber size="large" min={1} max={reportItem?.quantity || 1} style={{width: '100%'}} />
          </Form.Item>
          
          <Form.Item name="description" label={<span style={{fontWeight: 600}}>Mô tả hiện trường</span>}>
            <Input.TextArea rows={3} placeholder="Mô tả chi tiết tình trạng..." />
          </Form.Item>

          <Form.Item label={<span style={{fontWeight: 600}}>Ảnh minh chứng (Tùy chọn)</span>}>
            {evidenceImageUrl ? (
              <div style={{ position: 'relative', display: 'inline-block', border: '1px solid #d9d9d9', borderRadius: 8, padding: 8, background: '#fafafa' }}>
                <img src={evidenceImageUrl} alt="evidence" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 6 }} />
                <Button 
                  size="small" danger icon={<Trash />} 
                  onClick={() => setEvidenceImageUrl(null)} 
                  style={{ position: 'absolute', top: -10, right: -10, borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} 
                />
              </div>
            ) : (
              <Upload customRequest={handleUploadImage} showUploadList={false} accept="image/*">
                <Button icon={<UploadSimple />} size="large">Chụp / Chọn ảnh tải lên</Button>
              </Upload>
            )}
          </Form.Item>

          <Button type="primary" htmlType="submit" size="large" block loading={loading} style={{backgroundColor: COLORS.ACCENT_RED, border: 'none', fontWeight: 'bold', marginTop: 8, borderRadius: 8}}>
            GỬI BÁO CÁO VỀ HỆ THỐNG
          </Button>
        </Form>
      </Modal>
    </div>
  );
}