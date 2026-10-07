import React from 'react';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';

export default function Error401() {
  const navigate = useNavigate();
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e9f0f8' }}>
      <img src="https://www.bluehost.com/blog/wp-content/uploads/2023/06/what-is-a-401-error.png" alt="401 Unauthorized" style={{ maxWidth: '500px', marginBottom: '20px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(28, 46, 74, 0.1)' }} />
      <h2 style={{ color: '#1C2E4A', fontFamily: '"Source Serif 4", serif' }}>401 - VUI LÒNG ĐĂNG NHẬP</h2>
      <p style={{ color: '#52677D' }}>Bạn cần đăng nhập bằng tài khoản hợp lệ để truy cập vào hệ thống quản trị.</p>
      <Button type="primary" onClick={() => navigate('/login')} style={{ backgroundColor: '#1C2E4A', marginTop: '10px' }}>
        Đi đến trang Đăng nhập
      </Button>
    </div>
  );
}