import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/context/authStore';
import Layout from '@/components/layout/Layout';

// 페이지 컴포넌트들
import HomePage from '@/pages/HomePage';
import ProductListPage from '@/pages/ProductListPage';
import ProductDetailPage from '@/pages/ProductDetailPage';
import CartPage from '@/pages/CartPage';
import CheckoutPage from '@/pages/CheckoutPage';
import OrderCompletePage from '@/pages/OrderCompletePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import MyPage from '@/pages/MyPage';
import OrderListPage from '@/pages/OrderListPage';
import OrderDetailPage from '@/pages/OrderDetailPage';
import WishlistPage from '@/pages/WishlistPage';
import ReviewPage from '@/pages/ReviewPage';
import InquiryPage from '@/pages/InquiryPage';
import ProfilePage from '@/pages/ProfilePage';
import PointPage from '@/pages/PointPage';
import CouponPage from '@/pages/CouponPage';
import DdcarePage from '@/pages/DdcarePage';
import NoticePage from '@/pages/NoticePage';
import NoticeDetailPage from '@/pages/NoticeDetailPage';
import FaqPage from '@/pages/FaqPage';
import TermsPage from '@/pages/TermsPage';
import NotFoundPage from '@/pages/NotFoundPage';

// 관리자 페이지
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminProductList from '@/pages/admin/AdminProductList';
import AdminProductForm from '@/pages/admin/AdminProductForm';
import AdminOrderList from '@/pages/admin/AdminOrderList';
import AdminDdcareList from '@/pages/admin/AdminDdcareList';
import AdminCategoryList from '@/pages/admin/AdminCategoryList';
import AdminCustomerList from '@/pages/admin/AdminCustomerList';
import AdminStats from '@/pages/admin/AdminStats';

// Protected Route 컴포넌트
function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Guest Route 컴포넌트
function GuestRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
}

// Admin Route 컴포넌트
function AdminRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return <AdminLayout>{children}</AdminLayout>;
}

// Shop Layout Wrapper
function ShopLayout({ children }) {
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      {/* 관리자 */}
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/products" element={<AdminRoute><AdminProductList /></AdminRoute>} />
      <Route path="/admin/products/new" element={<AdminRoute><AdminProductForm /></AdminRoute>} />
      <Route path="/admin/products/:id/edit" element={<AdminRoute><AdminProductForm /></AdminRoute>} />
      <Route path="/admin/orders" element={<AdminRoute><AdminOrderList /></AdminRoute>} />
      <Route path="/admin/ddcare" element={<AdminRoute><AdminDdcareList /></AdminRoute>} />
      <Route path="/admin/categories" element={<AdminRoute><AdminCategoryList /></AdminRoute>} />
      <Route path="/admin/customers" element={<AdminRoute><AdminCustomerList /></AdminRoute>} />
      <Route path="/admin/stats" element={<AdminRoute><AdminStats /></AdminRoute>} />

      {/* 쇼핑몰 */}
      <Route path="/" element={<ShopLayout><HomePage /></ShopLayout>} />
      <Route path="/products" element={<ShopLayout><ProductListPage /></ShopLayout>} />
      <Route path="/products/:slug" element={<ShopLayout><ProductDetailPage /></ShopLayout>} />
      <Route path="/cart" element={<ShopLayout><CartPage /></ShopLayout>} />
      <Route path="/checkout" element={<ShopLayout><ProtectedRoute><CheckoutPage /></ProtectedRoute></ShopLayout>} />
      <Route path="/order/complete" element={<ShopLayout><ProtectedRoute><OrderCompletePage /></ProtectedRoute></ShopLayout>} />
      <Route path="/login" element={<ShopLayout><GuestRoute><LoginPage /></GuestRoute></ShopLayout>} />
      <Route path="/register" element={<ShopLayout><GuestRoute><RegisterPage /></GuestRoute></ShopLayout>} />
      <Route path="/mypage" element={<ShopLayout><ProtectedRoute><MyPage /></ProtectedRoute></ShopLayout>} />
      <Route path="/mypage/orders" element={<ShopLayout><ProtectedRoute><OrderListPage /></ProtectedRoute></ShopLayout>} />
      <Route path="/mypage/orders/:orderNumber" element={<ShopLayout><ProtectedRoute><OrderDetailPage /></ProtectedRoute></ShopLayout>} />
      <Route path="/mypage/wishlist" element={<ShopLayout><ProtectedRoute><WishlistPage /></ProtectedRoute></ShopLayout>} />
      <Route path="/mypage/reviews" element={<ShopLayout><ProtectedRoute><ReviewPage /></ProtectedRoute></ShopLayout>} />
      <Route path="/mypage/inquiries" element={<ShopLayout><ProtectedRoute><InquiryPage /></ProtectedRoute></ShopLayout>} />
      <Route path="/mypage/profile" element={<ShopLayout><ProtectedRoute><ProfilePage /></ProtectedRoute></ShopLayout>} />
      <Route path="/mypage/points" element={<ShopLayout><ProtectedRoute><PointPage /></ProtectedRoute></ShopLayout>} />
      <Route path="/mypage/coupons" element={<ShopLayout><ProtectedRoute><CouponPage /></ProtectedRoute></ShopLayout>} />
      <Route path="/mypage/ddcare" element={<ShopLayout><ProtectedRoute><DdcarePage /></ProtectedRoute></ShopLayout>} />
      <Route path="/notices" element={<ShopLayout><NoticePage /></ShopLayout>} />
      <Route path="/notices/:id" element={<ShopLayout><NoticeDetailPage /></ShopLayout>} />
      <Route path="/faq" element={<ShopLayout><FaqPage /></ShopLayout>} />
      <Route path="/terms/:type" element={<ShopLayout><TermsPage /></ShopLayout>} />
      <Route path="*" element={<ShopLayout><NotFoundPage /></ShopLayout>} />
    </Routes>
  );
}
