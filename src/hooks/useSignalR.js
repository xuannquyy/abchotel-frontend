import { useEffect, useState, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuthStore } from '../store/authStore'; // 🔥 IMPORT STORE VÀO ĐÂY

export const useSignalR = (onReceiveNotification) => {
  const [connection, setConnection] = useState(null);
  const callbackRef = useRef(onReceiveNotification);

  useEffect(() => {
    callbackRef.current = onReceiveNotification;
  }, [onReceiveNotification]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const options = {
      skipNegotiation: true,
      transport: signalR.HttpTransportType.WebSockets
    };

    // Nếu có token thì gửi để xác thực Admin, không có vẫn cho Khách kết nối
    if (token) {
      options.accessTokenFactory = () => token;
    }

    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl('https://xuuxuu-001-site1.dtempurl.com/notificationHub', options)
      .withAutomaticReconnect()
      .build();

    setConnection(newConnection);

    return () => {
      if (newConnection) {
        newConnection.stop().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (connection && connection.state === signalR.HubConnectionState.Disconnected) {
      connection.start()
        .then(() => {
          console.log('✅ SignalR: Connected!');
          
          // 1. Lắng nghe thông báo (Ví dụ: Có đơn đặt phòng mới, Thanh toán mới...)
          connection.on('ReceiveNotification', (data) => {
            if (callbackRef.current) callbackRef.current(data);
          });

          // 🔥 2. LẮNG NGHE LỆNH THAY ĐỔI CHỨC VỤ (REALTIME ROLE) TỪ BACKEND
          connection.on('ForceTokenRefresh', async () => {
            console.log('🔄 Đang làm mới Token do có sự thay đổi quyền hạn...');
            // Gọi trực tiếp hàm checkAuth từ Zustand store
            await useAuthStore.getState().checkAuth();
          });

        })
        .catch(err => console.error('❌ Lỗi kết nối SignalR:', err));
    }
  }, [connection]);

  return connection;
};