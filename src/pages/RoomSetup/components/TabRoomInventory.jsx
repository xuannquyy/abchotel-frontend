import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Input, Table, Tag, Popconfirm, notification, Space, Modal, Form, Select, InputNumber, Row, Col, Grid, Tooltip } from 'antd';
import { MagnifyingGlass, Plus, Trash, PencilSimple, Copy, Archive, ArrowsClockwise } from '@phosphor-icons/react'; 

import { roomInventoryApi } from '../../../api/roomInventoryApi';
import { equipmentApi } from '../../../api/equipmentApi';
import { roomApi } from '../../../api/roomApi';
import { COLORS } from '../../../constants/theme';
import { useSignalR } from '../../../hooks/useSignalR'; // 🔥 Đã thêm Hook Realtime

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function TabRoomInventory({ room }) {
  // 🔥 Ép toàn bộ thông báo thao tác tay xuống góc dưới bên phải
  const [api, contextHolder] = notification.useNotification({ placement: 'bottomRight' });
  const screens = useBreakpoint();

  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // States cho tính năng THÊM TỪ KHO
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [equipments, setEquipments] = useState([]);
  const [searchEquipText, setSearchEquipText] = useState('');
  const [selectedEquipIds, setSelectedEquipIds] = useState([]);
  const [equipQuantities, setEquipQuantities] = useState({});

  // States cho tính năng CLONE PHÒNG MẪU
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [allRooms, setAllRooms] = useState([]);
  const [cloneForm] = Form.useForm();

  // States cho tính năng SỬA VẬT TƯ
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm] = Form.useForm();

  // 1. TẢI DỮ LIỆU (Tách biệt Realtime và Manual)
  const fetchInventories = async (isRealtime = false) => {
    try {
      if (!isRealtime) setLoading(true);
      const data = await roomInventoryApi.getInventoryByRoom(room.id, false);
      setInventories(data || []);
      // 🔥 Bỏ pop-up thông báo hệ thống cập nhật, chỉ âm thầm refresh dữ liệu
    } catch (error) {
      if (!isRealtime) {
        api.error({ message: 'Lỗi', description: 'Không thể tải danh sách vật tư.' });
      }
    } finally {
      if (!isRealtime) setLoading(false);
    }
  };

  useEffect(() => {
    if (room?.id) fetchInventories(false);
  }, [room?.id]);

  // 🔥 Lắng nghe Realtime để tự làm mới danh sách khi có thay đổi từ kho
  useSignalR(() => {
    if (room?.id) fetchInventories(true);
  });

  // ==============================================
  // TÍNH NĂNG: ĐỒNG BỘ GIÁ TỪ KHO TỔNG
  // ==============================================
  const handleSyncWithGlobalInventory = async () => {
    try {
      setLoading(true);
      const globalEquipments = await equipmentApi.getAll(true);
      let syncCount = 0;

      for (const item of inventories) {
        const globalEq = globalEquipments.find(e => e.id === item.equipmentId);
        if (globalEq && globalEq.defaultPriceIfLost !== item.priceIfLost) {
          await roomInventoryApi.updateInventory(item.id, {
            quantity: item.quantity,
            priceIfLost: globalEq.defaultPriceIfLost, 
            note: item.note
          });
          syncCount++;
        }
      }

      if (syncCount > 0) {
        api.success({ message: 'Đồng bộ thành công', description: `Đã cập nhật giá mới cho ${syncCount} loại vật tư.` });
        fetchInventories(false);
      } else {
        api.info({ message: 'Không có thay đổi', description: 'Toàn bộ vật tư trong phòng đang có giá khớp với Kho tổng.' });
      }
    } catch (error) {
      api.error({ message: 'Lỗi đồng bộ', description: 'Không thể thực hiện đồng bộ.' });
    } finally {
      setLoading(false);
    }
  };

  // ==============================================
  // TÍNH NĂNG 1: THÊM TỪ KHO TỔNG
  // ==============================================
  const openAddModal = async () => {
    try {
      setLoading(true);
      const data = await equipmentApi.getAll(true);
      setEquipments(data || []);
      setSelectedEquipIds([]);
      setEquipQuantities({});
      setIsAddModalOpen(true);
    } catch (e) {
      api.error({ message: 'Lỗi', description: 'Không thể tải danh sách kho tổng.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async () => {
    if (selectedEquipIds.length === 0) return setIsAddModalOpen(false);
    try {
      setLoading(true);
      for (const equipId of selectedEquipIds) {
        const equip = equipments.find(e => e.id === equipId);
        await roomInventoryApi.createInventory({
          roomId: room.id,
          equipmentId: equip.id,
          quantity: equipQuantities[equip.id] || 1,
          priceIfLost: equip.defaultPriceIfLost || 0,
          note: "Thêm thủ công"
        });
      }
      api.success({ message: 'Thành công', description: `Đã thêm ${selectedEquipIds.length} vật tư vào phòng.` });
      setIsAddModalOpen(false);
      fetchInventories(false);
    } catch (e) {
      api.error({ message: 'Lỗi', description: 'Có lỗi trong quá trình thêm vật tư.' });
    } finally {
      setLoading(false);
    }
  };

  const onSelectEquipChange = (newSelectedRowKeys) => {
    setSelectedEquipIds(newSelectedRowKeys);
    const newQuantities = { ...equipQuantities };
    newSelectedRowKeys.forEach(id => { if (!newQuantities[id]) newQuantities[id] = 1; });
    setEquipQuantities(newQuantities);
  };

  // ==============================================
  // TÍNH NĂNG 2: CLONE TỪ PHÒNG MẪU
  // ==============================================
  const openCloneModal = async () => {
    try {
      setLoading(true);
      const data = await roomApi.getRooms(true);
      setAllRooms(data.filter(r => r.id !== room.id) || []);
      cloneForm.resetFields();
      setIsCloneModalOpen(true);
    } catch (e) {
      api.error({ message: 'Lỗi', description: 'Không thể tải danh sách phòng.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCloneSubmit = async (values) => {
    try {
      setLoading(true);
      await roomInventoryApi.cloneInventory({
        sourceRoomId: values.sourceRoomId,
        targetRoomId: room.id
      });
      api.success({ message: 'Thành công', description: 'Đã sao chép vật tư thành công!' });
      setIsCloneModalOpen(false);
      fetchInventories(false);
    } catch (error) {
      api.error({ message: 'Lỗi Clone', description: error.response?.data?.message || 'Có lỗi xảy ra.' });
    } finally {
      setLoading(false);
    }
  };

  // ==============================================
  // TÍNH NĂNG 3: SỬA / XÓA VẬT TƯ ĐÃ CÓ
  // ==============================================
  const handleDelete = async (id) => {
    try {
      setLoading(true);
      await roomInventoryApi.deleteInventory(id);
      api.success({ message: 'Thành công', description: 'Đã gỡ vật tư khỏi phòng.' });
      fetchInventories(false);
    } catch (e) {
      api.error({ message: 'Lỗi', description: 'Không thể gỡ vật tư.' });
      setLoading(false);
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    editForm.setFieldsValue(item);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (values) => {
    try {
      setLoading(true);
      await roomInventoryApi.updateInventory(editingItem.id, values);
      api.success({ message: 'Thành công', description: 'Cập nhật số lượng/giá thành công.' });
      setIsEditModalOpen(false);
      fetchInventories(false);
    } catch (error) {
      api.error({ message: 'Lỗi', description: error.response?.data?.message || 'Cập nhật thất bại.' });
    } finally {
      setLoading(false);
    }
  };

  // ==============================================
  // BỘ LỌC HIỂN THỊ
  // ==============================================
  const filteredInventories = inventories.filter(item => 
    item.equipmentName?.toLowerCase().includes(searchText.toLowerCase())
  );

  const currentEquipIds = inventories.map(i => i.equipmentId);
  const availableEquipments = equipments.filter(e => 
    !currentEquipIds.includes(e.id) && 
    (e.name.toLowerCase().includes(searchEquipText.toLowerCase()) || (e.itemCode && e.itemCode.toLowerCase().includes(searchEquipText.toLowerCase())))
  );

  return (
    <div style={{ paddingTop: 16 }}>
      {/* CHỈ CÓ 1 CONTEXT HOLDER DUY NHẤT Ở GÓC DƯỚI */}
      {contextHolder}
      
      {/* THANH CÔNG CỤ (TÌM KIẾM & NÚT BẤM) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <Input 
          placeholder="Tìm vật tư trong phòng..." 
          prefix={<MagnifyingGlass color={COLORS.MUTED} />} 
          size="large"
          allowClear
          onChange={e => setSearchText(e.target.value)} 
          style={{ width: '100%', maxWidth: 350, borderRadius: 8 }}
        />
        <Space wrap>
          <Tooltip title="Cập nhật giá đền bù cho bằng với Kho tổng">
            <Button icon={<ArrowsClockwise />} size="large" onClick={handleSyncWithGlobalInventory} loading={loading}>
              Đồng bộ giá
            </Button>
          </Tooltip>
          <Button icon={<Copy />} size="large" onClick={openCloneModal}>Clone phòng mẫu</Button>
          <Button type="primary" icon={<Plus weight="bold" />} size="large" style={{ backgroundColor: COLORS.ACCENT_RED }} onClick={openAddModal}>
            Thêm từ Kho
          </Button>
        </Space>
      </div>

      {/* DANH SÁCH VẬT TƯ TRONG PHÒNG */}
      {screens.md ? (
        <Table 
          dataSource={filteredInventories} 
          rowKey="id" 
          loading={loading}
          pagination={false}
          scroll={{ x: 600 }}
          style={{ border: `1px solid ${COLORS.LIGHTEST}`, borderRadius: 8 }}
          columns={[
            { 
              title: 'Tên Vật Tư', 
              dataIndex: 'equipmentName', 
              render: (t) => <Text strong style={{ color: COLORS.DARKEST, fontSize: 15 }}>{t}</Text> 
            },
            { 
              title: 'Số lượng', 
              dataIndex: 'quantity', 
              align: 'center', 
              width: 120,
              render: q => <Tag color="blue" style={{ fontSize: 14, padding: '2px 8px' }}>{q}</Tag> 
            },
            { 
              title: 'Giá đền bù (Khách làm hỏng)', 
              dataIndex: 'priceIfLost', 
              align: 'right',
              render: p => <Text strong style={{ color: COLORS.ACCENT_RED }}>{new Intl.NumberFormat('vi-VN').format(p || 0)} đ</Text> 
            },
            { 
              title: 'Ghi chú', 
              dataIndex: 'note', 
              render: n => <Text type="secondary">{n || '-'}</Text> 
            },
            { 
              title: 'Hành động', 
              key: 'action', 
              align: 'right',
              width: 120,
              render: (_, record) => (
                <Space size="small">
                  <Button type="text" icon={<PencilSimple size={18} color={COLORS.MIDNIGHT_BLUE} />} onClick={() => openEditModal(record)} />
                  <Popconfirm title="Gỡ vật tư này?" onConfirm={() => handleDelete(record.id)} okText="Xóa" okButtonProps={{ danger: true }}>
                    <Button type="text" danger icon={<Trash size={18} />} />
                  </Popconfirm>
                </Space>
              )
            }
          ]}
        />
      ) : (
        /* GIAO DIỆN MOBILE */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredInventories.map(item => (
            <Card key={item.id} size="small" style={{ borderRadius: 10, border: `1px solid ${COLORS.LIGHTEST}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <Text strong style={{ fontSize: 16 }}>{item.equipmentName}</Text>
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>Giá đền bù: <Text strong style={{ color: COLORS.ACCENT_RED }}>{new Intl.NumberFormat('vi-VN').format(item.priceIfLost || 0)} đ</Text></Text>
                  </div>
                </div>
                <Tag color="blue" style={{ fontSize: 14, margin: 0 }}>SL: {item.quantity}</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
                <Button size="small" icon={<PencilSimple />} onClick={() => openEditModal(item)}>Sửa</Button>
                <Popconfirm title="Xóa?" onConfirm={() => handleDelete(item.id)}>
                  <Button size="small" danger icon={<Trash />} />
                </Popconfirm>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL 1: THÊM VẬT TƯ TỪ KHO */}
      <Modal 
        title={<span style={{color: COLORS.DARKEST, fontSize: 18}}><Archive style={{marginRight: 8}}/>Thêm Tiện ích vào phòng</span>} 
        open={isAddModalOpen} 
        onCancel={() => setIsAddModalOpen(false)}
        width={800}
        footer={[
          <Button key="back" onClick={() => setIsAddModalOpen(false)}>Hủy</Button>,
          <Button key="submit" type="primary" style={{ backgroundColor: COLORS.ACCENT_RED }} onClick={handleAddSubmit} disabled={selectedEquipIds.length === 0}>
            Xác nhận thêm ({selectedEquipIds.length})
          </Button>
        ]}
      >
        <Input 
          placeholder="Tìm vật tư trong kho..." 
          prefix={<MagnifyingGlass />} 
          onChange={e => setSearchEquipText(e.target.value)} 
          style={{ marginBottom: 16 }} 
        />
        <Table 
          rowSelection={{ selectedRowKeys: selectedEquipIds, onChange: onSelectEquipChange }} 
          dataSource={availableEquipments} 
          rowKey="id"
          size="small"
          scroll={{ y: 350 }}
          pagination={false}
          columns={[
            { 
              title: 'Vật tư', 
              dataIndex: 'name', 
              render: (t, r) => <><Text strong>{t}</Text><br/><Text type="secondary" style={{fontSize: 12}}>Mã: {r.itemCode}</Text></>
            },
            { 
              title: 'Tồn kho', 
              dataIndex: 'inStockQuantity', 
              align: 'center',
              width: 90,
              render: (stock) => <Tag color={stock > 0 ? "green" : "red"}>{stock ?? 'N/A'}</Tag>
            },
            { 
              title: 'SL Bố trí', 
              key: 'quantity', 
              align: 'center',
              width: 120,
              render: (_, record) => {
                const isSelected = selectedEquipIds.includes(record.id);
                return (
                  <InputNumber 
                    min={1} 
                    max={record.inStockQuantity ?? 999} 
                    value={equipQuantities[record.id]} 
                    onChange={(val) => setEquipQuantities({ ...equipQuantities, [record.id]: val })}
                    disabled={!isSelected} 
                    style={{ width: '100%' }}
                  />
                );
              }
            }
          ]}
        />
      </Modal>

      {/* MODAL 2: CLONE TỪ PHÒNG KHÁC */}
      <Modal 
        title={<span style={{color: COLORS.DARKEST, fontSize: 18}}><Copy style={{marginRight: 8}}/>Clone dữ liệu từ phòng mẫu</span>} 
        open={isCloneModalOpen} 
        onCancel={() => setIsCloneModalOpen(false)}
        footer={null}
      >
        <Form form={cloneForm} layout="vertical" onFinish={handleCloneSubmit}>
          <div style={{ background: '#e6f4ff', padding: 12, borderRadius: 8, marginBottom: 16 }}>
            <Text>Hệ thống sẽ sao chép toàn bộ danh sách đồ dùng từ phòng bạn chọn sang phòng <Text strong>{room.roomNumber}</Text>.</Text>
          </div>
          <Form.Item name="sourceRoomId" label="Chọn phòng muốn copy:" rules={[{ required: true, message: 'Vui lòng chọn 1 phòng' }]}>
            <Select 
              size="large" 
              showSearch
              optionFilterProp="label"
              options={allRooms.map(r => ({ value: r.id, label: `Phòng ${r.roomNumber} (${r.roomTypeName})` }))} 
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={loading} style={{ backgroundColor: COLORS.MIDNIGHT_BLUE }}>
            BẮT ĐẦU SAO CHÉP
          </Button>
        </Form>
      </Modal>

      {/* MODAL 3: SỬA THÔNG TIN VẬT TƯ */}
      <Modal 
        title={<span style={{color: COLORS.DARKEST, fontSize: 18}}><PencilSimple style={{marginRight: 8}}/>Chỉnh sửa Vật tư trong phòng</span>} 
        open={isEditModalOpen} 
        onCancel={() => setIsEditModalOpen(false)}
        footer={null}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditSubmit}>
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">Đang sửa:</Text> <Text strong style={{ fontSize: 16, color: COLORS.ACCENT_RED }}>{editingItem?.equipmentName}</Text>
          </div>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="quantity" label="Số lượng thực tế" rules={[{ required: true }]}>
                <InputNumber size="large" min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priceIfLost" label="Giá đền bù (VND)" rules={[{ required: true }]}>
                <InputNumber size="large" style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v.replace(/\$\s?|(,*)/g, '')} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="note" label="Ghi chú thêm (Tình trạng đồ...)">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={loading} style={{ backgroundColor: COLORS.MIDNIGHT_BLUE }}>
            CẬP NHẬT
          </Button>
        </Form>
      </Modal>

    </div>
  );
}