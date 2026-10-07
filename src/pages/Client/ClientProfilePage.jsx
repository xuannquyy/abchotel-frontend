import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Typography, Space, Row, Col, Avatar, notification, Tabs, Select, DatePicker, Modal, Upload, Badge, Tag } from 'antd';
import { UserCircle, EnvelopeSimple, Phone, MapPin, Camera, ShieldCheck, Star, UploadSimple, Crown, CalendarBlank, BellRinging } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';

import { profileApi } from '../../api/profileApi';
import { mediaApi } from '../../api/mediaApi';
import { useAuthStore } from '../../store/authStore';
import { useSignalR } from '../../hooks/useSignalR';

const { Title, Text } = Typography;

const THEME = {
  NAVY_DARK: '#0D1821',
  NAVY_LIGHT: '#1C2E4A',
  DARK_RED: '#8A1538',
  GOLD: '#D4AF37',
  BG_LIGHT: '#F8FAFC'
};

export default function ClientProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [api, contextHolder] = notification.useNotification();
  
  const [infoForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const checkAuth = useAuthStore(state => state.checkAuth);

  // ================= 1. FETCH DỮ LIỆU =================
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
      api.error({ message: 'Lỗi', description: 'Không thể tải thông tin cá nhân.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    window.scrollTo(0, 0);
  }, []);

  // ================= 2. SIGNALR REALTIME =================
  useSignalR((newNotif) => {
    // Nếu có thông báo về tài khoản hoặc thăng hạng, refresh lại profile
    if (newNotif.type === "SYSTEM" || newNotif.type === "PROMOTION") {
        fetchProfile();
        api.info({
            message: <Text strong style={{ color: THEME.GOLD }}>Cập nhật đặc quyền!</Text>,
            description: newNotif.content || 'Tài khoản của bạn vừa có biến động mới.',
            icon: <BellRinging color={THEME.GOLD} weight="fill" />,
            style: { borderLeft: `4px solid ${THEME.GOLD}`, borderRadius: 8 }
        });
    }
  });

  // ================= 3. XỬ LÝ CẬP NHẬT =================
  const onFinishUpdateInfo = async (values) => {
    try {
      setLoading(true);
      const payload = { ...values, dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : null };
      await profileApi.updateProfile(payload);
      api.success({ message: 'Thành công', description: 'Đã cập nhật hồ sơ cá nhân!' });
      fetchProfile(); 
      checkAuth();    
    } catch (error) {
      api.error({ message: 'Lỗi', description: error.response?.data?.message || 'Cập nhật thất bại' });
    } finally {
      setLoading(false);
    }
  };

  const onFinishChangePassword = async (values) => {
    try {
      setLoading(true);
      await profileApi.changePassword({ oldPassword: values.oldPassword, newPassword: values.newPassword });
      api.success({ message: 'Thành công', description: 'Đổi mật khẩu an toàn!' });
      passwordForm.resetFields(); 
    } catch (error) {
      api.error({ message: 'Lỗi', description: error.response?.data?.message || 'Đổi mật khẩu thất bại' });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadAvatar = async (options) => {
    const { file, onSuccess, onError } = options;
    try {
      setLoading(true);
      const uploadRes = await mediaApi.uploadImage(file);
      await profileApi.uploadAvatar({ avatarUrl: uploadRes.data.url });
      api.success({ message: 'Thành công', description: 'Đã thay đổi ảnh đại diện rạng rỡ hơn!' });
      setIsAvatarModalOpen(false);
      fetchProfile(); 
      checkAuth();    
      onSuccess("ok");
    } catch (error) {
      api.error({ message: 'Lỗi', description: 'Không thể tải ảnh lên lúc này.' });
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  // Tính toán Hạng Thành viên
  const getMembershipTier = (points) => {
    if (points >= 5000) return { name: 'DIAMOND', color: 'linear-gradient(135deg, #b9f2ff 0%, #3a8dff 100%)', textColor: THEME.NAVY_DARK };
    if (points >= 2000) return { name: 'GOLD', color: `linear-gradient(135deg, ${THEME.GOLD} 0%, #aa771c 100%)`, textColor: '#fff' };
    if (points >= 500) return { name: 'SILVER', color: 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)', textColor: THEME.NAVY_DARK };
    return { name: 'MEMBER', color: `linear-gradient(135deg, ${THEME.NAVY_LIGHT} 0%, ${THEME.NAVY_DARK} 100%)`, textColor: '#fff' };
  };

  if (!profile) return <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography.Text>Đang chuẩn bị không gian của bạn...</Typography.Text></div>; 

  const tier = getMembershipTier(profile.totalPoints);

  return (
    <div style={{ backgroundColor: THEME.BG_LIGHT, minHeight: '100vh', paddingBottom: 80 }}>
      {contextHolder}

      {/* ================= COVER BÌA ================= */}
      <div style={{ 
          height: 280, 
          backgroundImage: 'url("https://i.pinimg.com/1200x/b1/83/84/b18384e20e48c0e5885dd538a897e5cd.jpg")', 
          backgroundSize: 'cover', backgroundPosition: 'center',
          position: 'relative'
      }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13, 24, 33, 0.9), transparent)' }}></div>
      </div>

      <div style={{ maxWidth: 1200, margin: '-100px auto 0', padding: '0 20px', position: 'relative', zIndex: 10 }}>
        <Row gutter={[32, 32]}>
          
          {/* ================= CỘT TRÁI: AVATAR & THẺ VIP ================= */}
          <Col xs={24} lg={8}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              
              {/* Box Avatar */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <Avatar 
                    size={160} src={profile.avatarUrl} icon={<UserCircle />} 
                    style={{ backgroundColor: '#e9f0f8', color: '#52677D', border: `6px solid ${THEME.BG_LIGHT}`, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }} 
                  />
                  <Button 
                    type="primary" shape="circle" icon={<Camera size={20} />} onClick={() => setIsAvatarModalOpen(true)}
                    style={{ position: 'absolute', bottom: 10, right: 10, backgroundColor: THEME.DARK_RED, border: `3px solid ${THEME.BG_LIGHT}`, width: 44, height: 44 }}
                  />
                </div>
                <Title level={3} style={{ color: THEME.NAVY_DARK, margin: '16px 0 4px 0', fontFamily: '"Source Serif 4", serif' }}>{profile.fullName}</Title>
                <Text style={{ color: '#64748b', fontSize: 15 }}>{profile.email}</Text>
              </div>

              {/* Thẻ Membership Card ảo */}
              <motion.div whileHover={{ scale: 1.02 }} style={{ 
                background: tier.color, borderRadius: 20, padding: 24, color: tier.textColor, 
                boxShadow: '0 15px 30px rgba(0,0,0,0.15)', position: 'relative', overflow: 'hidden', marginBottom: 32
              }}>
                <div style={{ position: 'absolute', right: -20, top: -20, opacity: 0.1 }}><Crown size={120} weight="fill" /></div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                  <Text style={{ color: tier.textColor, fontWeight: 800, fontSize: 16, letterSpacing: 2 }}>ABCHOTEL</Text>
                  <Tag color="rgba(0,0,0,0.2)" style={{ border: 'none', color: tier.textColor, fontWeight: 700, margin: 0, fontSize: 13, padding: '4px 12px', borderRadius: 12 }}>{tier.name}</Tag>
                </div>
                
                <Text style={{ color: tier.textColor, opacity: 0.8, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Điểm tích lũy</Text>
                <div style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, marginBottom: 8, fontFamily: '"Source Serif 4", serif' }}>
                  {new Intl.NumberFormat('vi-VN').format(profile.totalPoints)} <Star size={24} weight="fill" color={THEME.GOLD} style={{ display: 'inline-block', verticalAlign: 'middle', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}/>
                </div>
                <Text style={{ color: tier.textColor, opacity: 0.8, fontSize: 12 }}>Sử dụng điểm để đổi Voucher và Quà tặng.</Text>
              </motion.div>

              {/* Thông tin tóm tắt */}
              <Card variant="borderless" style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <Space align="start"><Phone size={20} color={THEME.GOLD} style={{ marginTop: 2 }}/> <div><Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Điện thoại</Text><Text strong style={{ fontSize: 15 }}>{profile.phone || 'Chưa cập nhật'}</Text></div></Space>
                  <Space align="start"><MapPin size={20} color={THEME.GOLD} style={{ marginTop: 2 }}/> <div><Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Địa chỉ</Text><Text strong style={{ fontSize: 15 }}>{profile.address || 'Chưa cập nhật'}</Text></div></Space>
                  <Space align="start"><CalendarBlank size={20} color={THEME.GOLD} style={{ marginTop: 2 }}/> <div><Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Ngày sinh</Text><Text strong style={{ fontSize: 15 }}>{profile.dateOfBirth ? dayjs(profile.dateOfBirth).format('DD/MM/YYYY') : 'Chưa cập nhật'}</Text></div></Space>
                </div>
              </Card>

            </motion.div>
          </Col>

          {/* ================= CỘT PHẢI: FORM CHỈNH SỬA ================= */}
          <Col xs={24} lg={16}>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
              <Card variant="borderless" style={{ borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.04)', padding: '10px 0' }}>
                <Tabs 
                  defaultActiveKey="1" 
                  className="client-profile-tabs"
                  items={[
                    {
                      key: '1',
                      label: <span style={{ fontSize: 15, fontWeight: 700, padding: '0 10px' }}><UserCircle size={20} style={{ verticalAlign: 'middle', marginRight: 8 }}/>HỒ SƠ CỦA TÔI</span>,
                      children: (
                        <Form form={infoForm} layout="vertical" onFinish={onFinishUpdateInfo} style={{ marginTop: 24, padding: '0 10px' }}>
                          <Row gutter={24}>
                            <Col xs={24} md={12}>
                              <Form.Item name="fullName" label={<Text strong>Họ và tên</Text>} rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
                                <Input size="large" style={{ borderRadius: 8, height: 45 }} />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                              <Form.Item name="phone" label={<Text strong>Số điện thoại</Text>} rules={[{ pattern: /^0\d{9}$/, message: 'SĐT không hợp lệ' }]}>
                                <Input size="large" style={{ borderRadius: 8, height: 45 }} />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                              <Form.Item name="gender" label={<Text strong>Giới tính</Text>}>
                                <Select size="large" style={{ borderRadius: 8, height: 45 }} options={[{ value: 'Nam', label: 'Nam' }, { value: 'Nữ', label: 'Nữ' }, { value: 'Khác', label: 'Khác' }]} />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                              <Form.Item name="dateOfBirth" label={<Text strong>Ngày sinh</Text>}>
                                <DatePicker size="large" style={{ width: '100%', borderRadius: 8, height: 45 }} format="DD/MM/YYYY" />
                              </Form.Item>
                            </Col>
                            <Col span={24}>
                              <Form.Item name="address" label={<Text strong>Địa chỉ liên hệ</Text>}>
                                <Input size="large" style={{ borderRadius: 8, height: 45 }} />
                              </Form.Item>
                            </Col>
                          </Row>
                          <div style={{ textAlign: 'right', marginTop: 16 }}>
                            <Button type="primary" htmlType="submit" size="large" loading={loading} style={{ backgroundColor: THEME.NAVY_DARK, fontWeight: 'bold', borderRadius: 8, padding: '0 40px', height: 45, letterSpacing: 1 }}>
                              CẬP NHẬT THÔNG TIN
                            </Button>
                          </div>
                        </Form>
                      )
                    },
                    {
                      key: '2',
                      forceRender: true, // Ép React render ẩn Form này để không báo lỗi Warning: Instance created by useForm
                      label: <span style={{ fontSize: 15, fontWeight: 700, padding: '0 10px' }}><ShieldCheck size={20} style={{ verticalAlign: 'middle', marginRight: 8 }}/>BẢO MẬT</span>,
                      children: (
                        <Form form={passwordForm} layout="vertical" onFinish={onFinishChangePassword} style={{ marginTop: 24, padding: '0 10px', maxWidth: 500 }}>
                          <Form.Item name="oldPassword" label={<Text strong>Mật khẩu hiện tại</Text>} rules={[{ required: true, message: 'Vui lòng nhập mật khẩu cũ' }]}>
                            <Input.Password size="large" style={{ borderRadius: 8, height: 45 }} />
                          </Form.Item>
                          <Form.Item name="newPassword" label={<Text strong>Mật khẩu mới</Text>} rules={[{ required: true, message: 'Vui lòng nhập mật khẩu mới' }, { min: 6, message: 'Mật khẩu phải từ 6 ký tự' }]}>
                            <Input.Password size="large" style={{ borderRadius: 8, height: 45 }} />
                          </Form.Item>
                          <Form.Item name="confirmPassword" label={<Text strong>Xác nhận mật khẩu mới</Text>} dependencies={['newPassword']} rules={[
                            { required: true, message: 'Vui lòng xác nhận mật khẩu' },
                            ({ getFieldValue }) => ({
                              validator(_, value) {
                                if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                                return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                              },
                            }),
                          ]}>
                            <Input.Password size="large" style={{ borderRadius: 8, height: 45 }} />
                          </Form.Item>
                          <div style={{ marginTop: 32 }}>
                            <Button type="primary" htmlType="submit" size="large" loading={loading} style={{ backgroundColor: THEME.DARK_RED, fontWeight: 'bold', borderRadius: 8, padding: '0 40px', height: 45, letterSpacing: 1 }}>
                              ĐỔI MẬT KHẨU
                            </Button>
                          </div>
                        </Form>
                      )
                    }
                  ]} 
                />
              </Card>
            </motion.div>
          </Col>
        </Row>
      </div>

      {/* MODAL UPLOAD AVATAR */}
      <Modal title={<span style={{ color: THEME.NAVY_DARK, fontSize: 18, fontWeight: 800 }}>Chụp ảnh đại diện mới</span>} open={isAvatarModalOpen} onCancel={() => setIsAvatarModalOpen(false)} footer={null} centered>
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <div style={{ background: '#f8fafc', width: 100, height: 100, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: `2px dashed ${THEME.GOLD}` }}>
             <Camera size={40} color={THEME.GOLD} />
          </div>
          <Text type="secondary" style={{ display: 'block', marginBottom: 32 }}>Hỗ trợ định dạng .JPG, .PNG. Dung lượng tối đa 5MB.</Text>
          <Upload customRequest={handleUploadAvatar} showUploadList={false} accept="image/*">
            <Button size="large" type="primary" icon={<UploadSimple size={20} />} loading={loading} style={{ backgroundColor: THEME.NAVY_DARK, height: 50, borderRadius: 30, padding: '0 40px', fontWeight: 'bold', letterSpacing: 1 }}>
              TẢI ẢNH TỪ THIẾT BỊ
            </Button>
          </Upload>
        </div>
      </Modal>

      <style>{`
        .client-profile-tabs .ant-tabs-nav::before { display: none; }
        .client-profile-tabs .ant-tabs-tab { color: #64748b; padding-bottom: 16px; margin-right: 32px !important; }
        .client-profile-tabs .ant-tabs-tab-active .ant-tabs-tab-btn { color: ${THEME.NAVY_DARK} !important; }
        .client-profile-tabs .ant-tabs-ink-bar { background: ${THEME.GOLD}; height: 3px !important; border-radius: 3px; }
      `}</style>
    </div>
  );
}