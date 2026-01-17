import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/context/authStore';
import Layout from '@/components/layout/Layout';

// 사이트 잠금 비밀번호
const SITE_PASSWORD = '131415';

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

// 비밀번호 잠금 화면
function PasswordLock({ onUnlock }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === SITE_PASSWORD) {
      localStorage.setItem('site_unlocked', 'true');
      onUnlock();
    } else {
      setError('비밀번호가 올바르지 않습니다.');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">
          사이트 접근 제한
        </h1>
        <p className="text-gray-600 text-center mb-6">
          비밀번호를 입력해주세요.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 입력"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none mb-4"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <button
            type="submit"
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition"
          >
            확인
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    const unlocked = localStorage.getItem('site_unlocked');
    if (unlocked === 'true') {
      setIsUnlocked(true);
    }
  }, []);

  if (!isUnlocked) {
    return <PasswordLock onUnlock={() => setIsUnlocked(true)} />;
  }

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
