import React from 'react';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';

export default function Error403() {
  const navigate = useNavigate();
  return (
    <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <img src="https://i.pinimg.com/736x/9a/96/87/9a96879fce1cfb9e13d18b734a9a7d4b.jpg" alt="403 Forbidden" style={{ maxWidth: '400px', marginBottom: '20px', borderRadius: '16px' }} />
      <h2 style={{ color: '#1C2E4A', fontFamily: '"Source Serif 4", serif' }}>403 - BẠN KHÔNG CÓ QUYỀN TRUY CẬP TRANG NÀY</h2>
      <Button type="primary" onClick={() => navigate('/')} style={{ backgroundColor: '#1C2E4A', marginTop: '10px' }}>
        Quay lại Trang chủ
      </Button>
    </div>
  );
}