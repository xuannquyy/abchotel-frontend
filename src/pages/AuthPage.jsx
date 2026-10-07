import React, { useState } from 'react';
import { Form, Input, Button, Typography, notification, Grid } from 'antd';
import { User, LockKey, Envelope, Phone, ArrowLeft } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../store/authStore';

import logo from '../assets/logo.png';

const { Title, Text, Link } = Typography;
const { useBreakpoint } = Grid;

export default function AuthPage() {
  const screens = useBreakpoint();
  
  const [isLogin, setIsLogin] = useState(true); 
  const [isForgot, setIsForgot] = useState(false); 
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [api, contextHolder] = notification.useNotification({ placement: 'bottomRight' });

  // ================= CÁC HÀM XỬ LÝ API =================
  const onFinishLogin = async (values) => {
    try {
      setLoading(true);
      const res = await authApi.login(values);
      localStorage.setItem('accessToken', res.accessToken);
      localStorage.setItem('refreshToken', res.refreshToken);
      const profile = await authApi.getMe();
      setAuth(profile, res.accessToken, res.refreshToken);
      
      api.success({ message: 'Đăng nhập thành công!' });
      
      if (profile.roleName === 'Guest') {
        navigate('/'); 
      } else {
        navigate('/admin/dashboard'); 
      }
    } catch (error) {
      api.error({ message: 'Đăng nhập thất bại', description: error.response?.data?.message || 'Tài khoản hoặc mật khẩu không chính xác' });
    } finally { setLoading(false); }
  };

  const onFinishRegister = async (values) => {
    try {
      setLoading(true);
      const res = await authApi.register(values);
      api.success({ message: 'Đăng ký thành công!', description: res.message });
      setIsLogin(true); 
    } catch (error) {
      api.error({ message: 'Đăng ký thất bại', description: error.response?.data?.message });
    } finally { setLoading(false); }
  };

  const onFinishForgot = async (values) => {
    try {
      setLoading(true);
      const res = await authApi.forgotPassword({ email: values.email });
      api.success({ message: 'Đã gửi email!', description: res.message });
      setIsForgot(false); 
    } catch (error) {
      api.error({ message: 'Thất bại', description: error.response?.data?.message });
    } finally { setLoading(false); }
  };

  // ================= CSS STYLES HOÀN HẢO =================
  const containerStyle = {
    position: 'relative', 
    width: '100%', 
    maxWidth: '900px',
    minHeight: screens.md ? '550px' : 'auto', 
    backgroundColor: '#FFFFFF',
    borderRadius: screens.md ? '24px' : '16px', 
    boxShadow: '0 15px 35px rgba(28, 46, 74, 0.15)', 
    overflow: 'hidden', 
    display: 'flex',
    flexDirection: screens.md ? 'row' : 'column', 
    boxSizing: 'border-box'
  };
  
  // 🔥 ÉP FORM VÀO KHUÔN, KHÔNG CHO PHÉP TRÀN LỀ
  const getFormPaneStyle = (isLeftForm) => {
    const isActive = isLeftForm ? isLogin : !isLogin;

    if (!screens.md) {
      // TRÊN MOBILE: Chỉ hiện form đang active, chiếm 100% bề ngang nhưng ép padding bằng border-box
      return {
        display: isActive ? 'flex' : 'none',
        flexDirection: 'column',
        padding: '24px 20px', // Đủ rộng rãi cho điện thoại nhỏ
        width: '100%',
        boxSizing: 'border-box'
      };
    }

    // TRÊN DESKTOP: Hiển thị 2 nửa 50%, ẩn hiện bằng độ mờ (opacity)
    return {
      width: '50%', 
      height: '100%', 
      padding: '40px 50px', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center',
      transition: 'all 0.6s ease-in-out', 
      opacity: isActive ? 1 : 0, 
      pointerEvents: isActive ? 'auto' : 'none',
      zIndex: isActive ? 5 : 1,
      boxSizing: 'border-box'
    };
  };

  const overlayStyle = {
    display: screens.md ? 'flex' : 'none', // Ẩn hoàn toàn trên Mobile
    position: 'absolute', top: 0, left: 0, width: '50%', height: '100%', backgroundColor: '#1C2E4A',
    zIndex: 10, transition: 'transform 0.6s ease-in-out', transform: `translateX(${isLogin ? '100%' : '0'})`,
    alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#FFFFFF', flexDirection: 'column',
    boxSizing: 'border-box'
  };

  const logoWrapperStyle = {
    backgroundColor: '#FFFFFF',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e9f0f8', padding: screens.md ? '20px' : '16px' }}>
      {contextHolder}
      <div style={containerStyle}>
        
        {/* ================= NỬA BÊN TRÁI: FORM ĐĂNG NHẬP / QUÊN MẬT KHẨU ================= */}
        <div style={getFormPaneStyle(true)}>
          
          {/* NÚT BACK - NẰM ĐỘC LẬP CHỐNG ĐÈ CHỮ */}
          <div style={{ width: '100%', marginBottom: 16, textAlign: 'left' }}>
            <Link onClick={() => navigate('/')} style={{ color: '#52677D', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
              <ArrowLeft size={18} /> {screens.md ? 'Quay lại trang chủ' : 'Trang chủ'}
            </Link>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%' }}>
            
            {/* LOGO CHỈ HIỆN TRÊN MOBILE */}
            {!screens.md && (
              <div style={{ textAlign: 'center', marginBottom: 24, marginTop: 8 }}>
                <div style={{...logoWrapperStyle, width: 70, height: 70, margin: '0 auto 12px auto'}}>
                  <img src={logo} alt="ABC HOTEL" style={{ width: 45, height: 45, objectFit: 'contain' }} />
                </div>
                <Title level={4} style={{ color: '#1C2E4A', margin: 0, letterSpacing: '1px' }}>ABC HOTEL</Title>
              </div>
            )}

            {!isForgot ? (
              <div style={{ animation: 'fadeIn 0.5s', width: '100%' }}>
                <Title level={3} style={{ color: '#1C2E4A', textAlign: 'center', marginBottom: 24, fontWeight: 'bold' }}>ĐĂNG NHẬP</Title>
                <Form layout="vertical" onFinish={onFinishLogin} size="large" style={{ width: '100%' }}>
                  <Form.Item name="email" rules={[{ required: true, message: 'Vui lòng nhập Email' }, { type: 'email', message: 'Email không hợp lệ' }]}>
                    <Input prefix={<Envelope color="#BDC4D4" />} placeholder="Email" />
                  </Form.Item>
                  <Form.Item name="password" rules={[{ required: true, message: 'Vui lòng nhập Mật khẩu' }]}>
                    <Input.Password prefix={<LockKey color="#BDC4D4" />} placeholder="Mật khẩu" />
                  </Form.Item>
                  <div style={{ textAlign: 'right', marginBottom: 24, width: '100%' }}>
                    <Link onClick={() => setIsForgot(true)} style={{ color: '#52677D', fontWeight: 500 }}>Quên mật khẩu?</Link>
                  </div>
                  <Button type="primary" htmlType="submit" loading={loading} block style={{ backgroundColor: '#1C2E4A', height: 45, borderRadius: 8, fontWeight: 'bold' }}>
                    ĐĂNG NHẬP
                  </Button>
                </Form>

                {/* Nút chuyển Form trên Mobile */}
                {!screens.md && (
                  <div style={{ textAlign: 'center', marginTop: 24 }}>
                    <Text style={{ color: '#52677D' }}>
                      Chưa có tài khoản? <Link onClick={() => { setIsLogin(false); setIsForgot(false); }} style={{ fontWeight: 'bold' }}>Đăng ký ngay</Link>
                    </Text>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ animation: 'fadeIn 0.5s', width: '100%' }}>
                <div style={{ cursor: 'pointer', marginBottom: 16 }} onClick={() => setIsForgot(false)}>
                  <ArrowLeft size={24} color="#52677D" />
                </div>
                <Title level={3} style={{ color: '#1C2E4A', textAlign: 'center', marginBottom: 8, fontWeight: 'bold' }}>KHÔI PHỤC MẬT KHẨU</Title>
                <Text style={{ display: 'block', textAlign: 'center', marginBottom: 24, color: '#52677D' }}>
                  Nhập email đã đăng ký để nhận mật khẩu mới.
                </Text>
                <Form layout="vertical" onFinish={onFinishForgot} size="large" style={{ width: '100%' }}>
                  <Form.Item name="email" rules={[{ required: true, message: 'Vui lòng nhập Email' }, { type: 'email' }]}>
                    <Input prefix={<Envelope color="#BDC4D4" />} placeholder="Email của bạn" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading} block style={{ backgroundColor: '#1C2E4A', height: 45, borderRadius: 8, fontWeight: 'bold' }}>
                    GỬI YÊU CẦU
                  </Button>
                </Form>
              </div>
            )}
          </div>
        </div>

        {/* ================= NỬA BÊN PHẢI: FORM ĐĂNG KÝ ================= */}
        <div style={getFormPaneStyle(false)}>
          
          <div style={{ width: '100%', marginBottom: 16, textAlign: screens.md ? 'right' : 'left' }}>
            <Link onClick={() => navigate('/')} style={{ color: '#52677D', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500, justifyContent: screens.md ? 'flex-end' : 'flex-start' }}>
               {screens.md && 'Quay lại trang chủ'} 
               {!screens.md && <ArrowLeft size={18} />} 
               {!screens.md && 'Trang chủ'} 
               {screens.md && <ArrowLeft size={18} style={{ transform: 'rotate(180deg)' }} />}
            </Link>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%' }}>
            
            {/* LOGO CHỈ HIỆN TRÊN MOBILE */}
            {!screens.md && (
              <div style={{ textAlign: 'center', marginBottom: 24, marginTop: 8 }}>
                <div style={{...logoWrapperStyle, width: 70, height: 70, margin: '0 auto 12px auto'}}>
                  <img src={logo} alt="ABC HOTEL" style={{ width: 45, height: 45, objectFit: 'contain' }} />
                </div>
                <Title level={4} style={{ color: '#1C2E4A', margin: 0, letterSpacing: '1px' }}>ABC HOTEL</Title>
              </div>
            )}

            <Title level={3} style={{ color: '#1C2E4A', textAlign: 'center', marginBottom: 24, fontWeight: 'bold' }}>TẠO TÀI KHOẢN</Title>
            <Form layout="vertical" onFinish={onFinishRegister} size="large" style={{ width: '100%' }}>
              <Form.Item name="fullName" rules={[{ required: true, message: 'Vui lòng nhập Họ tên' }]} style={{ marginBottom: 16 }}>
                <Input prefix={<User color="#BDC4D4" />} placeholder="Họ và tên" />
              </Form.Item>
              <Form.Item name="email" rules={[{ required: true, message: 'Vui lòng nhập Email' }, { type: 'email', message: 'Email sai định dạng' }]} style={{ marginBottom: 16 }}>
                <Input prefix={<Envelope color="#BDC4D4" />} placeholder="Email" />
              </Form.Item>
              <Form.Item name="phone" rules={[{ required: true, message: 'Vui lòng nhập SĐT' }]} style={{ marginBottom: 16 }}>
                <Input prefix={<Phone color="#BDC4D4" />} placeholder="Số điện thoại" />
              </Form.Item>
              <Form.Item name="password" rules={[{ required: true, message: 'Vui lòng nhập Mật khẩu' }, { min: 6, message: 'Tối thiểu 6 ký tự' }]} style={{ marginBottom: 24 }}>
                <Input.Password prefix={<LockKey color="#BDC4D4" />} placeholder="Mật khẩu" />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block style={{ backgroundColor: '#1C2E4A', height: 45, borderRadius: 8, fontWeight: 'bold' }}>
                ĐĂNG KÝ
              </Button>
            </Form>

            {!screens.md && (
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <Text style={{ color: '#52677D' }}>
                  Đã có tài khoản? <Link onClick={() => setIsLogin(true)} style={{ fontWeight: 'bold' }}>Đăng nhập</Link>
                </Text>
              </div>
            )}
          </div>
        </div>

        {/* ================= TẤM NỀN TRƯỢT (CHỈ HIỆN TRÊN DESKTOP) ================= */}
        <div style={overlayStyle}>
          
          <div style={{ position: 'absolute', width: '100%', padding: '0 40px', transition: 'all 0.5s ease-in-out', transform: `translateX(${isLogin ? '0' : '20%'})`, opacity: isLogin ? 1 : 0, pointerEvents: isLogin ? 'auto' : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{...logoWrapperStyle, width: 100, height: 100, marginBottom: 20}}>
               <img src={logo} alt="ABC HOTEL" style={{ width: 90, height: 90, objectFit: 'contain' }} />
            </div>
            <Title level={2} style={{ color: '#FFFFFF', fontFamily: '"Source Serif 4", serif', margin: 0, letterSpacing: '2px' }}>ABC HOTEL</Title>
            <Text style={{ color: '#D1CFC9', display: 'block', margin: '20px 0', fontSize: 16 }}>
              Tạo tài khoản mới
            </Text>
            <Button ghost size="large" onClick={() => { setIsLogin(false); setIsForgot(false); }} style={{ width: 160, borderRadius: 24, borderColor: '#FFFFFF', color: '#FFFFFF', fontWeight: 'bold' }}>
              ĐĂNG KÝ
            </Button>
          </div>

          <div style={{ position: 'absolute', width: '100%', padding: '0 40px', transition: 'all 0.5s ease-in-out', transform: `translateX(${!isLogin ? '0' : '-20%'})`, opacity: !isLogin ? 1 : 0, pointerEvents: !isLogin ? 'auto' : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{...logoWrapperStyle, width: 100, height: 100, marginBottom: 20}}>
               <img src={logo} alt="ABC HOTEL" style={{ width: 90, height: 90, objectFit: 'contain' }} />
            </div>
            <Title level={2} style={{ color: '#FFFFFF', fontFamily: '"Source Serif 4", serif', margin: 0, letterSpacing: '2px' }}>ABC HOTEL</Title>
            <Text style={{ color: '#D1CFC9', display: 'block', margin: '20px 0', fontSize: 16 }}>
              Đăng nhập hệ thống khách sạn
            </Text>
            <Button ghost size="large" onClick={() => setIsLogin(true)} style={{ width: 160, borderRadius: 24, borderColor: '#FFFFFF', color: '#FFFFFF', fontWeight: 'bold' }}>
              ĐĂNG NHẬP
            </Button>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}