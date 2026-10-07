import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Row, Col, Button, message, Modal } from 'antd';
import { 
  Crown, Gift, MagicWand, Cards, Quotes,
  DiamondsFour, MusicNotes, HandWaving, Lock
} from '@phosphor-icons/react';
import { voucherApi } from '../../api/voucherApi';

const { Title, Text, Paragraph } = Typography;

const THEME = {
  NAVY_DARK: '#0D1821', 
  DARK_RED: '#8A1538',  
  GOLD: '#D4AF37',      
  BG_LIGHT: '#F8FAFC',
};

export default function ClientVoucherPage() {
  const [vouchers, setVouchers] = useState([]);
  const [myVouchers, setMyVouchers] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // States quản lý phần thưởng và vòng quay
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [revealedVoucher, setRevealedVoucher] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);

  // --- STATES ĐỂ TẠO TƯƠNG TÁC TRÒ CHƠI ---
  const [activeGame, setActiveGame] = useState(null); // 'BOX', 'CARD', 'DICE', 'SCRATCH', 'MUSIC'
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [isDiceRolling, setIsDiceRolling] = useState(false);

  // 1. CẬP NHẬT USER & ĐỒNG BỘ LOCALSTORAGE
  const updateUser = useCallback(() => {
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser && savedUser !== "undefined" && savedUser !== "null") {
        setUser(JSON.parse(savedUser));
      } else {
        setUser(null);
      }
    } catch (e) {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    updateUser();
    window.addEventListener('storage', updateUser);
    window.addEventListener('userLoginSuccess', updateUser);
    return () => {
      window.removeEventListener('storage', updateUser);
      window.removeEventListener('userLoginSuccess', updateUser);
    };
  }, [updateUser]);

  // 2. TẢI DỮ LIỆU BAN ĐẦU
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const res = await voucherApi.getAll(true);
        setVouchers(res || []);
        
        const saved = localStorage.getItem('my_vouchers');
        if (saved) setMyVouchers(JSON.parse(saved));
      } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  // 3. THU THẬP VOUCHER TỪ TRÒ CHƠI
  const collectVoucher = (v) => {
    if (!v) return;

    const savedUserStr = localStorage.getItem('user');
    const isActuallyLoggedIn = savedUserStr && savedUserStr !== "null" && savedUserStr !== "undefined";

    if (v.discountType === 'VIP_ONLY' || v.discountType === 'BIRTHDAY') {
      if (!isActuallyLoggedIn) {
        message.error("Mã đặc quyền trúng thưởng này yêu cầu bạn phải đăng nhập tài khoản mới được nhận!");
        return;
      }
    }

    const isCollected = myVouchers.some(item => item.id === v.id);
    if (!isCollected) {
      const updated = [v, ...myVouchers];
      setMyVouchers(updated);
      localStorage.setItem('my_vouchers', JSON.stringify(updated));
      message.success('Tuyệt vời! Mã ưu đãi đã được lưu vào kho của bạn.');
    } else {
      message.info("Bạn đã thu thập mã này trước đó rồi.");
    }

    if (v.code) navigator.clipboard.writeText(v.code);
    setIsResultModalOpen(false);
  };

  // --- HÀM TRUNG GIAN ĐỂ LỌC DANH SÁCH VOUCHER PHÙ HỢP VỚI HẠNG ĐỐI TƯỢNG ---
 // --- HÀM TRUNG GIAN ĐỂ LỌC DANH SÁCH VOUCHER PHÙ HỢP VỚI HẠNG ĐỐI TƯỢNG VÀ TRÁNH TRÙNG LẶP ---
  const getFilteredVouchers = () => {
    // 1. Lấy hạng thành viên từ LocalStorage (đưa về chữ IN HOA)
    const userTier = user?.membership?.tierName?.toUpperCase() || '';
    const isVipUser = !!(userTier === 'VIP' || user?.membership_id === 5);
    
    // Lấy danh sách ID các voucher mà người dùng ĐÃ THU THẬP ĐƯỢC RỒI để loại bỏ
    const collectedIds = myVouchers.map(item => item.id);

    return vouchers.filter(v => {
      // ĐIỀU KIỆN CHỐNG TRÙNG: Nếu voucher này đã có trong kho cá nhân, bỏ qua không cho trúng lại nữa
      if (collectedIds.includes(v.id)) {
        return false;
      }

      // Chuẩn hóa mã Code và loại giảm giá từ DB về chữ IN HOA để quét điều kiện phân quyền
      const voucherCode = v.code?.toUpperCase() || '';
      const discountType = v.discountType?.toUpperCase() || '';

      // TRƯỜNG HỢP 1: Nếu mã Code chứa chữ 'VIP' hoặc loại giảm giá là 'VIP_ONLY'
      if (voucherCode.includes('VIP') || discountType === 'VIP_ONLY') {
        return isVipUser; // Chỉ VIP mới được quay trúng
      }
      
      // TRƯỜNG HỢP 2: Nếu là mã Sinh nhật (Birthday)
      if (voucherCode.includes('BIRTHDAY') || discountType === 'BIRTHDAY') {
        return !!user; // Bắt buộc đăng nhập
      }
      
      // TRƯỜNG HỢP 3: Các mã thường khác, ai cũng có thể trúng
      return true;
    });
  };

  // 4. KÍCH HOẠT VÀO MÀN HÌNH TRÒ CHƠI
  const handleOpenGame = (type) => {
    if (vouchers.length === 0) {
      message.info("Hiện tại chưa có sự kiện quà tặng khả dụng.");
      return;
    }

    const validList = getFilteredVouchers();
    if (validList.length === 0) {
      message.warning("Hiện tại không có phần quà nào khả dụng phù hợp với tài khoản của bạn.");
      return;
    }

    // Nếu là vòng quay (WHEEL) thì chạy hiệu ứng xoay trực tiếp tại thẻ luôn
    if (type === 'WHEEL') {
      setIsSpinning(true);
      // Bốc thăm ngẫu nhiên từ danh sách voucher đã được lọc sạch
      const randomReward = validList[Math.floor(Math.random() * validList.length)];
      setRevealedVoucher(randomReward);
      setRotation(prev => prev + 1800 + Math.random() * 360);
      setTimeout(() => { 
        setIsSpinning(false); 
        setIsResultModalOpen(true); 
      }, 3000);
    } else {
      // Các trò chơi khác sẽ mở Modal sân chơi tương tác lên
      setActiveGame(type);
      setIsGameModalOpen(true);
    }
  };

  // 5. XỬ LÝ KHI NGƯỜI DÙNG CLICK VÀO HỘP QUÀ / LẬT THẺ BÀI / ĐẬP KÉT SẮT...
  const handleSelectInteractiveItem = () => {
    const validList = getFilteredVouchers();
    if (validList.length === 0) {
      message.warning("Không tìm thấy phần thưởng phù hợp.");
      setIsGameModalOpen(false);
      return;
    }

    const randomReward = validList[Math.floor(Math.random() * validList.length)];
    setRevealedVoucher(randomReward);
    
    // Đóng modal chơi game và mở modal kết quả chúc mừng sau 400ms hiệu ứng giả lập
    setTimeout(() => {
      setIsGameModalOpen(false);
      setIsResultModalOpen(true);
    }, 400);
  };

  // 6. XỬ LÝ RIÊNG CHO LẮC XÚC XẮC
  const handleRollDiceGame = () => {
    const validList = getFilteredVouchers();
    if (validList.length === 0) {
      message.warning("Không tìm thấy phần thưởng phù hợp.");
      setIsGameModalOpen(false);
      return;
    }

    setIsDiceRolling(true);
    const randomReward = validList[Math.floor(Math.random() * validList.length)];
    setRevealedVoucher(randomReward);

    setTimeout(() => {
      setIsDiceRolling(false);
      setIsGameModalOpen(false);
      setIsResultModalOpen(true);
    }, 1500);
  };

  const renderGameCard = (title, story, icon, color, bgColor, btnLabel, type) => (
    <div className={`luxury-card ${color === THEME.DARK_RED ? 'br-red' : 'br-navy'}`}>
      <div className="visual-part" style={{ backgroundColor: bgColor }}>
        <div className="icon-main">{icon}</div>
        <Button 
          className={`btn-game ${color === THEME.DARK_RED ? 'btn-red' : 'btn-gold'}`} 
          onClick={() => handleOpenGame(type)}
          loading={type === 'WHEEL' ? isSpinning : false}
        >
          {btnLabel}
        </Button>
      </div>
      <div className="story-part">
        <Quotes size={24} color={THEME.GOLD} weight="fill" style={{ opacity: 0.2 }} />
        <Title level={4} style={{ fontFamily: '"Source Serif 4", serif', margin: '5px 0' }}>{title}</Title>
        <Paragraph style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', margin: 0 }}>{story}</Paragraph>
      </div>
    </div>
  );

  const isVipUser = !!(user?.membership?.tierName?.toUpperCase() === 'VIP' || user?.membership_id === 5);

  return (
    <div style={{ backgroundColor: THEME.BG_LIGHT, minHeight: '100vh', paddingBottom: 100 }}>
      <div className="luxury-hero">
        <div className="overlay-dark" />
        <div className="hero-content">
          <Crown size={60} color={THEME.GOLD} weight="fill" />
          <Title className="main-title">ƯU ĐÃI HẤP DẪN</Title>
          <Text className="sub-title">ABC HOTEL - ELEGANCE & LUXURY</Text>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '60px auto', padding: '0 20px' }}>
        
        {/* SỰ KIỆN MAY MẮN */}
        <Title level={3} className="label-section red-label">SỰ KIỆN MAY MẮN</Title>
        <Row gutter={[32, 32]} style={{ marginBottom: 50 }}>
          <Col xs={24} lg={12}>{renderGameCard("Vòng Quay Di Sản", "Xoay trục thời gian nhận quà.", <div className="wheel-wrap"><div className="wheel-body" style={{ transform: `rotate(${rotation}deg)` }} /><div className="wheel-pin" /></div>, THEME.DARK_RED, "#fff5f5", "QUAY THƯỞNG", "WHEEL")}</Col>
          <Col xs={24} lg={12}>{renderGameCard("Hộp Quà Bí Mật", "Khám phá quà tri ân.", <Gift size={60} color={THEME.DARK_RED} weight="duotone" />, THEME.DARK_RED, "#fff5f5", "MỞ HỘP QUÀ", "BOX")}</Col>
          <Col xs={24}>{renderGameCard("Cào Thẻ May Mắn", "Cào lớp phủ nhận ưu đãi.", <HandWaving size={60} color={THEME.DARK_RED} weight="fill" />, THEME.DARK_RED, "#fff5f5", "CÀO THẺ NGAY", "SCRATCH")}</Col>
        </Row>

        {/* KHO TÀNG DI SẢN */}
        <Title level={3} className="label-section navy-label">KHO TÀNG DI SẢN</Title>
        <Row gutter={[32, 32]} style={{ marginBottom: 60 }}>
          <Col xs={24} lg={12}>{renderGameCard("Thẻ Bài Quý Tộc", "Quân bài dẫn lối may mắn.", <Cards size={60} color={THEME.GOLD} weight="duotone" />, THEME.NAVY_DARK, THEME.NAVY_DARK, "LẬT THẺ BÀI", "CARD")}</Col>
          <Col xs={24} lg={12}>{renderGameCard("Xúc Xắc Tài Lộc", "Gieo vận may cùng súc xắc vàng.", <DiamondsFour size={60} color={THEME.GOLD} weight="fill" />, THEME.NAVY_DARK, THEME.NAVY_DARK, "GIEO XÚC XẮC", "DICE")}</Col>
          <Col xs={24}>{renderGameCard("Giai Điệu Di Sản", "Mở két sắt theo nhịp điệu.", <MusicNotes size={60} color={THEME.GOLD} weight="fill" />, THEME.NAVY_DARK, THEME.NAVY_DARK, "MỞ KÉT SẮT", "MUSIC")}</Col>
        </Row>

        {/* PHẦN PHÂN QUYỀN HEADER VIP/LOCK */}
        {!user ? (
          <div className="locked-vip-section">
            <div className="locked-content">
              <Lock size={40} color={THEME.GOLD} weight="fill" />
              <Title level={4} style={{ color: '#fff', marginTop: 15 }}>KHÁM PHÁ ĐẶC QUYỀN</Title>
              <Text style={{ color: '#aab' }}>Hãy đăng nhập để tham gia trò chơi và lưu giữ các mã giảm giá đặc quyền vào tài khoản cá nhân.</Text>
            </div>
          </div>
        ) : !isVipUser ? (
          <div className="locked-vip-section" style={{ background: 'linear-gradient(rgba(20, 30, 48, 0.9), rgba(36, 59, 85, 0.9))' }}>
            <div className="locked-content">
              <Crown size={40} color="#C0C0C0" weight="fill" />
              <Title level={4} style={{ color: '#fff', marginTop: 15 }}>ĐẶC QUYỀN VIP Đang Khóa</Title>
              <Text style={{ color: '#aab' }}>Xin chào {user.fullName || user.full_name}, nâng cấp thẻ hội viên để mở khóa các phần quà giá trị cao hơn.</Text>
            </div>
          </div>
        ) : (
          <div style={{ padding: '40px 30px', background: `linear-gradient(135deg, ${THEME.NAVY_DARK} 0%, #1a2a3a 100%)`, borderRadius: '24px', border: `2px solid ${THEME.GOLD}`, marginBottom: 50, textAlign: 'center', boxShadow: `0 10px 30px rgba(212, 175, 55, 0.2)` }}>
            <Crown size={50} color={THEME.GOLD} weight="fill" />
            <Title level={3} style={{ color: THEME.GOLD, marginTop: 10, fontFamily: '"Source Serif 4", serif' }}>THÀNH VIÊN KIM CƯƠNG</Title>
            <Text style={{ color: '#fff', fontSize: 16 }}>Chúc mừng bạn! Toàn bộ kho ưu đãi cao cấp nhất đã sẵn sàng dành cho bạn.</Text>
          </div>
        )}
      </div>

      {/* --- MODAL TRẠNG THÁI TƯƠNG TÁC TRÒ CHƠI --- */}
      <Modal 
        open={isGameModalOpen} 
        onCancel={() => setIsGameModalOpen(false)} 
        footer={null} 
        centered
        width={600}
        destroyOnClose
      >
        <div style={{ textAlign: 'center', padding: '20px 10px' }}>
          {activeGame === 'BOX' && (
            <>
              <Title level={3} style={{color: THEME.DARK_RED}}>CHỌN 1 HỘP QUÀ BẠN THÍCH</Title>
              <Paragraph type="secondary">Voucher ngẫu nhiên đang ẩn giấu bên trong các hộp quà tri ân</Paragraph>
              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 30 }}>
                {[1, 2, 3].map((num) => (
                  <div key={num} className="interactive-item item-box" onClick={handleSelectInteractiveItem}>
                    <Gift size={64} color={THEME.DARK_RED} weight="duotone" />
                    <div style={{marginTop: 8, fontWeight: 'bold'}}>Hộp số {num}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeGame === 'CARD' && (
            <>
              <Title level={3} style={{color: THEME.GOLD}}>LẬT THẺ BÀI MAY MẮN</Title>
              <Paragraph style={{color: '#64748b'}}>Chọn 1 quân bài hoàng gia để tìm kiếm mã ưu đãi đặc quyền</Paragraph>
              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 30 }}>
                {[1, 2, 3].map((num) => (
                  <div key={num} className="interactive-item item-card" onClick={handleSelectInteractiveItem}>
                    <Cards size={64} color={THEME.GOLD} weight="fill" />
                    <div style={{marginTop: 8, fontWeight: 'bold', color: '#fff'}}>Thẻ {num}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeGame === 'DICE' && (
            <>
              <Title level={3} style={{color: THEME.NAVY_DARK}}>GIEO XÚC XẮC VÀNG</Title>
              <Paragraph type="secondary">Gieo điểm may mắn để nhận chiết khấu đặt phòng khách sạn</Paragraph>
              <div style={{ padding: '40px 0' }}>
                <div className={`dice-cube ${isDiceRolling ? 'dice-shake' : ''}`}>
                  <DiamondsFour size={80} color={THEME.GOLD} weight="fill" />
                </div>
              </div>
              <Button 
                type="primary" 
                size="large" 
                onClick={handleRollDiceGame} 
                loading={isDiceRolling}
                style={{backgroundColor: THEME.NAVY_DARK, borderColor: THEME.NAVY_DARK, minWidth: 160}}
              >
                {isDiceRolling ? 'ĐANG LẮC...' : 'LẮC XÚC XẮC'}
              </Button>
            </>
          )}

          {activeGame === 'SCRATCH' && (
            <>
              <Title level={3} style={{color: THEME.DARK_RED}}>CÀO THẺ HOÀNG GIA</Title>
              <Paragraph type="secondary">Click vào lớp phủ bảo mật bên dưới để cào và xem phần quà</Paragraph>
              <div style={{display: 'flex', justifyContent: 'center', marginTop: 25}}>
                <div className="scratch-area" onClick={handleSelectInteractiveItem}>
                  <HandWaving size={32} color="#fff" />
                  <span style={{marginLeft: 10, fontWeight: 'bold'}}>CÀO LỚP PHỦ TẠI ĐÂY</span>
                </div>
              </div>
            </>
          )}

          {activeGame === 'MUSIC' && (
            <>
              <Title level={3} style={{color: THEME.GOLD}}>BẬT KÉT SẮT THEO GIAI ĐIỆU</Title>
              <Paragraph type="secondary">Chọn 1 trong các nốt nhạc di sản sau để kích hoạt mật mã két sắt</Paragraph>
              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 35 }}>
                {['Đô', 'Rê', 'Mi'].map((note, index) => (
                  <div key={index} className="interactive-item item-music" onClick={handleSelectInteractiveItem}>
                    <MusicNotes size={50} color={THEME.GOLD} weight="duotone" />
                    <div style={{marginTop: 10, fontWeight: 'bold'}}>{note}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* MODAL HIỂN THỊ KẾT QUẢ VOUCHER */}
      <Modal open={isResultModalOpen} onCancel={() => setIsResultModalOpen(false)} footer={null} centered>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <MagicWand size={64} color={THEME.GOLD} weight="fill" />
          <Title level={2}>XIN CHÚC MỪNG!</Title>
          <div className="result-box">{revealedVoucher?.code}</div>
          <Button type="primary" block onClick={() => collectVoucher(revealedVoucher)} className="btn-red" style={{height: 50}}>NHẬN NGAY</Button>
        </div>
      </Modal>

      <style>{`
        .luxury-hero { height: 380px; display: flex; align-items: center; justify-content: center; background: url("https://i1-c.pinimg.com/1200x/6b/e7/eb/6be7eb8639b3480dc7eb103685cc69b4.jpg") center/cover; position: relative; }
        .overlay-dark { position: absolute; inset: 0; background: rgba(13,24,33,0.85); }
        .hero-content { position: relative; color: #fff; text-align: center; }
        .main-title { color: #fff !important; font-size: 42px !important; font-family: "Source Serif 4", serif !important; letter-spacing: 4px; }
        .sub-title { color: ${THEME.GOLD}; font-weight: bold; letter-spacing: 2px; }
        .label-section { padding-left: 15px; margin-bottom: 25px !important; font-family: "Source Serif 4", serif !important; border-left: 5px solid; }
        .red-label { border-color: ${THEME.DARK_RED}; color: ${THEME.DARK_RED} !important; }
        .navy-label { border-color: ${THEME.NAVY_DARK}; color: ${THEME.NAVY_DARK} !important; }
        .luxury-card { background: #fff; border-radius: 24px; height: 260px; display: flex; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
        .br-red { border-bottom: 5px solid ${THEME.DARK_RED}; }
        .br-navy { border-bottom: 5px solid ${THEME.NAVY_DARK}; }
        .visual-part { width: 40%; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 25px; border-right: 1px dashed #eee; }
        .story-part { width: 60%; padding: 25px; display: flex; flex-direction: column; justify-content: center; }
        .btn-game { border-radius: 12px; height: 42px; font-weight: 800; width: 100%; border: none; font-size: 11px; }
        .btn-red { background: ${THEME.DARK_RED} !important; color: #fff !important; }
        .btn-gold { background: ${THEME.GOLD} !important; color: ${THEME.NAVY_DARK} !important; }
        .locked-vip-section { background: linear-gradient(rgba(13,24,33,0.9), rgba(13,24,33,0.9)), url('https://img.freepik.com/free-vector/abstract-dark-particles-background_23-2148385311.jpg'); border-radius: 30px; padding: 60px 20px; text-align: center; border: 1px solid ${THEME.GOLD}; position: relative; overflow: hidden; }
        .wheel-wrap { position: relative; width: 110px; height: 110px; }
        .wheel-body { width: 100%; height: 100%; border-radius: 50%; border: 3px solid ${THEME.GOLD}; background: conic-gradient(${THEME.NAVY_DARK} 0% 25%, ${THEME.DARK_RED} 25% 50%, ${THEME.NAVY_DARK} 50% 75%, ${THEME.DARK_RED} 75% 100%); transition: transform 3s cubic-bezier(0.1, 0, 0, 1); }
        .wheel-pin { position: absolute; top: -5px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 12px solid ${THEME.GOLD}; z-index: 2; }
        .result-box { background: ${THEME.NAVY_DARK} !important; color: ${THEME.GOLD} !important; font-size: 36px; font-weight: bold; padding: 25px; border-radius: 20px; margin: 20px 0; }
        
        /* CSS CHƠI GAME TƯƠNG TÁC MỚI */
        .interactive-item { padding: 20px; border-radius: 16px; cursor: pointer; transition: all 0.3s ease; border: 2px dashed transparent; width: 130px; text-align: center; }
        .interactive-item:hover { transform: translateY(-8px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
        .item-box { background: #fff5f5; border-color: ${THEME.DARK_RED}; }
        .item-card { background: ${THEME.NAVY_DARK}; border-color: ${THEME.GOLD}; }
        .item-music { background: #fafafa; border-color: ${THEME.GOLD}; color: ${THEME.NAVY_DARK}; }
        
        .dice-cube { display: inline-block; transition: all 0.3s ease; }
        .dice-shake { animation: shake 0.15s infinite; }
        @keyframes shake {
          0% { transform: translate(2px, 1px) rotate(0deg); }
          10% { transform: translate(-1px, -2px) rotate(-1deg); }
          20% { transform: translate(-3px, 0px) rotate(1deg); }
          30% { transform: translate(0px, 2px) rotate(0deg); }
          40% { transform: translate(1px, -1px) rotate(1deg); }
          50% { transform: translate(-1px, 2px) rotate(-1deg); }
          60% { transform: translate(-3px, 1px) rotate(0deg); }
          70% { transform: translate(2px, 1px) rotate(-1deg); }
          80% { transform: translate(-1px, -1px) rotate(1deg); }
          90% { transform: translate(2px, 2px) rotate(0deg); }
          100% { transform: translate(1px, -2px) rotate(-1deg); }
        }

        .scratch-area { width: 100%; max-width: 350px; height: 120px; background: linear-gradient(135deg, #708090, #c0c0c0); border-radius: 16px; display: flex; align-items: center; justify-content: center; color: #fff; border: 3px dashed #fff; cursor: pointer; transition: opacity 0.2s; }
        .scratch-area:hover { opacity: 0.9; }
      `}</style>
    </div>
  );
}