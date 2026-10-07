import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Steps, Form, Input, InputNumber, Select, Row, Col, notification, Space, Table, Tag, Divider, Spin, Checkbox, Grid } from 'antd'; // 🔥 Đã thêm Grid
import { Door, Bed, Archive, CheckCircle, ArrowRight, ArrowLeft, WarningCircle, MagnifyingGlass } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';

import { roomTypeApi } from '../../api/roomTypeApi';
import { roomApi } from '../../api/roomApi';
import { equipmentApi } from '../../api/equipmentApi';
import { roomInventoryApi } from '../../api/roomInventoryApi';
import { COLORS } from '../../constants/theme';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function RoomSetupWizard() {
  const navigate = useNavigate();
  // 🔥 Đã cấu hình thông báo cá nhân hiển thị ở góc dưới bên phải
  const [api, contextHolder] = notification.useNotification({ placement: 'bottomRight' });
  const screens = useBreakpoint();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [createdRoomTypeId, setCreatedRoomTypeId] = useState(null);
  const [createdRooms, setCreatedRooms] = useState([]); 

  const [equipments, setEquipments] = useState([]);
  const [searchEquipText, setSearchEquipText] = useState('');
  const [selectedEquipIds, setSelectedEquipIds] = useState([]); 
  const [equipQuantities, setEquipQuantities] = useState({});   

  useEffect(() => {
    equipmentApi.getAll(true).then(res => setEquipments(res || []));
  }, []);

  // ===============================================
  // BƯỚC 1: CHỈ TẠO HẠNG PHÒNG CƠ BẢN
  // ===============================================
  const handleStep1Finish = async (values) => {
    try {
      setLoading(true);
      const payload = {
        name: values.name,
        basePrice: Number(values.basePrice),
        capacityAdults: Number(values.capacityAdults),
        capacityChildren: Number(values.capacityChildren),
        sizeSqm: values.sizeSqm ? Number(values.sizeSqm) : null,
        bedType: values.bedType || "",
        viewDirection: values.viewDirection || "",
        description: values.description || ""
      };

      await roomTypeApi.createRoomType(payload);
      
      const types = await roomTypeApi.getRoomTypes(true);
      const newType = types.find(t => t.name === values.name); 
      
      if (newType) {
        setCreatedRoomTypeId(newType.id);
        api.success({ title: 'Thành công', description: `Đã tạo hạng phòng ${values.name}.` });
        setCurrentStep(1); 
      } else {
        api.error({ title: 'Lỗi', description: 'Không thể xác định hạng phòng vừa tạo.' });
      }
    } catch (error) {
      const errorDetails = error.response?.data?.errors;
      let errorMessage = error.response?.data?.message || 'Tên hạng phòng đã tồn tại hoặc có lỗi xảy ra.';
      if (errorDetails) errorMessage = Object.values(errorDetails).flat().join(' | ');
      api.error({ title: 'Lỗi', description: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // ===============================================
  // BƯỚC 2: TẠO PHÒNG VẬT LÝ
  // ===============================================
  const handleStep2Finish = async (values) => {
    try {
      setLoading(true);
      const payload = {
        roomTypeId: createdRoomTypeId,
        floor: values.floor,
        roomNumbers: values.roomNumbers 
      };

      await roomApi.bulkCreateRooms(payload);
      
      const allRooms = await roomApi.getRooms(true);
      const newlyCreated = allRooms.filter(r => r.roomTypeId === createdRoomTypeId);
      setCreatedRooms(newlyCreated);

      api.success({ title: 'Thành công', description: `Đã tạo ${payload.roomNumbers.length} phòng mới.` });
      setCurrentStep(2); 
    } catch (error) {
      api.error({ title: 'Lỗi tạo phòng', description: error.response?.data?.message || 'Có lỗi xảy ra.' });
    } finally {
      setLoading(false);
    }
  };

  // ===============================================
  // BƯỚC 3: GÁN VẬT TƯ MẶC ĐỊNH
  // ===============================================
  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedEquipIds(newSelectedRowKeys);
    const newQuantities = { ...equipQuantities };
    newSelectedRowKeys.forEach(id => {
      if (!newQuantities[id]) newQuantities[id] = 1;
    });
    setEquipQuantities(newQuantities);
  };

  const toggleMobileSelection = (equipId, checked) => {
    if (checked) {
      setSelectedEquipIds(prev => [...prev, equipId]);
      setEquipQuantities(prev => ({ ...prev, [equipId]: prev[equipId] || 1 }));
    } else {
      setSelectedEquipIds(prev => prev.filter(id => id !== equipId));
    }
  };

  const handleFinalizeSetup = async () => {
    if (selectedEquipIds.length === 0) {
      api.info({ title: 'Hoàn tất', description: 'Bạn đã hoàn tất việc tạo phòng mà không kèm vật tư.' });
      navigate('/admin/room-setup');
      return;
    }

    try {
      setLoading(true);
      for (const room of createdRooms) {
        for (const equipId of selectedEquipIds) {
          const equip = equipments.find(e => e.id === equipId);
          await roomInventoryApi.createInventory({
            roomId: room.id,
            equipmentId: equip.id,
            quantity: equipQuantities[equip.id] || 1, 
            priceIfLost: equip.defaultPriceIfLost || 0,
            note: "Thiếp lập từ hệ thống"
          });
        }
      }
      api.success({ title: 'Hoàn tất xuất sắc', description: `Đã trang bị ${selectedEquipIds.length} loại vật tư cho tất cả phòng!` });
      navigate('/admin/room-setup'); 
    } catch (error) {
      api.error({ title: 'Lỗi hệ thống', description: 'Quá trình gắn vật tư có trục trặc.' });
    } finally {
      setLoading(false);
    }
  };

  const filteredEquipments = equipments.filter(e => 
    e.name.toLowerCase().includes(searchEquipText.toLowerCase()) || 
    (e.itemCode && e.itemCode.toLowerCase().includes(searchEquipText.toLowerCase()))
  );

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 40, padding: screens.md ? '0' : '0 12px' }}>
      {contextHolder}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <Button type="text" icon={<ArrowLeft size={24} color={COLORS.MIDNIGHT_BLUE} />} onClick={() => navigate('/admin/room-setup')} />
        <div>
          <Title level={3} style={{ margin: '0 0 4px 0', color: COLORS.MIDNIGHT_BLUE, fontFamily: '"Source Serif 4", serif' }}>
            Thiết Lập Phòng Mới
          </Title>
          <Text type="secondary">Quy trình 3 bước thông minh</Text>
        </div>
      </div>

      {/* THANH TIẾN TRÌNH */}
      <Card variant="borderless" style={{ borderRadius: 12, marginBottom: 24, padding: screens.md ? '16px 8px' : '16px 0' }}>
        <Steps 
          current={currentStep} 
          responsive 
          items={[
            { title: 'Hạng Phòng', icon: <Bed size={24} /> },
            { title: 'Sơ Đồ', icon: <Door size={24} /> },
            { title: 'Vật Tư', icon: <Archive size={24} /> },
          ]}
        />
      </Card>

      <Card variant="borderless" style={{ borderRadius: 12, minHeight: 400, border: `1px solid ${COLORS.LIGHTEST}` }}>
        <Spin spinning={loading} description="Đang xử lý dữ liệu...">
          
          {/* ========================================================= */}
          {/* BƯỚC 1: KHỞI TẠO HẠNG PHÒNG (GỌN GÀNG) */}
          {/* ========================================================= */}
          {currentStep === 0 && (
            <Form layout="vertical" onFinish={handleStep1Finish}>
              <div style={{ marginBottom: 24, textAlign: 'center' }}>
                <Title level={4} style={{ color: COLORS.DARKEST }}>1. Khởi tạo Hạng Phòng</Title>
                <Text type="secondary">Nhập các thông tin cơ bản về giá và sức chứa.</Text>
              </div>
              <Row gutter={16}>
                <Col xs={24} md={16}><Form.Item name="name" label={<span style={{fontWeight: 600}}>Tên Hạng phòng (VD: Standard Single)</span>} rules={[{ required: true }]}><Input size="large" /></Form.Item></Col>
                <Col xs={24} md={8}>
                  <Form.Item name="basePrice" label={<span style={{fontWeight: 600}}>Giá tiêu chuẩn (VND)</span>} rules={[{ required: true }]}>
                    <InputNumber size="large" style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v.replace(/\$\s?|(,*)/g, '')} />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}><Form.Item name="capacityAdults" label={<span style={{fontWeight: 600}}>Người lớn tối đa</span>} rules={[{ required: true }]}><InputNumber size="large" min={1} style={{ width: '100%' }} /></Form.Item></Col>
                <Col xs={12} md={6}><Form.Item name="capacityChildren" label={<span style={{fontWeight: 600}}>Trẻ em tối đa</span>} rules={[{ required: true }]}><InputNumber size="large" min={0} style={{ width: '100%' }} /></Form.Item></Col>
                <Col xs={12} md={6}><Form.Item name="sizeSqm" label={<span style={{fontWeight: 600}}>Diện tích (m²)</span>}><InputNumber size="large" min={1} style={{ width: '100%' }} /></Form.Item></Col>
                <Col xs={12} md={6}>
                  <Form.Item name="bedType" label={<span style={{fontWeight: 600}}>Loại giường</span>}>
                    <Select size="large" options={[{value: '1 Giường Đơn'}, {value: '2 Giường Đơn'}, {value: '1 Giường Đôi'}, {value: '2 Giường Đôi'}, {value: '1 Đôi + 1 Đơn'}, {value: 'Không Giường'}]} />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="viewDirection" label={<span style={{fontWeight: 600}}>Hướng nhìn (View)</span>}>
                    <Input size="large" placeholder="VD: Hướng biển, Hướng thành phố..." />
                  </Form.Item>
                </Col>
                <Col xs={24}><Form.Item name="description" label={<span style={{fontWeight: 600}}>Mô tả chi tiết</span>}><Input.TextArea rows={3} /></Form.Item></Col>
              </Row>

              <Divider />
              <Button type="primary" htmlType="submit" size="large" block style={{ backgroundColor: COLORS.MIDNIGHT_BLUE, height: 50, fontSize: 16 }}>
                TẠO HẠNG PHÒNG & TIẾP TỤC <ArrowRight weight="bold" />
              </Button>
            </Form>
          )}

          {/* ========================================================= */}
          {/* BƯỚC 2: TẠO PHÒNG VẬT LÝ (RESPONSIVE) */}
          {/* ========================================================= */}
          {currentStep === 1 && (
            <Form layout="vertical" onFinish={handleStep2Finish}>
              <div style={{ marginBottom: 24, textAlign: 'center' }}>
                <Title level={4} style={{ color: COLORS.DARKEST }}>2. Tạo danh sách Phòng vật lý</Title>
                <Text type="secondary">Nhập các số phòng thuộc hạng phòng vừa tạo.</Text>
              </div>
              <Row gutter={16}>
                {/* Trên Mobile chiếm full (24), trên PC chiếm 6 cột */}
                <Col xs={24} md={6}>
                  <Form.Item name="floor" label={<span style={{fontWeight: 600}}>Tầng số</span>} rules={[{ required: true, message: 'Nhập tầng' }]}>
                    <InputNumber size="large" min={1} style={{ width: '100%' }} placeholder="VD: 1" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={18}>
                  <Form.Item name="roomNumbers" label={<span style={{fontWeight: 600}}>Các số phòng (Nhấn Enter để nhập nhiều)</span>} rules={[{ required: true, message: 'Nhập ít nhất 1 phòng' }]}>
                    <Select mode="tags" size="large" style={{ width: '100%' }} placeholder="Gõ số 101 -> Nhấn Enter..." open={false} />
                  </Form.Item>
                </Col>
              </Row>
              <div style={{ background: '#fffbe6', padding: 12, borderRadius: 8, border: '1px solid #ffe58f', marginBottom: 24 }}>
                <Text type="warning"><WarningCircle style={{marginRight: 8, verticalAlign: 'middle'}}/>Hệ thống sẽ tự động bỏ qua các số phòng đã tồn tại để tránh trùng lặp.</Text>
              </div>
              <Divider />
              {/* Trên Mobile các nút sẽ tự động rớt dòng thành 2 hàng */}
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}><Button size="large" block onClick={() => { api.info({title:'Đã bỏ qua', description:'Bỏ qua bước tạo phòng'}); setCurrentStep(2); }}>Bỏ qua (Tạo sau)</Button></Col>
                <Col xs={24} md={12}><Button type="primary" htmlType="submit" size="large" block style={{ backgroundColor: COLORS.MIDNIGHT_BLUE }}>TẠO DANH SÁCH & TIẾP TỤC</Button></Col>
              </Row>
            </Form>
          )}

          {/* ========================================================= */}
          {/* BƯỚC 3: GẮN VẬT TƯ (ĐÃ RESPONSIVE DẠNG CARD CHO MOBILE) */}
          {/* ========================================================= */}
          {currentStep === 2 && (
            <div>
              <div style={{ marginBottom: 24, textAlign: 'center' }}>
                <Title level={4} style={{ color: COLORS.DARKEST }}>3. Bố trí Vật tư mặc định</Title>
                <Text type="secondary">Chọn các vật tư sẽ được tự động xếp vào {createdRooms.length} phòng vừa tạo.</Text>
              </div>
              
              <Input 
                placeholder="Tìm nhanh vật tư..." 
                prefix={<MagnifyingGlass color={COLORS.MUTED}/>} 
                size="large"
                allowClear
                onChange={e => setSearchEquipText(e.target.value)} 
                style={{ marginBottom: 16 }}
              />

              {screens.md ? (
                <Table 
                  rowSelection={{ selectedRowKeys: selectedEquipIds, onChange: onSelectChange }} 
                  dataSource={filteredEquipments} 
                  rowKey="id"
                  size="small"
                  scroll={{ y: 350, x: 500 }}
                  pagination={false}
                  style={{ border: `1px solid ${COLORS.LIGHTEST}`, borderRadius: 8, marginBottom: 24 }}
                  columns={[
                    { 
                      title: 'Tên Vật tư', 
                      dataIndex: 'name', 
                      render: (text, record) => (
                        <div>
                          <Text strong style={{ display: 'block', color: COLORS.DARKEST }}>{text}</Text>
                          <Space size="small" style={{ marginTop: 4 }}>
                            <Tag color="cyan" style={{ margin: 0 }}>{record.category}</Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>Mã: {record.itemCode || 'N/A'}</Text>
                          </Space>
                        </div>
                      )
                    },
                    { 
                      title: 'Tồn kho', 
                      dataIndex: 'inStockQuantity', 
                      align: 'center',
                      width: 100,
                      render: (stock) => (
                        <Tag color={stock > 0 ? "green" : "red"} style={{ fontWeight: 'bold', margin: 0, fontSize: 14 }}>
                          {stock !== undefined && stock !== null ? stock : 0}
                        </Tag>
                      ) 
                    },
                    { 
                      title: 'Số lượng trang bị', 
                      key: 'quantity', 
                      align: 'center',
                      width: 150,
                      render: (_, record) => {
                        const isSelected = selectedEquipIds.includes(record.id);
                        return (
                          <InputNumber 
                            min={1} 
                            max={record.inStockQuantity !== undefined && record.inStockQuantity !== null ? record.inStockQuantity : 999} 
                            value={equipQuantities[record.id]} 
                            onChange={(val) => setEquipQuantities({ ...equipQuantities, [record.id]: val })}
                            disabled={!isSelected} 
                            style={{ width: 80, borderColor: isSelected ? COLORS.MIDNIGHT_BLUE : undefined }}
                          />
                        );
                      }
                    }
                  ]}
                />
              ) : (
                /* GIAO DIỆN MOBILE DẠNG LIST CARD CHO BƯỚC 3 */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto', marginBottom: 24 }}>
                  {filteredEquipments.map(record => {
                    const isSelected = selectedEquipIds.includes(record.id);
                    const stock = record.inStockQuantity !== undefined && record.inStockQuantity !== null ? record.inStockQuantity : 0;
                    
                    return (
                      <div key={record.id} style={{ padding: 12, border: `1px solid ${isSelected ? COLORS.MIDNIGHT_BLUE : '#e8e8e8'}`, borderRadius: 8, background: isSelected ? '#f0f5ff' : '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <Checkbox 
                            checked={isSelected} 
                            onChange={(e) => toggleMobileSelection(record.id, e.target.checked)} 
                            style={{ marginTop: 4 }}
                          />
                          <div style={{ flex: 1 }}>
                            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 4 }}>{record.name}</Text>
                            <Space wrap size="small">
                              <Tag color="cyan">{record.category}</Tag>
                              <Tag color={stock > 0 ? "green" : "red"}>Tồn: {stock}</Tag>
                            </Space>
                          </div>
                        </div>
                        {isSelected && (
                          <div style={{ marginTop: 12, paddingLeft: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text type="secondary">SL trang bị mỗi phòng:</Text>
                            <InputNumber 
                              min={1} 
                              max={stock} 
                              value={equipQuantities[record.id]} 
                              onChange={(val) => setEquipQuantities({ ...equipQuantities, [record.id]: val })}
                              style={{ width: 100, borderColor: COLORS.MIDNIGHT_BLUE }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f5f5f5', borderRadius: 8, marginBottom: 24 }}>
                <Text strong>Đã chọn: <span style={{ color: COLORS.ACCENT_RED, fontSize: 16 }}>{selectedEquipIds.length}</span> vật tư</Text>
              </div>

              <Divider />
              <Button type="primary" size="large" block style={{ backgroundColor: COLORS.ACCENT_RED, height: 50, fontSize: 16, fontWeight: 'bold' }} onClick={handleFinalizeSetup} loading={loading}>
                <CheckCircle size={20} style={{marginRight: 8, verticalAlign: 'middle'}}/> HOÀN TẤT & LƯU HỆ THỐNG
              </Button>
            </div>
          )}
        </Spin>
      </Card>
    </div>
  );
}