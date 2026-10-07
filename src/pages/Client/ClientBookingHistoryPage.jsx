import React, { useState, useEffect } from 'react';
import { 
  Typography, Row, Col, Spin, Empty, Button, Space, Tabs, 
  notification, Drawer, Divider, Modal, Input, Rate, Card, Grid, Table, Radio
} from 'antd';
import { 
  Receipt, Bed, Clock, CheckCircle, XCircle, Star, SuitcaseRolling, Key, Printer, WarningCircle, ShoppingCart, CreditCard, Coffee, Plus, Minus
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';

import { bookingApi } from '../../api/bookingApi';
import { invoiceApi } from '../../api/invoiceApi';
import { reviewApi } from '../../api/reviewApi'; 
import { orderApi } from '../../api/orderApi'; 
import { serviceApi } from '../../api/serviceApi'; 
import { useSignalR } from '../../hooks/useSignalR';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

const THEME = {
  NAVY_DARK: '#0B132B',
  NAVY_LIGHT: '#1C2541',
  GOLD: '#C4A45D',
  BG_LIGHT: '#F8FAFC',
  BORDER: '#E2E8F0',
  TEXT_MAIN: '#334155',
  TEXT_MUTED: '#94A3B8'
};

const getStatusConfig = (status) => {
  switch (status) {
    case 'Pending': return { text: 'Chờ xác nhận', color: '#B48600', bg: '#FFFBE6', border: '#FFE58F', icon: <Clock weight="fill"/> };
    case 'Confirmed': return { text: 'Đã cọc / Xác nhận', color: '#0284C7', bg: '#E0F2FE', border: '#BAE6FD', icon: <CheckCircle weight="fill"/> };
    case 'CheckedIn': 
    case 'Checked_in': return { text: 'Đang lưu trú', color: '#4F46E5', bg: '#E0E7FF', border: '#C7D2FE', icon: <Key weight="fill"/> };
  
    case 'Completed': 
    case 'CheckedOut': 
    case 'Checked_out': return { text: 'Đã hoàn tất', color: '#166534', bg: '#DCFCE7', border: '#BBF7D0', icon: <CheckCircle weight="fill"/> };
    
    case 'Cancelled': return { text: 'Đã hủy', color: '#E11D48', bg: '#FFE4E6', border: '#FECDD3', icon: <XCircle weight="fill"/> };
    default: return { text: status, color: '#64748B', bg: '#F1F5F9', border: '#E2E8F0', icon: <Clock weight="fill"/> };
  }
};

export default function ClientBookingHistoryPage() {
  const screens = useBreakpoint();
  const [api, contextHolder] = notification.useNotification();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedBookingToCancel, setSelectedBookingToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const [invoiceDrawerOpen, setInvoiceDrawerOpen] = useState(false);
  const [selectedInvoiceData, setSelectedInvoiceData] = useState(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  // Thêm state để quản lý loading khi bấm thanh toán
  const [loadingPayment, setLoadingPayment] = useState({});

  // Các state hỗ trợ tính năng gọi dịch vụ lên phòng
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [activeBookingRooms, setActiveBookingRooms] = useState([]);
  const [selectedRoomDetailId, setSelectedRoomDetailId] = useState(null);
  const [servicesList, setServicesList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [serviceCart, setServiceCart] = useState({}); // Lưu trữ dưới dạng { serviceId: số_lượng }
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [activeServiceTab, setActiveServiceTab] = useState(null);

  // Hàm xử lý thanh toán lại
  const handlePayAgain = async (booking) => {
      try {
          setLoadingPayment(prev => ({...prev, [booking.id]: true}));
          // Giả sử mặc định dùng VNPay (bạn có thể cho khách chọn lại phương thức nếu muốn)
          const resInvoice = await invoiceApi.getByBookingCode(booking.bookingCode);
          const invoiceId = resInvoice.data?.id || resInvoice.id;
          
          const vnpRes = await invoiceApi.createVnPayUrl(invoiceId, true);
          const paymentUrl = vnpRes.data?.url || vnpRes.url;
          
          window.location.href = paymentUrl;
      } catch (error) {
          api.error({ message: 'Lỗi', description: 'Không thể khởi tạo lại thanh toán.' });
      } finally {
          setLoadingPayment(prev => ({...prev, [booking.id]: false}));
      }
  };

  const fetchMyBookings = async () => {
    try {
      setLoading(true);
      const res = await bookingApi.getMyBookings();
      setBookings(res?.data?.$values || res?.$values || res || []);
    } catch (error) {
      api.error({ message: 'Lỗi tải dữ liệu', description: 'Không thể lấy lịch sử đặt phòng.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMyBookings(); }, []);

  useSignalR((notificationData) => {
    if (notificationData.title?.includes("Đơn đặt phòng")) fetchMyBookings();
  });

  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'Completed' && ['Completed', 'CheckedOut', 'Checked_out'].includes(b.status)) return true;
    if (activeTab === 'CheckedIn' && ['CheckedIn', 'Checked_in'].includes(b.status)) return true; // Thêm dòng này
    return b.status === activeTab;
  });

  const handleOpenCancelModal = (booking) => {
    setSelectedBookingToCancel(booking);
    setCancelReason('');
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      api.warning({ message: 'Thiếu thông tin', description: 'Vui lòng nhập lý do hủy phòng.' });
      return;
    }
    try {
      setLoading(true);
      const res = await bookingApi.cancelMyBooking(selectedBookingToCancel.id, cancelReason);
      api.success({ message: 'Thành công', description: res.data?.message || 'Đã xử lý yêu cầu hủy phòng.' });
      setCancelModalOpen(false);
      fetchMyBookings();
    } catch (error) {
      api.error({ message: 'Không thể hủy', description: error.response?.data?.message || 'Không thể hủy phòng lúc này.' });
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = async (bookingCode) => {
    try {
      setLoadingInvoice(true);
      const res = await invoiceApi.getByBookingCode(bookingCode);
      setSelectedInvoiceData(res.data || res);
      setInvoiceDrawerOpen(true);
    } catch (error) {
      api.info({ message: 'Chưa có hóa đơn', description: 'Đơn đặt phòng này chưa phát sinh hóa đơn hoàn chỉnh.' });
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handleOpenReviewModal = (booking) => {
    setSelectedBookingForReview(booking);
    setRating(5);
    setComment('');
    setReviewModalOpen(true);
  };

  const handleSendReview = async () => {
    if (!comment.trim()) {
      api.warning({ message: 'Thiếu thông tin', description: 'Vui lòng nhập vài dòng chia sẻ.' });
      return;
    }
    try {
      setLoading(true);
      await reviewApi.createReview({
        bookingId: selectedBookingForReview.id,
        rating: rating,
        comment: comment
      });
      api.success({ message: 'Cảm ơn bạn!', description: 'Đánh giá của bạn đã được ghi nhận.' });
      setReviewModalOpen(false);
    } catch (error) {
      api.error({ message: 'Lỗi', description: error.response?.data?.message || 'Có lỗi xảy ra.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!selectedInvoiceData) return;

    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
      api.warning({ message: 'Bị chặn', description: 'Trình duyệt đang chặn Pop-up. Vui lòng cho phép mở tab mới để in.' });
      return;
    }

    const {
      id, bookingCode, guestName, createdAt, status,
      totalRoomAmount, totalServiceAmount, discountAmount, taxAmount, finalTotal, amountPaid,
      roomDetails, services, damages
    } = selectedInvoiceData;

    const formatMoney = (num) => new Intl.NumberFormat('vi-VN').format(num || 0) + 'đ';
    
    // Bóc tách mảng an toàn
    const roomList = roomDetails?.$values || roomDetails || [];
    const serviceList = services?.$values || services || [];
    const damageList = damages?.$values || damages || [];

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>Hóa Đơn - ${bookingCode}</title>
          <style>
              body { font-family: 'Arial', sans-serif; color: #333; margin: 0; padding: 40px; line-height: 1.5; }
              .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0B132B; padding-bottom: 20px; margin-bottom: 30px; }
              .hotel-info h1 { margin: 0; color: #0B132B; font-size: 28px; letter-spacing: 2px; }
              .hotel-info p { margin: 5px 0; color: #555; font-size: 14px; }
              .invoice-info { text-align: right; }
              .invoice-info h2 { margin: 0; color: #0B132B; font-size: 24px; text-transform: uppercase; }
              .invoice-info p { margin: 5px 0; font-size: 14px; color: #555; }
              
              .guest-box { background: #f8fafc; padding: 20px; border-radius: 8px; display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; border: 1px solid #e2e8f0; }
              .guest-box div p { margin: 5px 0; }
              
              .section-title { font-size: 16px; font-weight: bold; color: #0B132B; border-bottom: 1px solid #ccc; padding-bottom: 8px; margin-bottom: 15px; text-transform: uppercase; }
              
              table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
              th { background: #0B132B; color: white; padding: 10px; text-align: center; }
              th:first-child { text-align: left; }
              th:last-child { text-align: right; }
              td { border-bottom: 1px solid #eee; padding: 12px 10px; text-align: center; }
              td:first-child { text-align: left; }
              td:last-child { text-align: right; font-weight: bold; }
              
              .summary-box { width: 350px; margin-left: auto; font-size: 14px; background: #fff; padding: 15px; border-radius: 8px; }
              .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #eee; }
              .summary-row.total { font-size: 20px; font-weight: bold; color: #0B132B; border-bottom: none; border-top: 2px solid #0B132B; padding-top: 15px; margin-top: 5px; }
              
              .footer { margin-top: 60px; text-align: center; font-size: 13px; color: #666; }
              .signature-area { display: flex; justify-content: space-between; margin-top: 50px; padding: 0 50px; }
              .signature-box { text-align: center; }
              .signature-line { margin-top: 80px; border-top: 1px solid #000; width: 150px; padding-top: 5px; }
          </style>
      </head>
      <body>
          <div class="header">
              <div class="hotel-info">
                  <h1>ABC HOTEL</h1>
                  <p>123 Đường Nguyễn Văn Cừ, Biên Hòa, Đồng Nai</p>
                  <p>SĐT: 0901 234 567 | Email: contact@abchotel.vn</p>
              </div>
              <div class="invoice-info">
                  <h2>BIÊN LAI LƯU TRÚ</h2>
                  <p><strong>Mã HĐ:</strong> #${id}</p>
                  <p><strong>Ngày in:</strong> ${dayjs().format('DD/MM/YYYY HH:mm')}</p>
              </div>
          </div>

          <div class="guest-box">
              <div>
                  <p><strong>Khách hàng:</strong> ${guestName || 'Khách vãng lai'}</p>
                  <p><strong>Mã đặt phòng:</strong> ${bookingCode}</p>
              </div>
              <div style="text-align: right;">
                  <p><strong>Ngày lập:</strong> ${dayjs(createdAt).format('DD/MM/YYYY HH:mm')}</p>
                  <p><strong>Trạng thái HĐ:</strong> <span style="color: ${status === 'Paid' ? '#166534' : '#e11d48'}; font-weight: bold;">${status === 'Paid' ? 'ĐÃ THANH TOÁN' : (status === 'Refund_Pending' || status === 'Refunded' ? 'ĐÃ HỦY / HOÀN TIỀN' : 'CHƯA THANH TOÁN')}</span></p>
              </div>
          </div>

          <div class="section-title">Tiền Phòng (Room Charges)</div>
          <table>
              <thead>
                  <tr>
                      <th>Loại phòng</th>
                      <th>Lịch trình</th>
                      <th>Đơn giá</th>
                      <th>Đêm/Giờ</th>
                      <th>Thành tiền</th>
                  </tr>
              </thead>
              <tbody>
                  ${roomList.map(room => `
                      <tr>
                          <td>${room.roomTypeName} <br/><span style="font-size: 12px; color: #666; font-style: italic;">${room.roomNumber === 'Chưa xếp' ? '(Sẽ xếp phòng khi đến)' : `(Phòng: ${room.roomNumber})`}</span></td>
                          <td>${dayjs(room.checkIn).format('DD/MM')} - ${dayjs(room.checkOut).format('DD/MM')}</td>
                          <td>${formatMoney(room.price)}</td>
                          <td>${room.duration}</td>
                          <td>${formatMoney(room.subTotal)}</td>
                      </tr>
                  `).join('') || '<tr><td colspan="5" style="text-align: center;">Không có dữ liệu</td></tr>'}
              </tbody>
          </table>

          ${serviceList.length > 0 ? `
              <div class="section-title">Dịch Vụ Phát Sinh (Additional Services)</div>
              <table>
                  <thead>
                      <tr>
                          <th>Tên dịch vụ</th>
                          <th>Ngày sử dụng</th>
                          <th>Số lượng</th>
                          <th>Thành tiền</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${serviceList.map(srv => `
                          <tr>
                              <td>${srv.serviceName}</td>
                              <td>${dayjs(srv.date).format('DD/MM/YYYY HH:mm')}</td>
                              <td>${srv.quantity}</td>
                              <td>${formatMoney(srv.totalAmount)}</td>
                          </tr>
                      `).join('')}
                  </tbody>
              </table>
          ` : ''}
          
          ${damageList.length > 0 ? `
              <div class="section-title" style="color: #8B0000; border-bottom-color: #8B0000;">Phí Phạt / Trách nhiệm (Loss & Damages)</div>
              <table>
                  <thead>
                      <tr style="background-color: #8B0000;">
                          <th>Mục phạt</th>
                          <th></th>
                          <th></th>
                          <th>Thành tiền</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${damageList.map(dmg => `
                          <tr>
                              <td colspan="3">${dmg.itemName}</td>
                              <td>${formatMoney(dmg.penaltyAmount)}</td>
                          </tr>
                      `).join('')}
                  </tbody>
              </table>
          ` : ''}

          <div class="summary-box">
              <div class="summary-row">
                  <span>Tổng tiền phòng:</span>
                  <span>${formatMoney(totalRoomAmount)}</span>
              </div>
              <div class="summary-row">
                  <span>Dịch vụ phát sinh:</span>
                  <span>${formatMoney(totalServiceAmount)}</span>
              </div>
              ${discountAmount > 0 ? `
              <div class="summary-row" style="color: #166534;">
                  <span>Giảm giá Voucher:</span>
                  <span>-${formatMoney(discountAmount)}</span>
              </div>` : ''}
              <div class="summary-row">
                  <span>Thuế VAT (10%):</span>
                  <span>${formatMoney(taxAmount)}</span>
              </div>
              <div class="summary-row total">
                  <span>TỔNG CỘNG:</span>
                  <span>${formatMoney(finalTotal)}</span>
              </div>
              
              <div class="summary-row" style="margin-top: 10px; font-weight: bold; color: ${status === 'Paid' ? '#166534' : '#E11D48'};">
                  <span>Khách đã trả:</span>
                  <span>${formatMoney(amountPaid)}</span>
              </div>
              ${status !== 'Paid' && (finalTotal - amountPaid) > 0 ? `
              <div class="summary-row" style="font-weight: bold; color: #e11d48;">
                  <span>CÒN NỢ:</span>
                  <span>${formatMoney(finalTotal - amountPaid)}</span>
              </div>` : ''}
          </div>

          <div class="signature-area">
              <div class="signature-box">
                  <p><strong>Khách hàng</strong></p>
                  <p style="font-size: 12px; color: #666;">(Ký, ghi rõ họ tên)</p>
                  <div class="signature-line"></div>
              </div>
              <div class="signature-box">
                  <p><strong>Nhân viên Lễ tân</strong></p>
                  <p style="font-size: 12px; color: #666;">(Ký, ghi rõ họ tên)</p>
                  <div class="signature-line"></div>
              </div>
          </div>

          <div class="footer">
              <p>Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của ABC Hotel.</p>
          </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  // Chuẩn bị dữ liệu hiển thị cho Drawer UI
  const getRoomDetailsArray = () => selectedInvoiceData?.roomDetails?.$values || selectedInvoiceData?.roomDetails || [];
  const getServicesArray = () => selectedInvoiceData?.services?.$values || selectedInvoiceData?.services || [];

  // Hàm mở Modal và nạp danh sách dịch vụ từ sơ đồ hệ thống
  const handleOpenServiceModal = async (bookingCode) => {
    try {
      setLoading(true);
      // 1. Gọi API lấy thông tin chi tiết phòng để lấy chính xác BookingDetailId
      const resBooking = await bookingApi.getByCode(bookingCode);
      const rooms = resBooking.data?.rooms || resBooking.rooms || [];
      setActiveBookingRooms(rooms);
      
      if (rooms.length > 0) {
        setSelectedRoomDetailId(rooms[0].bookingDetailId); // Mặc định chọn phòng đầu tiên
      }
  
      // 2. Lấy danh mục và danh sách dịch vụ đang kích hoạt trong khách sạn
      const resCats = await serviceApi.getCategories();
      const resServs = await serviceApi.getServices(true); // true = onlyActive
  
      const cats = resCats.data?.$values || resCats.$values || resCats || [];
      const servs = resServs.data?.$values || resServs.$values || resServs || [];
  
      setCategoriesList(cats);
      setServicesList(servs);
      if (cats.length > 0) setActiveServiceTab(cats[0].id.toString());
      
      setServiceCart({}); // Reset giỏ hàng sạch sẽ
      setServiceModalOpen(true);
    } catch (error) {
      api.error({ message: 'Lỗi kết nối', description: 'Không thể tải bảng danh mục dịch vụ.' });
    } finally {
      setLoading(false);
    }
  };

  // Hàm thay đổi số lượng món trong giỏ hàng
  const updateCartQuantity = (serviceId, amount) => {
    setServiceCart(prev => {
      const currentQty = prev[serviceId] || 0;
      const newQty = currentQty + amount;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[serviceId];
        return copy;
      }
      return { ...prev, [serviceId]: newQty };
    });
  };

  // Hàm gửi đơn dịch vụ lên hệ thống phục vụ
  const handleSubmitServiceOrder = async () => {
    if (!selectedRoomDetailId) {
      api.warning({ message: 'Thiếu thông tin', description: 'Vui lòng xác nhận số phòng nhận dịch vụ.' });
      return;
    }
  
    const itemsPayload = Object.keys(serviceCart).map(id => ({
      serviceId: parseInt(id),
      quantity: serviceCart[id]
    }));
  
    if (itemsPayload.length === 0) {
      api.warning({ message: 'Giỏ hàng trống', description: 'Vui lòng chọn ít nhất một món dịch vụ.' });
      return;
    }
  
    try {
      setSubmittingOrder(true);
      await orderApi.create({
        bookingDetailId: selectedRoomDetailId,
        items: itemsPayload,
        notes: "Khách hàng tự đặt trực tuyến từ trên phòng."
      });
  
      api.success({ 
        message: 'Đặt dịch vụ thành công', 
        description: 'Yêu cầu của bạn đã được chuyển đến quầy lễ tân và các bộ phận liên quan!' 
      });
      setServiceModalOpen(false);
      fetchMyBookings(); // Tải lại lịch sử để cập nhật số tiền trong biên lai real-time
    } catch (error) {
      api.error({ message: 'Đặt dịch vụ thất bại', description: error.response?.data?.message || 'Có lỗi xảy ra.' });
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Tính tổng tiền tạm tính của giỏ hàng dịch vụ đang chọn
  const cartTotalAmount = Object.keys(serviceCart).reduce((sum, serviceId) => {
    const item = servicesList.find(s => s.id === parseInt(serviceId));
    return sum + (item ? item.price * serviceCart[serviceId] : 0);
  }, 0);

  return (
    <div className="client-history-wrapper" translate="no">
      {contextHolder}

      <div className="history-hero">
        <div className="container-inner">
          <Title level={2} className="hero-title">ABC Hotel</Title>
          <Text className="hero-subtitle">Cảm ơn bạn đã tin tưởng lựa chọn và trải nghiệm dịch vụ tại ABC Hotel.</Text>
        </div>
      </div>

      <div className="container-inner" style={{ marginTop: -30 }}>
        
        <Card variant="borderless" className="tabs-card">
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab} 
            className="vip-pill-tabs"
            items={[
              { key: 'ALL', label: 'Tất cả' },
              { key: 'Pending', label: 'Chờ xác nhận' },
              { key: 'Confirmed', label: 'Đã xác nhận' },
              { key: 'CheckedIn', label: 'Đang lưu trú' },
              { key: 'Completed', label: 'Đã hoàn tất' },
              { key: 'Cancelled', label: 'Đã hủy' }
            ]} 
          />
        </Card>

        <div className="booking-list-container">
          {loading && bookings.length === 0 ? (
            <div className="loading-state">
              <Spin size="large" />
              <Text style={{ display: 'block', marginTop: 16, color: THEME.TEXT_MUTED }}>Đang tải danh sách đặt phòng...</Text>
            </div>
          ) : filteredBookings.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="empty-state-vip">
              <SuitcaseRolling size={64} color={THEME.BORDER} weight="duotone" />
              <Title level={4} style={{ color: THEME.NAVY_DARK, marginTop: 16 }}>Chưa có kỳ nghỉ nào</Title>
              <Text type="secondary">Bạn chưa có đơn đặt phòng nào trong danh mục này.</Text>
            </motion.div>
          ) : (
            <AnimatePresence>
              {filteredBookings.map((booking, index) => {
                const conf = getStatusConfig(booking.status);
                const inD = booking.expectedCheckIn || booking.actualCheckIn;
                const outD = booking.expectedCheckOut || booking.actualCheckOut;
                const isPastCheckout = dayjs().isAfter(dayjs(outD));
                
                // Cập nhật lại các biến boolean kiểm tra trạng thái
                const showCancel = ['Pending', 'Confirmed'].includes(booking.status);
                const showInvoice = ['Completed', 'CheckedOut', 'Checked_out', 'Confirmed', 'CheckedIn', 'Checked_in', 'Cancelled'].includes(booking.status);
                const showReview = ['Completed', 'CheckedOut', 'Checked_out'].includes(booking.status);

                return (
                  <motion.div 
                    key={booking.id} 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card variant="borderless" className="vip-booking-card">
                      <Row align="middle">
                        
                        <Col xs={24} md={16} className="col-info">
                           <div className="status-badge" style={{ backgroundColor: conf.bg, color: conf.color, borderColor: conf.border }}>
                              {conf.icon} <span className="status-text">{conf.text}</span>
                           </div>
                           
                           <div style={{ marginBottom: 24 }}>
                              <Text className="booking-code-label">MÃ ĐẶT PHÒNG</Text>
                              <Title level={3} className="booking-code-value">{booking.bookingCode}</Title>
                              <Text className="booking-date">Ngày tạo đơn: {dayjs(booking.createdAt).format('DD/MM/YYYY HH:mm')}</Text>
                           </div>

                           <div className="schedule-box">
                              <div className="date-block">
                                  <Text className="date-label">NHẬN PHÒNG</Text>
                                  <Title level={4} className="date-day">{dayjs(inD).format('DD/MM/YYYY')}</Title>
                                  <Text className="date-time">{dayjs(inD).format('HH:mm')}</Text>
                              </div>

                              <div className="timeline-divider">
                                  <div className="line"></div>
                                  <Bed size={24} color={THEME.GOLD} weight="duotone"/>
                                  <div className="line"></div>
                              </div>

                              <div className="date-block text-right">
                                  <Text className="date-label">TRẢ PHÒNG</Text>
                                  <Title level={4} className="date-day">{dayjs(outD).format('DD/MM/YYYY')}</Title>
                                  <Text className="date-time">{dayjs(outD).format('HH:mm')}</Text>
                              </div>
                           </div>
                        </Col>

                        <Col xs={24} md={8} className="col-actions">
                           <div className="action-wrapper">
                              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                              {['CheckedIn', 'Checked_in'].includes(booking.status) && !isPastCheckout && (
                              <Button 
                                  block 
                                  className="btn-vip btn-gold" 
                                  icon={<Coffee size={18} weight="fill"/>} 
                                  onClick={() => handleOpenServiceModal(booking.bookingCode)}
                                  style={{ marginBottom: 12 }}
                              >
                                  Gọi dịch vụ lên phòng
                              </Button>
                            )}
                            {/* Nếu Đang lưu trú nhưng đã quá giờ trả phòng -> Khóa nút lại */}
                            {['CheckedIn', 'Checked_in'].includes(booking.status) && isPastCheckout && (
                              <Button 
                                  block 
                                  className="btn-vip btn-outline" 
                                  disabled
                                  style={{ marginBottom: 12, color: THEME.ACCENT_RED, borderColor: THEME.ACCENT_RED }}
                              >
                                  Đã quá giờ trả phòng
                              </Button>
                            )}

                                 {showInvoice && (
                                   <Button block className="btn-vip btn-outline" icon={<Receipt size={18}/>} onClick={() => handleViewInvoice(booking.bookingCode)} loading={loadingInvoice}>
                                     Chi tiết & Biên lai
                                   </Button>
                                 )}
                                 {showReview && (
                                   <Button block className="btn-vip btn-gold" icon={<Star size={18} weight="fill"/>} onClick={() => handleOpenReviewModal(booking)}>
                                     Đánh giá khách sạn 
                                   </Button>
                                 )}
                                 {/* Chỉ hiển thị nút Thanh toán khi đơn đang chờ thanh toán (Pending) */}
                                  {booking.status === 'Pending' && (
                                      <Button 
                                          block 
                                          className="btn-vip btn-gold" 
                                          icon={<CreditCard size={18} weight="fill"/>} 
                                          loading={loadingPayment[booking.id]}
                                          onClick={() => handlePayAgain(booking)}
                                          style={{ marginBottom: 12 }}
                                      >
                                          Thanh toán cọc ngay
                                      </Button>
                                  )}

                                  {/* Hiển thị nút Hủy cho cả đơn Pending và Confirmed */}
                                  {showCancel && (
                                      <Button block className="btn-vip btn-danger" icon={<XCircle size={18}/>} onClick={() => handleOpenCancelModal(booking)}>
                                          Hủy đặt phòng
                                      </Button>
                                  )}
                                 {!showInvoice && !showCancel && !showReview && booking.status !== 'CheckedIn' && (
                                   <Button block type="dashed" className="btn-vip" icon={<CheckCircle size={18}/>} disabled>
                                     Không có thao tác
                                   </Button>
                                 )}
                              </Space>
                           </div>
                        </Col>

                      </Row>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      <Modal 
        title={<><XCircle size={22} color="#e11d48" style={{verticalAlign: 'middle', marginRight: 8}}/> Yêu cầu hủy đặt phòng</>}
        open={cancelModalOpen} onCancel={() => setCancelModalOpen(false)}
        onOk={handleConfirmCancel} okText="XÁC NHẬN HỦY" okButtonProps={{ danger: true, size: 'large', style: { borderRadius: 8, fontWeight: 'bold' } }}
        cancelButtonProps={{ size: 'large', style: { borderRadius: 8 } }}
        centered
      >
        <div style={{ padding: '16px 0' }}>
           <Paragraph style={{ fontSize: 15 }}>
             Bạn đang yêu cầu hủy mã phòng <Text strong style={{ color: THEME.NAVY_DARK }}>{selectedBookingToCancel?.bookingCode}</Text>. Hành động này không thể hoàn tác.
           </Paragraph>
           
           {selectedBookingToCancel?.status === 'Confirmed' && (
             <div style={{ background: '#FFFBE6', border: '1px solid #FFE58F', padding: '12px 16px', borderRadius: 8, marginBottom: 16 }}>
               <Space align="start">
                 <WarningCircle size={24} color="#B48600" weight="fill" style={{ marginTop: 2 }}/>
                 <Text style={{ color: '#8A6D3B', fontSize: 14 }}>
                   <strong style={{ display: 'block' }}>Chính sách hoàn cọc:</strong>
                   Khách sạn chỉ hoàn lại 100% tiền cọc nếu bạn hủy trước 24 tiếng so với giờ nhận phòng dự kiến. Hủy sát giờ sẽ mất cọc.
                 </Text>
               </Space>
             </div>
           )}

           <Text strong style={{ display: 'block', marginBottom: 8, color: THEME.NAVY_DARK }}>Lý do hủy phòng của bạn:</Text>
           <TextArea rows={4} placeholder="Ví dụ: Tôi có việc đột xuất, Tôi muốn đổi ngày..." value={cancelReason} onChange={e => setCancelReason(e.target.value)} style={{ borderRadius: 8, padding: 12 }}/>
        </div>
      </Modal>

      <Modal 
        title={<><Star size={22} color={THEME.GOLD} weight="fill" style={{verticalAlign: 'middle', marginRight: 8}}/> Đánh giá trải nghiệm</>}
        open={reviewModalOpen} onCancel={() => setReviewModalOpen(false)}
        onOk={handleSendReview} okText="GỬI ĐÁNH GIÁ" 
        okButtonProps={{ size: 'large', style: { background: THEME.NAVY_DARK, borderRadius: 8, fontWeight: 'bold' }, loading: loading }}
        cancelButtonProps={{ size: 'large', style: { borderRadius: 8 } }}
        centered
      >
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <Text strong style={{ display: 'block', marginBottom: 16, fontSize: 16, color: THEME.NAVY_DARK }}>Bạn cảm thấy thế nào về khách sạn của chúng tôi?</Text>
          <Rate value={rating} onChange={setRating} style={{ color: THEME.GOLD, fontSize: 36, marginBottom: 24 }} />
          <TextArea rows={5} placeholder="Chia sẻ những điều bạn hài lòng hoặc cần góp ý để khách sạn phục vụ tốt hơn..." value={comment} onChange={e => setComment(e.target.value)} style={{ borderRadius: 8, padding: 12 }}/>
        </div>
      </Modal>

      {/* MODAL ĐẶT DỊCH VỤ SANG TRỌNG DÀNH CHO KHÁCH LƯU TRÚ */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: THEME.NAVY_DARK, fontFamily: '"Source Serif 4", serif' }}>
            <Coffee size={24} weight="fill" color={THEME.GOLD} />
            <div>
              <Title level={4} style={{ margin: 0, color: THEME.NAVY_DARK }}>Dịch vụ phòng tiện ích</Title>
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>Phục vụ tận phòng nhanh chóng, chu đáo</Text>
            </div>
          </div>
        }
        open={serviceModalOpen}
        onCancel={() => setServiceModalOpen(false)}
        footer={null}
        width={700}
        centered
        bodyStyle={{ padding: '12px 0 0 0' }}
      >
        <Divider style={{ margin: '8px 0' }} />
        
        {/* Thanh chọn số phòng (nếu khách thuê nhiều phòng cùng lúc) */}
        {activeBookingRooms.length > 1 && (
          <div style={{ padding: '0 24px 12px 24px' }}>
            <Text strong style={{ marginRight: 12 }}>Chọn phòng nhận dịch vụ:</Text>
            <Radio.Group value={selectedRoomDetailId} onChange={e => setSelectedRoomDetailId(e.target.value)}>
              {activeBookingRooms.map(r => (
                <Radio.Button key={r.bookingDetailId} value={r.bookingDetailId}>
                  Phòng {r.roomNumber} ({r.roomTypeName})
                </Radio.Button>
              ))}
            </Radio.Group>
          </div>
        )}

        <Row style={{ minHeight: 380, maxHeight: 500, overflow: 'hidden' }}>
          {/* Danh mục dịch vụ dạng Tab đứng bên trái */}
          <Col span={7} style={{ borderRight: `1px solid ${THEME.BORDER}`, overflowY: 'auto' }}>
            <Tabs
              tabPosition="left"
              activeKey={activeServiceTab}
              onChange={setActiveServiceTab}
              className="service-sidebar-tabs"
              items={categoriesList.map(cat => ({
                key: cat.id.toString(),
                label: <span style={{ fontWeight: 600 }}>{cat.name}</span>
              }))}
            />
          </Col>

          {/* Danh sách các mặt hàng/dịch vụ cụ thể thuộc danh mục */}
          <Col span={17} style={{ padding: '0 24px', overflowY: 'auto', maxHeight: 420 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 20 }}>
              {servicesList
                .filter(s => s.categoryId?.toString() === activeServiceTab)
                .map(service => {
                  const qty = serviceCart[service.id] || 0;
                  return (
                    <div key={service.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ flex: 1, paddingRight: 16 }}>
                        <Text strong style={{ color: THEME.NAVY_DARK, fontSize: 15, display: 'block' }}>{service.name}</Text>
                        <Text style={{ color: '#e11d48', fontWeight: 700 }}>
                          {new Intl.NumberFormat('vi-VN').format(service.price)}đ
                          <span style={{ fontSize: 12, color: THEME.TEXT_MUTED, fontWeight: 400 }}> /{service.unit}</span>
                        </Text>
                      </div>
                      
                      {/* Bộ điều khiển tăng giảm số lượng */}
                      <div>
                        {qty === 0 ? (
                          <Button 
                            type="primary" 
                            shape="circle" 
                            icon={<Plus size={16} />} 
                            style={{ background: THEME.NAVY_DARK, border: 'none' }}
                            onClick={() => updateCartQuantity(service.id, 1)}
                          />
                        ) : (
                          <Space size="middle" style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: 20, border: '1px solid #e2e8f0' }}>
                            <Button type="text" size="small" shape="circle" icon={<Minus size={14} />} onClick={() => updateCartQuantity(service.id, -1)} />
                            <Text strong style={{ minWidth: 16, textAlign: 'center', display: 'inline-block' }}>{qty}</Text>
                            <Button type="text" size="small" shape="circle" icon={<Plus size={14} />} onClick={() => updateCartQuantity(service.id, 1)} />
                          </Space>
                        )}
                      </div>
                    </div>
                  );
                })}
              {servicesList.filter(s => s.categoryId?.toString() === activeServiceTab).length === 0 && (
                <Empty description="Danh mục này hiện chưa có dịch vụ nào." style={{ marginTop: 40 }} />
              )}
            </div>
          </Col>
        </Row>

        {/* Phần chân Footer tổng hợp giỏ hàng và nút xác nhận bấm đặt */}
        <div style={{ backgroundColor: '#f8fafc', padding: '20px 24px', borderRadius: '0 0 8px 8px', borderTop: `1px solid ${THEME.BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text type="secondary" style={{ display: 'block', fontSize: 13 }}>Tổng tiền dịch vụ tạm tính:</Text>
            <Title level={3} style={{ margin: 0, color: '#e11d48', fontWeight: 800 }}>
              {new Intl.NumberFormat('vi-VN').format(cartTotalAmount)}đ
            </Title>
          </div>
          <Button 
            type="primary" 
            size="large" 
            loading={submittingOrder}
            disabled={cartTotalAmount === 0}
            onClick={handleSubmitServiceOrder}
            style={{ background: THEME.NAVY_DARK, border: 'none', borderRadius: 8, fontWeight: 'bold', padding: '0 32px' }}
          >
            XÁC NHẬN ĐẶT MÓN
          </Button>
        </div>
      </Modal>

      <Drawer
        title={<Title level={4} style={{ margin: 0, fontFamily: '"Source Serif 4", serif', color: THEME.NAVY_DARK }}>Biên lai lưu trú</Title>}
        placement="right" width={screens?.md ? 600 : '100%'}
        onClose={() => setInvoiceDrawerOpen(false)} open={invoiceDrawerOpen}
        headerStyle={{ borderBottom: `1px solid ${THEME.BORDER}`, padding: '20px 24px' }}
      >
        {selectedInvoiceData ? (
          <div className="vip-receipt-screen">
            
            <div style={{ backgroundColor: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 24 }}>
                <Row style={{ marginBottom: 8 }}>
                  <Col span={8}><Text className="receipt-text-muted">Mã đặt phòng:</Text></Col>
                  <Col span={16} style={{ textAlign: 'right' }}><Text strong style={{color: THEME.NAVY_DARK}}>{selectedInvoiceData.bookingCode}</Text></Col>
                </Row>
                <Row style={{ marginBottom: 8 }}>
                  <Col span={8}><Text className="receipt-text-muted">Khách hàng:</Text></Col>
                  <Col span={16} style={{ textAlign: 'right' }}><Text strong>{selectedInvoiceData.guestName}</Text></Col>
                </Row>
                <Row>
                  <Col span={8}><Text className="receipt-text-muted">Ngày xuất HĐ:</Text></Col>
                  <Col span={16} style={{ textAlign: 'right' }}><Text>{dayjs(selectedInvoiceData.createdAt).format('DD/MM/YYYY HH:mm')}</Text></Col>
                </Row>
            </div>

            {/* DANH SÁCH HẠNG PHÒNG ĐÃ CHỌN */}
            <div style={{ marginBottom: 24 }}>
                <Title level={5} style={{ color: THEME.NAVY_DARK, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                    <Bed size={20} color={THEME.GOLD} /> 1. Tiền Phòng
                </Title>
                {getRoomDetailsArray().length > 0 ? (
                    getRoomDetailsArray().map((room, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #f1f5f9' }}>
                            <div>
                                <Text strong>{room.roomTypeName}</Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>
                                    {room.roomNumber === 'Chưa xếp' ? '(Sẽ xếp phòng khi Check-in)' : `(Phòng: ${room.roomNumber})`}
                                </Text>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <Text strong>{new Intl.NumberFormat('vi-VN').format(room.subTotal)}đ</Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: 12 }}>{room.duration} {room.price === room.subTotal / room.duration ? 'đêm' : 'giờ'}</Text>
                            </div>
                        </div>
                    ))
                ) : <Text type="secondary">Chưa có dữ liệu phòng</Text>}
            </div>

            {/* DANH SÁCH DỊCH VỤ MUA KÈM */}
            {getServicesArray().length > 0 && (
                <div style={{ marginBottom: 24 }}>
                    <Title level={5} style={{ color: THEME.NAVY_DARK, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                        <ShoppingCart size={20} color={THEME.GOLD} /> 2. Dịch vụ phát sinh
                    </Title>
                    {getServicesArray().map((srv, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #f1f5f9' }}>
                            <div>
                                <Text>{srv.serviceName}</Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: 12 }}>SL: {srv.quantity}</Text>
                            </div>
                            <Text strong>{new Intl.NumberFormat('vi-VN').format(srv.totalAmount)}đ</Text>
                        </div>
                    ))}
                </div>
            )}

            <Divider style={{ margin: '16px 0', borderColor: '#cbd5e1' }} />
            
            <Row style={{ marginBottom: 8 }}>
              <Col span={12}><Text className="receipt-text-muted">Tổng tiền phòng & dịch vụ:</Text></Col>
              <Col span={12} style={{ textAlign: 'right' }}><Text strong>{new Intl.NumberFormat('vi-VN').format(selectedInvoiceData.totalRoomAmount + selectedInvoiceData.totalServiceAmount)}đ</Text></Col>
            </Row>
            {selectedInvoiceData.discountAmount > 0 && (
              <Row style={{ marginBottom: 8 }}>
                <Col span={12}><Text strong style={{color: '#10b981'}}>Giảm giá Voucher:</Text></Col>
                <Col span={12} style={{ textAlign: 'right' }}><Text strong style={{color: '#10b981'}}>-{new Intl.NumberFormat('vi-VN').format(selectedInvoiceData.discountAmount)}đ</Text></Col>
              </Row>
            )}
            <Row style={{ marginBottom: 12 }}>
              <Col span={12}><Text className="receipt-text-muted">Thuế VAT (10%):</Text></Col>
              <Col span={12} style={{ textAlign: 'right' }}><Text strong>{new Intl.NumberFormat('vi-VN').format(selectedInvoiceData.taxAmount)}đ</Text></Col>
            </Row>

            <Row align="middle" style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: 8, border: `1px solid ${THEME.NAVY_DARK}` }}>
              <Col span={10}><Text strong style={{ fontSize: 16, textTransform: 'uppercase', color: THEME.NAVY_DARK }}>TỔNG CỘNG</Text></Col>
              <Col span={14} style={{ textAlign: 'right' }}>
                <Title level={2} style={{ margin: 0, color: THEME.NAVY_DARK }}>{new Intl.NumberFormat('vi-VN').format(selectedInvoiceData.finalTotal)}đ</Title>
              </Col>
            </Row>
            
            <Row align="middle" style={{ marginTop: 12, padding: '0 8px' }}>
              <Col span={12}><Text className="receipt-text-muted">Bạn đã thanh toán / Cọc:</Text></Col>
              <Col span={12} style={{ textAlign: 'right' }}>
                <Text strong style={{ color: '#166534', fontSize: 16 }}>{new Intl.NumberFormat('vi-VN').format(selectedInvoiceData.amountPaid)}đ</Text>
              </Col>
            </Row>

            {selectedInvoiceData.status !== 'Paid' && (selectedInvoiceData.finalTotal - selectedInvoiceData.amountPaid) > 0 && (
                <Row align="middle" style={{ marginTop: 8, padding: '0 8px' }}>
                <Col span={12}><Text strong style={{ color: '#e11d48' }}>CÒN NỢ (Thanh toán tại quầy):</Text></Col>
                <Col span={12} style={{ textAlign: 'right' }}>
                    <Text strong style={{ color: '#e11d48', fontSize: 16 }}>{new Intl.NumberFormat('vi-VN').format(selectedInvoiceData.finalTotal - selectedInvoiceData.amountPaid)}đ</Text>
                </Col>
                </Row>
            )}

            <div style={{ marginTop: 40, textAlign: 'center' }}>
               <Button type="primary" size="large" icon={<Printer size={20} />} onClick={handlePrint} style={{ background: THEME.NAVY_DARK, borderRadius: 8, width: '100%' }}>
                 In Biên Lai
               </Button>
            </div>
          </div>
        ) : <Empty description="Không có dữ liệu hóa đơn" />}
      </Drawer>

      <style>{`
        .client-history-wrapper { background-color: ${THEME.BG_LIGHT}; min-height: 100vh; padding-bottom: 80px; font-family: 'Inter', sans-serif; }
        .container-inner { max-width: 900px; margin: 0 auto; padding: 0 24px; position: relative; z-index: 10; } 
        
        .history-hero { background: ${THEME.NAVY_DARK}; padding: 60px 24px 80px 24px; text-align: center; }
        .hero-title { color: ${THEME.GOLD} !important; font-family: '"Source Serif 4", serif'; font-size: 32px !important; margin-bottom: 8px !important; }
        .hero-subtitle { color: #cbd5e1; font-size: 15px; }

        .tabs-card { border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); padding: 4px 8px; margin-bottom: 32px; background: #fff; border: 1px solid ${THEME.BORDER}; }
        
        .vip-pill-tabs .ant-tabs-nav::before { display: none !important; }
        .vip-pill-tabs .ant-tabs-tab { padding: 8px 20px; margin: 0 4px; border-radius: 20px; transition: all 0.3s; color: ${THEME.TEXT_MUTED}; font-weight: 500; }
        .vip-pill-tabs .ant-tabs-tab:hover { color: ${THEME.NAVY_DARK}; background: #f1f5f9; }
        .vip-pill-tabs .ant-tabs-tab-active { background: ${THEME.NAVY_DARK} !important; }
        .vip-pill-tabs .ant-tabs-tab-active .ant-tabs-tab-btn { color: #fff !important; }
        .vip-pill-tabs .ant-tabs-ink-bar { display: none !important; }

        .booking-list-container { display: flex; flex-direction: column; gap: 20px; }

        .vip-booking-card { 
            border-radius: 16px; background: #fff; overflow: hidden;
            border: 1px solid ${THEME.BORDER}; box-shadow: 0 2px 10px rgba(0,0,0,0.02);
            transition: all 0.3s ease; 
        }
        .vip-booking-card:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0,0,0,0.06); border-color: #cbd5e1; }
        .vip-booking-card .ant-card-body { padding: 0; }

        .col-info { padding: 24px 32px !important; }
        .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 700; border: 1px solid; margin-bottom: 16px; }
        .booking-code-label { display: block; font-size: 11px; color: ${THEME.TEXT_MUTED}; font-weight: 700; letter-spacing: 1px; margin-bottom: 2px; }
        .booking-code-value { margin: 0 0 4px 0 !important; font-family: '"Source Serif 4", serif'; font-size: 22px !important; color: ${THEME.NAVY_DARK}; }
        .booking-date { font-size: 13px; color: ${THEME.TEXT_MUTED}; }

        .schedule-box { display: flex; align-items: center; justify-content: space-between; margin-top: 24px; padding-top: 24px; border-top: 1px solid ${THEME.BORDER}; }
        
        .date-block { display: flex; flex-direction: column; }
        .date-block.text-right { text-align: right; }
        .date-label { font-size: 11px; font-weight: 700; color: ${THEME.TEXT_MUTED}; letter-spacing: 1px; margin-bottom: 4px; }
        .date-day { margin: 0 !important; font-size: 18px !important; color: ${THEME.NAVY_DARK} !important; font-weight: 700 !important; }
        .date-time { font-size: 13px; color: ${THEME.TEXT_MUTED}; margin-top: 2px; }

        .timeline-divider { display: flex; align-items: center; flex: 1; padding: 0 24px; gap: 12px; }
        .timeline-divider .line { flex: 1; height: 1px; background: #e2e8f0; }

        .col-actions { padding: 24px !important; background: ${THEME.BG_LIGHT}; border-left: 1px solid ${THEME.BORDER}; display: flex; flex-direction: column; justify-content: center; height: 100%; }
        
        .btn-vip { height: 40px; border-radius: 8px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px; transition: all 0.2s; box-shadow: none; }
        
        .btn-outline { background: #fff; border: 1px solid ${THEME.NAVY_DARK}; color: ${THEME.NAVY_DARK}; }
        .btn-outline:hover { background: ${THEME.NAVY_DARK} !important; color: #fff !important; }
        
        .btn-gold { background: ${THEME.GOLD}; border-color: ${THEME.GOLD}; color: #fff; }
        .btn-gold:hover { background: #B3924B !important; border-color: #B3924B !important; color: #fff !important; }
        
        .btn-danger { background: #fff; border-color: #e11d48; color: #e11d48; }
        .btn-danger:hover { background: #e11d48 !important; color: #fff !important; }

        .service-sidebar-tabs .ant-tabs-nav-list { width: 100%; }
        .service-sidebar-tabs .ant-tabs-tab { padding: 14px 16px !important; margin: 0 !important; justify-content: flex-start; color: #64748b; border-bottom: 1px solid #f1f5f9 !important; }
        .service-sidebar-tabs .ant-tabs-tab-active { background-color: #f8fafc !important; color: #0B132B !important; }
        .service-sidebar-tabs .ant-tabs-ink-bar { right: auto; left: 0; width: 4px; background-color: #C4A45D; }

        .vip-receipt-screen { padding: 8px; }
        .receipt-text-muted { color: #64748B; }

        .loading-state { text-align: center; padding: 80px 0; }
        .empty-state-vip { text-align: center; padding: 80px 24px; background: #fff; border-radius: 12px; border: 1px dashed #cbd5e1; }

        @media (max-width: 768px) {
            .col-info { padding: 20px !important; }
            .col-actions { border-left: none; border-top: 1px solid ${THEME.BORDER}; padding: 20px !important; }
            .schedule-box { flex-direction: column; align-items: flex-start; gap: 16px; }
            .timeline-divider { display: none; }
            .date-block.text-right { text-align: left; }
        }
      `}</style>
    </div>
  );
}