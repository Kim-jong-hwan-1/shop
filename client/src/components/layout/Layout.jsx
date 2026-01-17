import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { useAuthStore } from '@/context/authStore';
import { useCartStore } from '@/context/cartStore';
import { scrollToTop } from '@/utils/helpers';

export default function Layout({ children }) {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const fetchCart = useCartStore((state) => state.fetchCart);

  // 페이지 이동 시 스크롤 맨 위로
  useEffect(() => {
    scrollToTop();
  }, [location.pathname]);

  // 로그인 상태일 때 장바구니 로드
  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    }
  }, [isAuthenticated, fetchCart]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
