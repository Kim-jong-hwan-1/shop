import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Shield,
  Tag,
  Users,
  BarChart3,
  Menu,
  X,
  ChevronLeft,
} from 'lucide-react';

const menuItems = [
  { path: '/admin', icon: LayoutDashboard, label: '대시보드', exact: true },
  { path: '/admin/products', icon: Package, label: '상품 관리' },
  { path: '/admin/orders', icon: ShoppingCart, label: '주문 관리' },
  { path: '/admin/ddcare', icon: Shield, label: '든든케어 심사' },
  { path: '/admin/categories', icon: Tag, label: '카테고리' },
  { path: '/admin/customers', icon: Users, label: '고객 목록' },
  { path: '/admin/stats', icon: BarChart3, label: '매출 통계' },
];

export default function AdminLayout({ children }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 모바일 사이드바 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-gray-900 text-white z-50 transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <Link to="/admin" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg">관리자</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-gray-700 rounded"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.path, item.exact)
                  ? 'bg-red-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
            <span>쇼핑몰로 돌아가기</span>
          </Link>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <div className="lg:ml-64">
        {/* 상단 헤더 (모바일) */}
        <header className="lg:hidden bg-white shadow-sm p-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu size={24} />
          </button>
          <span className="font-semibold text-gray-900">관리자 페이지</span>
        </header>

        {/* 페이지 콘텐츠 */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
