import React, { useState } from 'react';
import { Button, DatePicker, TimePicker, Typography, Space, Popover, notification, Divider, Badge } from 'antd';
import { MagnifyingGlass, Users, CalendarBlank, Clock, Bed, Plus, Minus, Trash, Sparkle, CalendarCheck } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useSignalR } from '../hooks/useSignalR';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

// TÔNG MÀU LUXURY
const THEME = {
  NAVY_DARK: '#0D1821', NAVY_LIGHT: '#1C2E4A',
  DARK_RED: '#8A1538', GOLD: '#D4AF37', WHITE: '#FFFFFF', GRAY_LIGHT: '#F8FAFC'
};

export default function BookingSearchWidget() {
  const navigate = useNavigate();
  const [api, contextHolder] = notification.useNotification();

  const [bookingMode, setBookingMode] = useState('daily');
  const [dates, setDates] = useState(null);
  const [timeRange, setTimeRange] = useState(null);
  const [guestPopoverVisible, setGuestPopoverVisible] = useState(false);

  const [roomsConfig, setRoomsConfig] = useState([{ id: 1, adults: 2, children: 0 }]);

  const totalAdults = roomsConfig.reduce((sum, room) => sum + room.adults, 0);
  const totalChildren = roomsConfig.reduce((sum, room) => sum + room.children, 0);

  // SIGNALR - HIỆU ỨNG CHIM MỒI FOMO
  useSignalR((notif) => {
    if (notif.permission === "MANAGE_BOOKINGS" && notif.title?.includes("mới")) {
      api.info({
        message: <span style={{ color: THEME.DARK_RED, fontWeight: 'bold' }}><Sparkle weight="fill" color={THEME.GOLD} /> Vừa có khách chốt phòng!</span>,
        description: 'Một phòng vừa được đặt thành công. Nhanh tay kẻo lỡ kỳ nghỉ tuyệt vời của bạn!',
        placement: 'topRight', duration: 8,
        style: { borderLeft: `4px solid ${THEME.GOLD}`, backgroundColor: '#fffbe6' }
      });
    }
  });

  const handleUpdateRoom = (id, field, value) => {
    setRoomsConfig(prev => prev.map(room => {
      if (room.id === id) {
        const newValue = room[field] + value;
        if (field === 'adults' && (newValue < 1 || newValue > 4)) return room;
        if (field === 'children' && (newValue < 0 || newValue > 3)) return room;
        return { ...room, [field]: newValue };
      }
      return room;
    }));
  };

  const handleAddRoom = () => {
    if (roomsConfig.length >= 5) return api.warning({ message: 'Tối đa 5 phòng cho một lần đặt.' });
    setRoomsConfig(prev => [...prev, { id: Date.now(), adults: 2, children: 0 }]);
  };

  const handleRemoveRoom = (id) => {
    if (roomsConfig.length === 1) return;
    setRoomsConfig(prev => prev.filter(r => r.id !== id));
  };

  // GIAO DIỆN POPOVER CHỌN KHÁCH (ĐÃ SỬA LỖI SCROLL & GHIM NÚT BẤM)
  const guestPickerContent = (
    <div style={{ width: 300, display: 'flex', flexDirection: 'column' }}>
      
      {/* VÙNG 1: DANH SÁCH PHÒNG CÓ THỂ CUỘN */}
      <div style={{ maxHeight: '45vh', overflowY: 'auto', paddingRight: 8 }}>
        {roomsConfig.map((room, index) => (
          <div key={room.id} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, backgroundColor: THEME.GRAY_LIGHT, padding: '6px 12px', borderRadius: 6 }}>
              <Text strong style={{ color: THEME.NAVY_LIGHT }}><Bed size={16} style={{verticalAlign: 'sub', marginRight: 6}}/> Phòng {index + 1}</Text>
              {roomsConfig.length > 1 && <Button type="text" danger size="small" icon={<Trash />} onClick={() => handleRemoveRoom(room.id)}>Xóa</Button>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '0 8px' }}>
              <div><Text strong style={{ display: 'block' }}>Người lớn</Text><Text type="secondary" style={{ fontSize: 12 }}>Từ 13 tuổi</Text></div>
              <Space><Button shape="circle" size="small" icon={<Minus />} onClick={() => handleUpdateRoom(room.id, 'adults', -1)} disabled={room.adults <= 1} /><Text strong style={{ width: 20, textAlign: 'center', display: 'inline-block' }}>{room.adults}</Text><Button shape="circle" size="small" icon={<Plus />} onClick={() => handleUpdateRoom(room.id, 'adults', 1)} disabled={room.adults >= 4} /></Space>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' }}>
              <div><Text strong style={{ display: 'block' }}>Trẻ em</Text><Text type="secondary" style={{ fontSize: 12 }}>Dưới 13 tuổi</Text></div>
              <Space><Button shape="circle" size="small" icon={<Minus />} onClick={() => handleUpdateRoom(room.id, 'children', -1)} disabled={room.children <= 0} /><Text strong style={{ width: 20, textAlign: 'center', display: 'inline-block' }}>{room.children}</Text><Button shape="circle" size="small" icon={<Plus />} onClick={() => handleUpdateRoom(room.id, 'children', 1)} disabled={room.children >= 3} /></Space>
            </div>
            {index < roomsConfig.length - 1 && <Divider style={{ margin: '16px 0' }} />}
          </div>
        ))}
      </div>

      {/* VÙNG 2: NÚT BẤM ĐƯỢC GHIM CHẾT BÊN DƯỚI */}
      <div style={{ paddingTop: 16, borderTop: '1px solid #e2e8f0', marginTop: 8 }}>
        <Button type="dashed" block icon={<Plus />} onClick={handleAddRoom} style={{ borderColor: THEME.NAVY_LIGHT, color: THEME.NAVY_LIGHT, marginBottom: 12, height: 40 }}>Thêm phòng khác</Button>
        <Button type="primary" block style={{ backgroundColor: THEME.NAVY_DARK, height: 40, fontWeight: 'bold' }} onClick={() => setGuestPopoverVisible(false)}>Hoàn tất</Button>
      </div>

    </div>
  );

  const handleSearch = () => {
    if (!dates) return api.warning({ message: 'Vui lòng chọn ngày lưu trú!' });
    if (bookingMode === 'hourly' && !timeRange) return api.warning({ message: 'Vui lòng chọn khung giờ muốn thuê!' });

    const checkIn = bookingMode === 'daily' ? dates[0].format('YYYY-MM-DD') : dates.format('YYYY-MM-DD');
    const checkOut = bookingMode === 'daily' ? dates[1].format('YYYY-MM-DD') : dates.format('YYYY-MM-DD');
    const priceType = bookingMode === 'daily' ? 'NIGHTLY' : 'HOURLY';

    window.location.hash = ''; // Xóa hash để đóng thanh trượt
    navigate('/booking', { state: { checkIn, checkOut, priceType, adults: totalAdults, children: totalChildren, requestedRooms: roomsConfig.length } });
  };

  return (
    <div className="vertical-widget-wrapper">
      {contextHolder}
      
      {/* 1. NÚT CHUYỂN CHẾ ĐỘ (THIẾT KẾ KIỂU TOGGLE IOS) */}
      <div className="toggle-container">
        <button 
            className={`toggle-btn ${bookingMode === 'daily' ? 'active' : ''}`}
            onClick={() => { setBookingMode('daily'); setDates(null); setTimeRange(null); }}
        >
            <CalendarBlank size={18} style={{marginRight: 6}} weight={bookingMode === 'daily' ? "bold" : "regular"} /> Theo Đêm
        </button>
        <button 
            className={`toggle-btn ${bookingMode === 'hourly' ? 'active' : ''}`}
            onClick={() => { setBookingMode('hourly'); setDates(null); }}
        >
            <Clock size={18} style={{marginRight: 6}} weight={bookingMode === 'hourly' ? "bold" : "regular"} /> Theo Giờ
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* 2. CHỌN NGÀY */}
          <div>
            <Text className="form-label">{bookingMode === 'daily' ? 'Thời gian Nhận & Trả phòng' : 'Ngày lưu trú'}</Text>
            {bookingMode === 'daily' ? (
                <RangePicker className="luxury-input" size="large" format="DD/MM/YYYY" disabledDate={c => c && c < dayjs().startOf('day')} onChange={setDates} value={dates} placeholder={['Nhận phòng', 'Trả phòng']} separator="→" />
            ) : (
                <DatePicker className="luxury-input" size="large" format="DD/MM/YYYY" disabledDate={c => c && c < dayjs().startOf('day')} onChange={setDates} value={dates} placeholder="Chọn ngày diễn ra" />
            )}
          </div>

          {/* 3. CHỌN KHUNG GIỜ (NẾU CÓ) */}
          {bookingMode === 'hourly' && (
            <div>
              <Text className="form-label">Khung giờ thuê</Text>
              <TimePicker.RangePicker className="luxury-input" size="large" format="HH:mm" onChange={setTimeRange} value={timeRange} placeholder={['Giờ bắt đầu', 'Giờ kết thúc']} separator="→" />
            </div>
          )}

          {/* 4. CHỌN KHÁCH & PHÒNG */}
          <div>
            <Text className="form-label">Số lượng Khách & Phòng</Text>
            <Popover content={guestPickerContent} trigger="click" placement="bottom" arrow={false} open={guestPopoverVisible} onOpenChange={setGuestPopoverVisible}>
                <div className="fake-input-box clickable">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Users size={22} color={THEME.NAVY_LIGHT} weight="fill" />
                        <div style={{ marginLeft: 12 }}>
                            <Text strong style={{ display: 'block', fontSize: 15, color: THEME.NAVY_DARK, lineHeight: 1 }}>{totalAdults} Lớn, {totalChildren} Trẻ em</Text>
                            <Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: 'block' }}>{roomsConfig.length} Phòng</Text>
                        </div>
                    </div>
                </div>
            </Popover>
          </div>

          <Divider style={{ margin: '8px 0', borderColor: '#e2e8f0' }} />

          {/* 5. NÚT SUBMIT */}
          <Button type="primary" block className="btn-luxury-search" icon={<MagnifyingGlass weight="bold" size={20}/>} onClick={handleSearch}>
            TÌM PHÒNG NGAY
          </Button>

      </div>

      <style>{`
        .vertical-widget-wrapper {
            padding: 10px 0;
            animation: fadeInRight 0.4s ease-out;
        }

        /* NÚT GẠT CHẾ ĐỘ IOS STYLE */
        .toggle-container {
            display: flex;
            background: #e2e8f0;
            border-radius: 12px;
            padding: 4px;
            margin-bottom: 32px;
        }
        .toggle-btn {
            flex: 1;
            display: flex; align-items: center; justify-content: center;
            height: 44px;
            border: none; border-radius: 10px;
            background: transparent;
            font-size: 15px; font-weight: 600; color: #475569;
            cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .toggle-btn.active {
            background: ${THEME.WHITE};
            color: ${THEME.NAVY_DARK};
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        /* NHÃN FORM */
        .form-label {
            font-size: 12px; font-weight: 800; color: ${THEME.NAVY_LIGHT};
            text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 10px;
        }

        /* Ô INPUT ĐẲNG CẤP */
        .luxury-input {
            width: 100%; height: 56px; border-radius: 12px !important;
            border: 1px solid #cbd5e1 !important; background-color: #f8fafc !important;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.02) !important;
        }
        .luxury-input:hover, .luxury-input-focused, .ant-picker-focused {
            border-color: ${THEME.DARK_RED} !important; background-color: #fff !important;
            box-shadow: 0 0 0 2px rgba(138,21,56,0.1) !important;
        }
        .ant-picker-input > input { font-weight: 600 !important; color: ${THEME.NAVY_DARK} !important; fontSize: 15px !important; }

        /* FAKE INPUT CHO CHỌN KHÁCH */
        .fake-input-box {
            display: flex; align-items: center; justify-content: space-between;
            border: 1px solid #cbd5e1; border-radius: 12px;
            padding: 0 16px; height: 56px; background-color: #f8fafc;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); transition: all 0.3s;
        }
        .fake-input-box.clickable:hover {
            border-color: ${THEME.DARK_RED}; background-color: #fff; cursor: pointer;
            box-shadow: 0 0 0 2px rgba(138,21,56,0.1);
        }

        /* NÚT TÌM KIẾM BLING BLING */
        .btn-luxury-search {
            height: 60px !important; border-radius: 14px !important; border: none !important;
            background: linear-gradient(135deg, ${THEME.DARK_RED} 0%, #A31D45 100%) !important;
            font-size: 16px !important; font-weight: 800 !important; letter-spacing: 1px;
            box-shadow: 0 10px 25px rgba(138, 21, 56, 0.4) !important;
            transition: all 0.3s ease !important;
        }
        .btn-luxury-search:hover {
            transform: translateY(-3px); box-shadow: 0 15px 35px rgba(138, 21, 56, 0.5) !important;
        }

        @keyframes fadeInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}