import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Input, Select, Table, Tag, Modal, Form, InputNumber, Row, Col, notification, Space, Tooltip, Grid, Image, Popconfirm, Upload, Checkbox, Divider } from 'antd';
import { MagnifyingGlass, Plus, PencilSimple, LockKey, LockOpen, DoorOpen, ImageSquare, Image as ImageIcon, Trash, CheckCircle, UploadSimple, Sparkle, Users } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';

import { roomTypeApi } from "../../api/roomTypeApi";
import { mediaApi } from "../../api/mediaApi";
import { amenityApi } from "../../api/amenityApi"; 
import { COLORS } from "../../constants/theme";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function RoomSetupPage() {
  const navigate = useNavigate();
  // 🔥 Đã đẩy thông báo xuống góc dưới bên phải
  const [api, contextHolder] = notification.useNotification({ placement: 'bottomRight' });
  const screens = useBreakpoint(); 

  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); 

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [editForm] = Form.useForm();

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [managingRoomType, setManagingRoomType] = useState(null);

  const [isAmenityModalOpen, setIsAmenityModalOpen] = useState(false);
  const [allAmenities, setAllAmenities] = useState([]);
  const [selectedAmenityIds, setSelectedAmenityIds] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rtData, amData] = await Promise.all([
        roomTypeApi.getRoomTypes(false),
        amenityApi.getAmenities(true) 
      ]);
      setRoomTypes(rtData || []);
      setAllAmenities(amData || []);
    } catch (error) {
      api.error({ message: 'Lỗi', description: 'Không tải được dữ liệu hệ thống.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      setLoading(true);
      await roomTypeApi.deleteRoomType(id); 
      api.success({ message: 'Thành công', description: `Đã ${currentStatus ? 'khóa' : 'mở lại'} hạng phòng!` });
      fetchData();
    } catch (error) {
      api.error({ message: 'Lỗi', description: 'Không thể thay đổi trạng thái.' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (record) => {
    setEditingType(record);
    editForm.setFieldsValue(record);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (values) => {
    try {
      setLoading(true);
      
      // 🔥 BÙ ĐẮP DỮ LIỆU: C# Backend yêu cầu các trường này không được rỗng (Null)
      const payload = {
        name: values.name,
        basePrice: values.basePrice,
        capacityAdults: values.capacityAdults,
        capacityChildren: values.capacityChildren,
        sizeSqm: values.sizeSqm || null,
        bedType: values.bedType || "",
        description: editingType.description || "",
        viewDirection: editingType.viewDirection || ""
      };

      await roomTypeApi.updateRoomType(editingType.id, payload);
      api.success({ message: 'Thành công', description: 'Đã cập nhật thông tin hạng phòng!' });
      setIsEditModalOpen(false);
      fetchData();
    } catch (error) {
      api.error({ message: 'Lỗi', description: 'Cập nhật thất bại. Vui lòng kiểm tra lại.' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenImageManager = (record) => {
    setManagingRoomType(record);
    setIsImageModalOpen(true);
  };

  const handleUploadImage = async (options) => {
    const { file, onSuccess, onError } = options;
    try {
      setLoading(true);
      const uploadRes = await mediaApi.uploadImage(file);
      const newImageUrl = uploadRes.data?.url || uploadRes.url || uploadRes;
      const isFirstImage = !managingRoomType.images || managingRoomType.images.length === 0;
      await roomTypeApi.addRoomImage(managingRoomType.id, { imageUrl: newImageUrl, isPrimary: isFirstImage });
      api.success({ message: 'Thành công', description: 'Đã tải ảnh mới lên!' });
      fetchData(); 
      onSuccess("ok");
    } catch (error) {
      api.error({ message: 'Lỗi', description: 'Không thể tải ảnh lên server.' });
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    try {
      setLoading(true);
      await roomTypeApi.deleteRoomImage(imageId);
      api.success({ message: 'Thành công', description: 'Đã xóa ảnh.' });
      fetchData();
    } catch (error) {
      api.error({ message: 'Lỗi', description: 'Không thể xóa ảnh.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimaryImage = async (imageId) => {
    try {
      setLoading(true);
      await roomTypeApi.setPrimaryImage(managingRoomType.id, imageId);
      api.success({ message: 'Thành công', description: 'Đã đặt làm ảnh bìa mặc định.' });
      fetchData();
    } catch (error) {
      api.error({ message: 'Lỗi', description: 'Không thể đổi ảnh mặc định.' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAmenityManager = (record) => {
    setManagingRoomType(record);
    const currentAssignedIds = record.amenities?.map(a => a.id) || [];
    setSelectedAmenityIds(currentAssignedIds);
    setIsAmenityModalOpen(true);
  };

  const handleSaveAmenities = async () => {
    try {
      setLoading(true);
      await amenityApi.assignToRoomType({
        roomTypeId: managingRoomType.id,
        amenityIds: selectedAmenityIds
      });
      api.success({ message: 'Thành công', description: 'Đã cập nhật danh sách tiện ích.' });
      setIsAmenityModalOpen(false);
      fetchData(); 
    } catch (error) {
      api.error({ message: 'Lỗi', description: 'Cập nhật tiện ích thất bại.' });
    } finally {
      setLoading(false);
    }
  };

  const activeRoomType = roomTypes.find(rt => rt.id === managingRoomType?.id);

  const filteredData = roomTypes.filter(rt => {
    const matchName = rt.name?.toLowerCase().includes(searchText.toLowerCase());
    const matchStatus = filterStatus === 'all' ? true : (filterStatus === 'active' ? rt.isActive : !rt.isActive);
    return matchName && matchStatus;
  }).sort((a, b) => {
    if (a.isActive === b.isActive) return 0;
    return a.isActive ? -1 : 1; 
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: 24 }}>
      {contextHolder}
      <style>{`.inactive-row { opacity: 0.65; background-color: #fafafa; } .inactive-row:hover { opacity: 0.85 !important; }`}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={3} style={{ color: COLORS.MIDNIGHT_BLUE, margin: '0 0 8px 0', fontFamily: '"Source Serif 4", serif' }}>
            Danh mục Hạng Phòng
          </Title>
          <Text type="secondary">Quản lý các hạng phòng của khách sạn.</Text>
        </div>
        
        <Button 
          type="primary" 
          size="large"
          icon={<Plus weight="bold" />} 
          style={{ backgroundColor: COLORS.ACCENT_RED, fontWeight: 'bold', borderRadius: 8 }}
          onClick={() => navigate('/admin/room-setup/create')}
        >
          THÊM HẠNG PHÒNG
        </Button>
      </div>

      <Card variant="borderless" style={{ borderRadius: 12, marginBottom: 24, backgroundColor: COLORS.LIGHTEST }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12} lg={8}>
            <Input 
              placeholder="Tìm tên hạng phòng..." 
              size="large" 
              allowClear
              prefix={<MagnifyingGlass color={COLORS.MUTED} />}
              value={searchText} 
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Col>
          <Col xs={24} md={12} lg={6}>
            <Select
              size="large" 
              style={{ width: '100%' }} 
              value={filterStatus} 
              onChange={setFilterStatus}
              options={[
                { value: 'all', label: 'Tất cả trạng thái' },
                { value: 'active', label: 'Đang hoạt động' },
                { value: 'inactive', label: 'Đã khóa' }
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Card variant="borderless" style={{ borderRadius: 12, border: `1px solid ${COLORS.LIGHTEST}`, flex: 1, padding: screens.md ? '0' : '16px 0' }}>
        {screens.md ? (
          <Table 
            dataSource={filteredData} 
            rowKey="id" 
            loading={loading}
            scroll={{ x: 1000 }} 
            pagination={{ pageSize: 10 }}
            rowClassName={(record) => !record.isActive ? 'inactive-row' : ''} 
            columns={[
              {
                title: 'Ảnh Bìa',
                key: 'image',
                width: 90,
                align: 'center',
                render: (_, record) => {
                  const coverImg = record.images?.find(i => i.isPrimary) || record.images?.[0];
                  return coverImg ? (
                    // 🔥 Bỏ mask={...} để tắt cảnh báo ReactNode
                    <Image src={coverImg.imageUrl} alt="room cover" style={{ width: 70, height: 46, objectFit: 'cover', borderRadius: 6, border: '1px solid #e8e8e8' }} />
                  ) : (
                    <div style={{ width: 70, height: 46, background: '#f5f5f5', borderRadius: 6, border: '1px dashed #d9d9d9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageSquare size={20} color="#bfbfbf" /></div>
                  );
                }
              },
              { title: 'Tên Hạng Phòng', dataIndex: 'name', key: 'name', render: (text) => <Text strong style={{ color: COLORS.DARKEST, fontSize: 15 }}>{text}</Text> },
              { title: 'Giá Tiêu Chuẩn', dataIndex: 'basePrice', align: 'right', render: (price) => <Text strong style={{ color: COLORS.ACCENT_RED }}>{new Intl.NumberFormat('vi-VN').format(price || 0)} đ</Text> },
              { title: 'Sức Chứa', key: 'capacity', align: 'center', render: (_, record) => <Tag color="blue">{record.capacityAdults} L, {record.capacityChildren} N</Tag> },
              { 
                title: 'Trạng thái', 
                dataIndex: 'isActive', 
                align: 'center',
                render: (isActive) => <Tag color={isActive ? 'success' : 'default'} style={{ fontWeight: 600, margin: 0 }}>{isActive ? 'Hoạt động' : 'Đã khóa'}</Tag>
              },
              { 
                title: 'Hành động', 
                key: 'action', 
                align: 'right',
                width: 260,
                render: (_, record) => (
                  <Space size="small">
                    <Tooltip title={record.isActive ? "Sơ đồ phòng vật lý" : "Mở khóa để xem"}>
                      <Button type="primary" style={{ backgroundColor: record.isActive ? COLORS.MIDNIGHT_BLUE : COLORS.MUTED }} icon={<DoorOpen size={18} />} onClick={() => navigate(`/admin/room-setup/${record.id}`)} disabled={!record.isActive} />
                    </Tooltip>
                    <Tooltip title={record.isActive ? "Tiện ích hiển thị" : "Mở khóa để gán"}>
                      <Button icon={<Sparkle size={18} color="#B4CDED" />} onClick={() => handleOpenAmenityManager(record)} disabled={!record.isActive} />
                    </Tooltip>
                    <Tooltip title={record.isActive ? "Thư viện Ảnh" : "Mở khóa để sửa ảnh"}>
                      <Button icon={<ImageIcon size={18} />} onClick={() => handleOpenImageManager(record)} disabled={!record.isActive} />
                    </Tooltip>
                    <Tooltip title={record.isActive ? "Sửa thông tin" : "Mở khóa để sửa"}>
                      <Button icon={<PencilSimple size={18} />} onClick={() => handleOpenEdit(record)} disabled={!record.isActive} />
                    </Tooltip>
                    <Tooltip title={record.isActive ? "Khóa" : "Mở lại"}>
                      <Button danger={record.isActive} type={!record.isActive ? "primary" : "default"} style={{ backgroundColor: !record.isActive ? COLORS.DARKEST : '' }} icon={record.isActive ? <LockKey size={18} /> : <LockOpen size={18} />} onClick={() => handleToggleStatus(record.id, record.isActive)} />
                    </Tooltip>
                  </Space>
                )
              }
            ]}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '0 16px' }}>
            {filteredData.map(item => {
              const coverImg = item.images?.find(i => i.isPrimary) || item.images?.[0];
              return (
                <Card 
                  key={item.id} 
                  variant="borderless"
                  styles={{ body: { padding: 0 } }}
                  style={{ overflow: 'hidden', borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', background: item.isActive ? '#fff' : '#f9f9f9', opacity: item.isActive ? 1 : 0.8 }}
                >
                  <div style={{ position: 'relative', width: '100%', height: 180 }}>
                    {coverImg ? (
                      <img src={coverImg.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={item.name} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageSquare size={48} color="#bfbfbf" /></div>
                    )}
                    <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 2 }}>
                      <Tag color={item.isActive ? 'success' : 'default'} style={{ margin: 0, padding: '4px 12px', borderRadius: 20, fontWeight: 600, boxShadow: '0 2px 4px rgba(0,0,0,0.2)', backdropFilter: 'blur(4px)', border: 'none' }}>
                        {item.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                      </Tag>
                    </div>
                  </div>
                  <div style={{ padding: '16px' }}>
                    <Title level={4} style={{ margin: '0 0 4px 0', color: COLORS.DARKEST }}>{item.name}</Title>
                    <Text style={{ fontSize: 18, color: COLORS.ACCENT_RED, fontWeight: 700 }}>{new Intl.NumberFormat('vi-VN').format(item.basePrice || 0)} đ</Text>
                    <div style={{ marginTop: 8 }}>
                      <Space wrap>
                        <Tag color="blue" icon={<Users size={14} style={{marginRight: 4, verticalAlign: 'middle'}}/>}>{item.capacityAdults} L, {item.capacityChildren} N</Tag>
                        {item.bedType && <Tag color="cyan">{item.bedType}</Tag>}
                      </Space>
                    </div>
                    <Divider style={{ margin: '16px 0' }} />
                    <Row gutter={[12, 12]}>
                      <Col span={8}><Tooltip title="Sơ đồ"><Button block size="large" type="primary" style={{ backgroundColor: item.isActive ? COLORS.MIDNIGHT_BLUE : COLORS.MUTED, borderRadius: 10 }} icon={<DoorOpen size={22} />} onClick={() => navigate(`/admin/room-setup/${item.id}`)} disabled={!item.isActive} /></Tooltip></Col>
                      <Col span={8}><Tooltip title="Tiện ích"><Button block size="large" style={{ borderRadius: 10, border: `1px solid #faad14` }} icon={<Sparkle size={22} color="#faad14" weight="fill" />} onClick={() => handleOpenAmenityManager(item)} disabled={!item.isActive} /></Tooltip></Col>
                      <Col span={8}><Tooltip title="Ảnh"><Button block size="large" style={{ borderRadius: 10 }} icon={<ImageIcon size={22} color={COLORS.MIDNIGHT_BLUE} />} onClick={() => handleOpenImageManager(item)} disabled={!item.isActive} /></Tooltip></Col>
                      <Col span={12}><Button block size="large" icon={<PencilSimple size={20} />} style={{ borderRadius: 10 }} onClick={() => handleOpenEdit(item)} disabled={!item.isActive}>Sửa</Button></Col>
                      <Col span={12}><Button block size="large" danger={item.isActive} type={!item.isActive ? "primary" : "default"} style={{ backgroundColor: !item.isActive ? COLORS.DARKEST : '', borderRadius: 10 }} icon={item.isActive ? <LockKey size={20} /> : <LockOpen size={20} />} onClick={() => handleToggleStatus(item.id, item.isActive)}>{item.isActive ? 'Khóa' : 'Mở'}</Button></Col>
                    </Row>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      <Modal title={<span style={{color: COLORS.DARKEST, fontSize: 18}}>Chỉnh sửa Hạng phòng</span>} open={isEditModalOpen} onCancel={() => setIsEditModalOpen(false)} footer={null} width={700}>
        <Form form={editForm} layout="vertical" onFinish={handleSaveEdit}>
          <Row gutter={16}>
            <Col xs={24} md={16}><Form.Item name="name" label="Tên Hạng phòng" rules={[{ required: true }]}><Input size="large" /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="basePrice" label="Giá (VND)" rules={[{ required: true }]}><InputNumber size="large" style={{ width: '100%' }} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/\$\s?|(,*)/g, '')} /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item name="capacityAdults" label="Người lớn" rules={[{ required: true }]}><InputNumber size="large" min={1} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item name="capacityChildren" label="Trẻ em" rules={[{ required: true }]}><InputNumber size="large" min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item name="sizeSqm" label="Diện tích (m²)"><InputNumber size="large" min={1} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item name="bedType" label="Giường"><Select size="large" options={[{value: '1 Giường Đơn'}, {value: '2 Giường Đơn'}, {value: '1 Giường Đôi'}, {value: '2 Giường Đôi'}, {value: '1 Đôi + 1 Đơn'}, {value: 'Không Giường'}]} /></Form.Item></Col>
          </Row>
          <Button type="primary" htmlType="submit" size="large" block loading={loading} style={{ backgroundColor: COLORS.MIDNIGHT_BLUE, fontWeight: 'bold', marginTop: 12 }}>LƯU THAY ĐỔI</Button>
        </Form>
      </Modal>

      <Modal title={<Title level={4} style={{ color: COLORS.MIDNIGHT_BLUE, margin: 0 }}>Kho ảnh: {activeRoomType?.name}</Title>} open={isImageModalOpen} onCancel={() => setIsImageModalOpen(false)} footer={null} width={750} centered>
        <div style={{ marginBottom: 24, textAlign: 'center', padding: '20px', backgroundColor: '#f9fbfd', borderRadius: 8, border: '1px dashed #d9d9d9' }}>
          <Upload customRequest={handleUploadImage} showUploadList={false} accept="image/*">
            <Button size="large" type="primary" icon={<UploadSimple size={20} />} loading={loading} style={{ backgroundColor: COLORS.ACCENT_RED, fontWeight: 'bold' }}>Tải Ảnh Mới Lên</Button>
          </Upload>
        </div>
        <Row gutter={[16, 16]}>
          {activeRoomType?.images?.map(img => (
            <Col xs={24} sm={12} md={8} key={img.id}>
              <Card hoverable cover={<Image src={img.imageUrl} style={{ height: 140, objectFit: 'cover' }} />} style={{ border: img.isPrimary ? `2px solid ${COLORS.ACCENT_RED}` : '1px solid #f0f0f0' }}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  {img.isPrimary ? <Tag color="error" block><CheckCircle weight="fill"/> Ảnh đại diện</Tag> : <Button size="small" type="dashed" onClick={() => handleSetPrimaryImage(img.id)} block>Đặt đại diện</Button>}
                  <Popconfirm title="Xóa ảnh?" onConfirm={() => handleDeleteImage(img.id)}><Button size="small" danger block icon={<Trash />}>Xóa</Button></Popconfirm>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Modal>

      <Modal title={<Title level={4} style={{ color: COLORS.MIDNIGHT_BLUE, margin: 0 }}>Tiện ích cho: {activeRoomType?.name}</Title>} open={isAmenityModalOpen} onCancel={() => setIsAmenityModalOpen(false)} footer={[
          <Button key="back" onClick={() => setIsAmenityModalOpen(false)}>Hủy</Button>,
          <Button key="submit" type="primary" loading={loading} onClick={handleSaveAmenities} style={{ backgroundColor: COLORS.MIDNIGHT_BLUE }}>Lưu thay đổi</Button>
      ]}>
        <Checkbox.Group style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto' }} value={selectedAmenityIds} onChange={(v) => setSelectedAmenityIds(v)}>
          {allAmenities.map(amenity => (
            <div key={amenity.id} style={{ padding: '8px 12px', border: '1px solid #f0f0f0', borderRadius: 6 }}>
              <Checkbox value={amenity.id}><Text strong style={{ fontSize: 16, marginLeft: 8 }}>{amenity.name}</Text></Checkbox>
            </div>
          ))}
        </Checkbox.Group>
      </Modal>

    </div>
  );
}