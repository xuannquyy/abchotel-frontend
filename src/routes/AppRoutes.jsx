import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Routes, Route } from 'react-router-dom';

// ================= LAYOUTS =================
import AdminLayout from '../layouts/AdminLayout';
import ClientLayout from '../layouts/ClientLayout'; // 🔥 LAYOUT KHÁCH HÀNG

// ================= PAGES =================
import AuthPage from '../pages/AuthPage';
import HomePage from '../pages/HomePage';
import AdminDashboard from '../pages/AdminDashboard';
import Error404 from '../pages/Errors/Error404';

// ================= COMPONENTS =================
import ProtectedRoute from './ProtectedRoute';
import RequirePermission from './RequirePermission';

// ================= ADMIN PAGES =================
import UserManagementPage from '../pages/UserManagementPage';
import RolesPage from '../pages/RolesPage';
import ProfilePage from '../pages/ProfilePage';
import ShiftsPage from '../pages/ShiftsPage';
import AuditLogsPage from '../pages/AuditLogsPage';
import RoomsPage from '../pages/RoomsPage';
import AttractionsPage from '../pages/AttractionsPage';
import AmenitiesPage from '../pages/AmenitiesPage';
import LossDamagesPage from '../pages/LossDamagesPage';
import ReviewsPage from '../pages/ReviewsPage';
import RoomDetailPage from '../pages/RoomDetail/RoomDetailPage';
import RoomSetupPage from '../pages/RoomSetup/RoomSetupPage';
import RoomSetupWizard from '../pages/RoomSetup/RoomSetupWizard';
import RoomTypeDetail from '../pages/RoomSetup/RoomTypeDetail';
import RoomConfigDetail from '../pages/RoomSetup/RoomConfigDetail';
import InventorySetupPage from '../pages/InventorySetup/InventorySetupPage';
import CategoryManagementPage from '../pages/Article/CategoryManagementPage';
import ArticleManagementPage from '../pages/Article/ArticleManagementPage';
import ArticleEditorPage from '../pages/Article/ArticleEditorPage';
import VouchersPage from '../pages/VouchersPage';
import MembershipsPage from '../pages/MembershipsPage';
import ServicesPage from '../pages/ServicesPage';
import BookingsPage from '../pages/BookingsPage';
import CreateBookingPage from "../pages/CreateBookingPage";
import InvoicesPage from "../pages/InvoicesPage";
import RevenueReportPage from '../pages/RevenueReportPage';
import NotificationsPage from '../pages/NotificationsPage';
// ================= CLIENT PAGES =================
import AboutPage from '../pages/Client/AboutPage';
import ContactPage from '../pages/Client/ContactPage';
import TermsPolicyPage from "../pages/Client/TermsPolicyPage";
import ClientVoucherPage from '../pages/Client/ClientVoucherPage';
import ClientProfilePage from '../pages/Client/ClientProfilePage';
import ClientBookingHistoryPage from '../pages/Client/ClientBookingHistoryPage';
import RoomsAndSuitesPage from '../pages/Client/RoomsAndSuitesPage';
// import ClientBookingPage from '../pages/Client/ClientBookingPage';
import RoomTypeDetails from "../pages/Client/RoomTypeDetails";
import ClientArticlePage from '../pages/Client/ArticlePage';
import ClientArticleDetailPage from '../pages/Client/ArticleDetailPage';
import ClientServicesPage from '../pages/Client/ClientServicesPage';
import SelectRoomPage from '../pages/Client/Booking/SelectRoomPage';
import SelectServicePage from "../pages/Client/Booking/SelectServicePage";
import CheckoutPage from "../pages/Client/Booking/CheckoutPage";


// COMPONENT TẠM THỜI ĐỂ XEM TEST GIAO DIỆN CLIENT
const PlaceholderClientPage = ({ title }) => (
  <div style={{ height: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <h1 style={{ color: '#1C2E4A', fontFamily: '"Source Serif 4", serif' }}>Trang {title} đang thi công...</h1>
  </div>
);

export default function AppRoutes() {
  const { checkAuth, isInitialized } = useAuthStore();

  // Chạy 1 lần duy nhất khi load web để khôi phục phiên
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Nếu chưa check xong Token thì hiện màn hình loading, chặn không cho nhảy trang
  if (!isInitialized) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Đang tải dữ liệu hệ thống...</div>;
  }
  
  return (
    <Routes>
      
      {/* ======================================================== */}
      {/* 1. ROUTES CHO KHÁCH HÀNG (DÙNG CLIENT LAYOUT)            */}
      {/* ======================================================== */}
      <Route element={<ClientLayout />}>
        {/* Nếu em đã có HomePage cũ thì dùng, nếu không nó sẽ rỗng */}
        <Route path="/" element={<HomePage />} /> 
        
        {/* Các trang hiển thị cho khách */}
        <Route path="/rooms" element={<RoomsAndSuitesPage />} />
        <Route path="/room-details" element={<RoomTypeDetails />} />
        <Route path="/services" element={<ClientServicesPage />} />
        <Route path="/offers" element={<ClientVoucherPage />} />
        <Route path="/article" element={<ClientArticlePage />} />
        <Route path="/article/:slug" element={<ClientArticleDetailPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy-policy" element={<TermsPolicyPage />} />
        <Route path="/booking" element={<SelectRoomPage />} />
        <Route path="/booking/services" element={<SelectServicePage />} />
        <Route path="/booking/checkout" element={<CheckoutPage />} />
        
        {/* Route cho Khách hàng đăng nhập vào xem thông tin cá nhân */}
        <Route path="/profile" element={
          <ProtectedRoute>
            <ClientProfilePage />
          </ProtectedRoute>
        } />
        <Route path="/my-bookings" element={
          <ProtectedRoute>
            <ClientBookingHistoryPage />
          </ProtectedRoute>
        } />

        {/* Khách gõ bậy đường dẫn -> Trả về 404 NẰM TRONG Layout Client */}
        <Route path="*" element={<Error404 />} />
      </Route>

      {/* ======================================================== */}
      {/* 2. CÁC ROUTE ĐĂNG NHẬP / ĐĂNG KÝ (KHÔNG CÓ LAYOUT)       */}
      {/* ======================================================== */}
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />

      {/* ======================================================== */}
      {/* 3. ROUTES CHO ADMIN (DÙNG ADMIN LAYOUT)                  */}
      {/* ======================================================== */}
      <Route path="/admin" element={ <ProtectedRoute requireAdmin={true}><AdminLayout /></ProtectedRoute> }>
        
        <Route path="dashboard" element={
          <RequirePermission requiredPermissions={["VIEW_DASHBOARD"]}> 
            <AdminDashboard />
          </RequirePermission>
        } />
        
        <Route path="users" element={
          <RequirePermission requiredPermissions={["MANAGE_USERS", "VIEW_USERS"]}> 
             <UserManagementPage />
          </RequirePermission>
        } />
        
        <Route path="roles" element={
          <RequirePermission requiredPermissions={["MANAGE_ROLES", "VIEW_ROLES"]}>
             <RolesPage />
          </RequirePermission>
        } />
        
        <Route path="profile" element={<ProfilePage />} />
        <Route path="shifts" element={<ShiftsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        
        <Route path="audit-logs" element={
          <RequirePermission requiredPermissions={["VIEW_AUDIT_LOGS"]}>
             <AuditLogsPage />
          </RequirePermission>
        } />
        
        <Route path="categories" element={
          <RequirePermission requiredPermissions={["MANAGE_CONTENT"]}>
            <CategoryManagementPage />
          </RequirePermission>
        } />
        
        <Route path="articles" element={
          <RequirePermission requiredPermissions={["MANAGE_CONTENT"]}>
            <ArticleManagementPage />
          </RequirePermission>
        } />

        <Route path="articles/editor/:id?" element={
          <RequirePermission requiredPermissions={["MANAGE_CONTENT"]}>
            <ArticleEditorPage />
          </RequirePermission>
        } />
        
        <Route path="room-setup" element={
          <RequirePermission requiredPermissions={["MANAGE_ROOMS"]}>
            <RoomSetupPage />
          </RequirePermission>
        } />
        
        <Route path="room-setup/create" element={
          <RequirePermission requiredPermissions={["MANAGE_ROOMS"]}>
            <RoomSetupWizard />
          </RequirePermission>
        } />
        
        <Route path="room-setup/:typeId" element={
          <RequirePermission requiredPermissions={["MANAGE_ROOMS"]}>
            <RoomTypeDetail />
          </RequirePermission>
        } />
        
        <Route path="room-setup/room/:roomId" element={
          <RequirePermission requiredPermissions={["MANAGE_ROOMS"]}>
            <RoomConfigDetail />
          </RequirePermission>
        } />
        
        <Route path="rooms" element={
          <RequirePermission requiredPermissions={["UPDATE_ROOM_STATUS", "UPDATE_CLEANING_STATUS", "MANAGE_INVENTORY", "MANAGE_ROOMS", 'MANAGE_SERVICES', 'MANAGE_BOOKINGS']}>
             <RoomsPage />
          </RequirePermission>
        } />
        
        <Route path="rooms/:id" element={
          <RequirePermission requiredPermissions={["UPDATE_ROOM_STATUS", "UPDATE_CLEANING_STATUS", "MANAGE_INVENTORY", "MANAGE_ROOMS", 'MANAGE_SERVICES', 'MANAGE_BOOKINGS']}>
             <RoomDetailPage />
          </RequirePermission>
        } />
        
        <Route path="inventory-setup" element={
          <RequirePermission requiredPermissions={["MANAGE_INVENTORY"]}>
            <InventorySetupPage />
          </RequirePermission>
        } />
        
        <Route path="attractions" element={
          <RequirePermission requiredPermissions={["MANAGE_CONTENT"]}>
             <AttractionsPage />
          </RequirePermission>
        } />
        
        <Route path="amenities" element={
          <RequirePermission requiredPermissions={["MANAGE_ROOMS"]}>
             <AmenitiesPage />
          </RequirePermission>
        } />
        
        <Route path="loss-damages" element={
          <RequirePermission requiredPermissions={["VIEW_REPORTS", "MANAGE_INVOICES"]}>
            <LossDamagesPage />
          </RequirePermission>
        } />
        
        <Route path="reviews" element={
          <RequirePermission requiredPermissions={["MANAGE_CONTENT"]}>
             <ReviewsPage />
          </RequirePermission>
        } />
        
        <Route path="vouchers" element={
          <RequirePermission requiredPermissions={["MANAGE_VOUCHERS"]}>
             <VouchersPage />
          </RequirePermission>
        } />
        
        <Route path="memberships" element={
          <RequirePermission requiredPermissions={["MANAGE_USERS"]}>
             <MembershipsPage />
          </RequirePermission>
        } />
        
        <Route path="services" element={
          <RequirePermission requiredPermissions={["MANAGE_SERVICES"]}>
             <ServicesPage />
          </RequirePermission>
        } />
        
        <Route path="bookings" element={
          <RequirePermission requiredPermissions={["MANAGE_BOOKINGS", "MANAGE_INVOICES"]}>
            <BookingsPage />
          </RequirePermission>
        } />
        
        <Route path="bookings/create" element={
          <RequirePermission requiredPermissions={["MANAGE_BOOKINGS"]}>
             <CreateBookingPage />
          </RequirePermission>
        } />
        
        <Route path="invoices" element={
          <RequirePermission requiredPermissions={["MANAGE_INVOICES"]}>
            <InvoicesPage />
          </RequirePermission>
        } />
        <Route path="revenue-report" element={
          <RequirePermission requiredPermissions={["VIEW_REPORTS", "MANAGE_INVOICES"]}>
             <RevenueReportPage />
          </RequirePermission>
        } />

        {/* Quản trị viên gõ bậy đường dẫn -> Trả về 404 NẰM TRONG Layout Admin */}
        <Route path="*" element={<Error404 />} />
      </Route>

    </Routes>
  );
}