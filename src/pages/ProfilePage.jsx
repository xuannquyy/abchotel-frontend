import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Typography, Space, Row, Col, Avatar, Divider, notification, Tabs, Select, DatePicker, Modal, Upload } from 'antd';
import { UserCircle, EnvelopeSimple, Phone, MapPin, Camera, ShieldCheck, Star, UploadSimple } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import { profileApi } from '../api/profileApi';
import { mediaApi } from '../api/mediaApi';
import { useAuthStore } from '../store/authStore';

const { Title, Text } = Typography;
const ACCENT_RED = '#8A1538';
const MIDNIGHT_BLUE = '#1C2E4A';

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [infoForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const checkAuth = useAuthStore(state => state.checkAuth);

  // ================= 1. FETCH DỮ LIỆU PROFILE =================
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await profileApi.getMyProfile();
      setProfile(res);
      
      infoForm.setFieldsValue({
        fullName: res.fullName,
        phone: res.phone,
        address: res.address,
        gender: res.gender || null, 
        dateOfBirth: res.dateOfBirth ? dayjs(res.dateOfBirth) : null
      });
    } catch (error) {
      notification.error({ message: 'Lỗi tải thông tin cá nhân', placement: 'bottomRight' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // ================= 2. CẬP NHẬT THÔNG TIN CÁ NHÂN =================
  const onFinishUpdateInfo = async (values) => {
    try {
      setLoading(true);
      const payload = {
        ...values,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : null
      };
      
      await profileApi.updateProfile(payload);
      notification.success({ message: 'Đã cập nhật hồ sơ cá nhân!', placement: 'bottomRight' });
      fetchProfile(); 
      checkAuth();    
    } catch (error) {
      notification.error({ message: error.response?.data?.message || 'Cập nhật thất bại', placement: 'bottomRight' });
    } finally {
      setLoading(false);
    }
  };

  // ================= 3. ĐỔI MẬT KHẨU =================
  const onFinishChangePassword = async (values) => {
    try {
      setLoading(true);
      await profileApi.changePassword({ oldPassword: values.oldPassword, newPassword: values.newPassword });
      notification.success({ message: 'Đổi mật khẩu thành công!', placement: 'bottomRight' });
      passwordForm.resetFields(); 
    } catch (error) {
      notification.error({ message: error.response?.data?.message || 'Đổi mật khẩu thất bại', placement: 'bottomRight' });
    } finally {
      setLoading(false);
    }
  };

  // ================= 4. UPLOAD & CẬP NHẬT AVATAR TỪ MÁY TÍNH =================
  const handleUploadAvatar = async (options) => {
    const { file, onSuccess, onError } = options;
    try {
      setLoading(true);
      
      // Bước 1: Gửi file ảnh lên API MediaController để lưu vào Cloudinary
      const uploadRes = await mediaApi.uploadImage(file);
      
      // Lấy đường link URL Cloudinary từ kết quả trả về
      const imageUrl = uploadRes.data.url; 

      // Bước 2: Gọi API cập nhật Avatar của UserProfile với đường link vừa lấy được
      await profileApi.uploadAvatar({ avatarUrl: imageUrl });
      
      notification.success({ message: 'Đã cập nhật ảnh đại diện thành công!', placement: 'bottomRight' });
      
      setIsAvatarModalOpen(false);
      fetchProfile(); 
      checkAuth();    
      onSuccess("ok");

    } catch (error) {
      notification.error({ message: 'Lỗi khi tải ảnh lên, vui lòng thử lại!', placement: 'bottomRight' });
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return <div style={{ textAlign: 'center', padding: '50px' }}>Đang tải dữ liệu...</div>; 

  return (
    <div>
      <Title level={3} style={{ color: MIDNIGHT_BLUE, fontFamily: '"Source Serif 4", serif', marginBottom: 24 }}>Hồ sơ Cá nhân</Title>

      <Row gutter={[24, 24]}>
        {/* ================= CỘT TRÁI: THẺ THÔNG TIN NHANH ================= */}
        <Col xs={24} md={8}>
          <Card variant="borderless" style={{ borderRadius: 16, textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
            
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
              <Avatar 
                size={120} 
                src={profile.avatarUrl} 
                icon={<UserCircle />} 
                style={{ backgroundColor: '#e9f0f8', color: '#52677D', border: `4px solid ${MIDNIGHT_BLUE}` }} 
              />
              <Button 
                type="primary" 
                shape="circle" 
                icon={<Camera size={18} />} 
                onClick={() => setIsAvatarModalOpen(true)}
                style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: ACCENT_RED, border: 'none', boxShadow: '0 4px 10px rgba(138, 21, 56, 0.4)' }}
              />
            </div>

            <Title level={4} style={{ color: MIDNIGHT_BLUE, margin: 0 }}>{profile.fullName}</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>{profile.roleName}</Text>

            <Divider dashed style={{ margin: '16px 0' }} />

            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Space><EnvelopeSimple size={18} color="#52677D" /> <Text>{profile.email}</Text></Space>
              <Space><Phone size={18} color="#52677D" /> <Text>{profile.phone || 'Chưa cập nhật SĐT'}</Text></Space>
              <Space><MapPin size={18} color="#52677D" /> <Text>{profile.address || 'Chưa cập nhật Địa chỉ'}</Text></Space>
              <Space><Star size={18} color="#fadb14" weight="fill" /> <Text strong>{profile.totalPoints} Điểm tích lũy</Text></Space>
            </div>
          </Card>
        </Col>

        {/* ================= CỘT PHẢI: FORM CHỈNH SỬA ================= */}
        <Col xs={24} md={16}>
          <Card variant="borderless" style={{ borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.05)', minHeight: '100%' }}>
            <Tabs 
              defaultActiveKey="1" 
              items={[
                {
                  key: '1',
                  label: <span style={{ fontWeight: 600, fontSize: 15 }}><UserCircle size={18} style={{ marginRight: 6 }}/>Thông tin chung</span>,
                  children: (
                    <Form form={infoForm} layout="vertical" onFinish={onFinishUpdateInfo} style={{ marginTop: 16 }}>
                      <Row gutter={16}>
                        <Col span={24}>
                          <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
                            <Input size="large" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item name="phone" label="Số điện thoại" rules={[{ pattern: /^0\d{9}$/, message: 'SĐT không hợp lệ' }]}>
                            <Input size="large" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item name="gender" label="Giới tính">
                            <Select size="large" options={[{ value: 'Nam', label: 'Nam' }, { value: 'Nữ', label: 'Nữ' }, { value: 'Khác', label: 'Khác' }]} />
                          </Form.Item>
                        </Col>
                        <Col span={24}>
                          <Form.Item name="address" label="Địa chỉ">
                            <Input size="large" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item name="dateOfBirth" label="Ngày sinh">
                            <DatePicker size="large" style={{ width: '100%' }} format="DD/MM/YYYY" />
                          </Form.Item>
                        </Col>
                      </Row>
                      <div style={{ textAlign: 'right', marginTop: 16 }}>
                        <Button type="primary" htmlType="submit" size="large" loading={loading} style={{ backgroundColor: MIDNIGHT_BLUE, fontWeight: 'bold' }}>
                          Lưu Thông Tin
                        </Button>
                      </div>
                    </Form>
                  )
                },
                {
                  key: '2',
                  label: <span style={{ fontWeight: 600, fontSize: 15 }}><ShieldCheck size={18} style={{ marginRight: 6 }}/>Đổi mật khẩu</span>,
                  children: (
                    <Form form={passwordForm} layout="vertical" onFinish={onFinishChangePassword} style={{ marginTop: 16, maxWidth: 400 }}>
                      <Form.Item name="oldPassword" label="Mật khẩu hiện tại" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu cũ' }]}>
                        <Input.Password size="large" />
                      </Form.Item>
                      
                      <Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu mới' }, { min: 6, message: 'Mật khẩu phải từ 6 ký tự' }]}>
                        <Input.Password size="large" />
                      </Form.Item>
                      
                      <Form.Item name="confirmPassword" label="Xác nhận mật khẩu mới" dependencies={['newPassword']} rules={[
                        { required: true, message: 'Vui lòng xác nhận mật khẩu' },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                            return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                          },
                        }),
                      ]}>
                        <Input.Password size="large" />
                      </Form.Item>

                      <div style={{ marginTop: 24 }}>
                        <Button type="primary" htmlType="submit" size="large" loading={loading} style={{ backgroundColor: ACCENT_RED, fontWeight: 'bold' }}>
                          Cập nhật Mật khẩu
                        </Button>
                      </div>
                    </Form>
                  )
                }
              ]} 
            />
          </Card>
        </Col>
      </Row>

      {/* MODAL CHỌN ẢNH TỪ MÁY TÍNH */}
      <Modal title={<Title level={4} style={{ color: MIDNIGHT_BLUE, margin: 0 }}>Cập nhật Ảnh đại diện</Title>} open={isAvatarModalOpen} onCancel={() => setIsAvatarModalOpen(false)} footer={null} centered>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
            Hỗ trợ định dạng .JPG, .PNG. Dung lượng tối đa 5MB.
          </Text>
          
          <Upload 
            customRequest={handleUploadAvatar} 
            showUploadList={false}             
            accept="image/*"                   
          >
            <Button 
              size="large" 
              type="primary" 
              icon={<UploadSimple size={20} />} 
              loading={loading}
              style={{ backgroundColor: MIDNIGHT_BLUE, height: 50, borderRadius: 8, padding: '0 30px', fontWeight: 'bold' }}
            >
              Chọn Ảnh Từ Máy Tính
            </Button>
          </Upload>
        </div>
      </Modal>
    </div>
  );
}