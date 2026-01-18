import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Search, ShoppingCart, User, Heart, LogOut } from 'lucide-react';
import { useAuthStore } from '@/context/authStore';
import { useCartStore } from '@/context/cartStore';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const { isAuthenticated, user, logout, isAdmin, isSeller } = useAuthStore();
  const cartItems = useCartStore((state) => state.items);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const categories = [
    { name: '칫솔', slug: 'toothbrush' },
    { name: '치약', slug: 'toothpaste' },
    { name: '치실/치간칫솔', slug: 'floss' },
    { name: '구강청결제', slug: 'mouthwash' },
    { name: '전동칫솔', slug: 'electric-toothbrush' },
    { name: '어린이용', slug: 'kids' },
  ];

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      {/* 상단 바 */}
      <div className="bg-primary-600 text-white text-sm py-1.5">
        <div className="container-custom flex justify-end items-center">
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span>{user?.name}님</span>
                {isSeller() && (
                  <Link to="/seller" className="hover:underline">판매자센터</Link>
                )}
                {isAdmin() && (
                  <Link to="/admin" className="hover:underline">관리자</Link>
                )}
                <button onClick={handleLogout} className="hover:underline">로그아웃</button>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:underline">로그인</Link>
                <Link to="/register" className="hover:underline">회원가입</Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 메인 헤더 */}
      <div className="container-custom py-4">
        <div className="flex items-center justify-between gap-4">
          {/* 로고 */}
          <Link to="/" className="flex-shrink-0">
            <h1 className="text-5xl text-primary-600" style={{ fontFamily: 'Cute Font, sans-serif' }}>DLAS 케어 샵</h1>
          </Link>

          {/* 검색바 (데스크톱) */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="검색어를 입력하세요"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pr-10"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600"
              >
                <Search size={20} />
              </button>
            </div>
          </form>

          {/* 아이콘 버튼들 */}
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <Link
                to="/mypage/wishlist"
                className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg"
              >
                <Heart size={24} />
              </Link>
            )}
            <Link
              to="/cart"
              className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg relative"
            >
              <ShoppingCart size={24} />
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center">
                  {cartItems.length}
                </span>
              )}
            </Link>
            {isAuthenticated && (
              <Link
                to="/mypage"
                className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg"
              >
                <User size={24} />
              </Link>
            )}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* 검색바 (모바일) */}
        <form onSubmit={handleSearch} className="md:hidden mt-3">
          <div className="relative">
            <input
              type="text"
              placeholder="검색어를 입력하세요"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pr-10"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600"
            >
              <Search size={20} />
            </button>
          </div>
        </form>
      </div>

      {/* 네비게이션 */}
      <nav className="border-t border-gray-100 hidden md:block">
        <div className="container-custom">
          <ul className="flex items-center gap-1">
            <li>
              <Link
                to="/products"
                className="block px-4 py-3 text-gray-700 hover:text-primary-600 font-medium"
              >
                전체상품
              </Link>
            </li>
            {categories.map((cat) => (
              <li key={cat.slug}>
                <Link
                  to={`/products?category=${cat.slug}`}
                  className="block px-4 py-3 text-gray-700 hover:text-primary-600"
                >
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* 모바일 메뉴 */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <nav className="container-custom py-4">
            <ul className="space-y-1">
              <li>
                <Link
                  to="/products"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
                >
                  전체상품
                </Link>
              </li>
              {categories.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    to={`/products?category=${cat.slug}`}
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
              {isSeller() && (
                <li className="border-t mt-2 pt-2">
                  <Link
                    to="/seller"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-4 py-2 text-primary-600 hover:bg-gray-100 rounded-lg font-medium"
                  >
                    판매자센터
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
