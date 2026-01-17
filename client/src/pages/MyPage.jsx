import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Package, Heart, MessageSquare, Star, User, CreditCard, Gift, ChevronRight, Shield } from 'lucide-react';
import { orderAPI, wishlistAPI, reviewAPI, userAPI, ddcareAPI } from '@/utils/api';
import { useAuthStore } from '@/context/authStore';
import { formatPrice, getOrderStatusText, getDdcareStatusText, getDdcareStatusColor } from '@/utils/helpers';

export default function MyPage() {
  const user = useAuthStore((state) => state.user);
  const isDdcareMember = useAuthStore((state) => state.isDdcareMember);

  // 최근 주문
  const { data: ordersData } = useQuery({
    queryKey: ['my-orders', { limit: 3 }],
    queryFn: () => orderAPI.getList({ limit: 3 }),
  });

  // 위시리스트 수
  const { data: wishlistData } = useQuery({
    queryKey: ['my-wishlist-count'],
    queryFn: () => wishlistAPI.getList({ limit: 1 }),
  });

  // 작성 가능한 리뷰
  const { data: reviewsData } = useQuery({
    queryKey: ['writable-reviews'],
    queryFn: reviewAPI.getWritable,
  });

  // 든든케어 상태
  const { data: ddcareData } = useQuery({
    queryKey: ['ddcare-status'],
    queryFn: ddcareAPI.getStatus,
  });

  const ddcareStatus = ddcareData?.data?.status;

  const menuItems = [
    {
      icon: Shield,
      title: '든든케어',
      description: '취약계층 30% 추가 할인',
      href: '/mypage/ddcare',
      badge: isDdcareMember() ? '적용 중' : ddcareStatus === 'pending' ? '심사 중' : null,
      badgeColor: isDdcareMember() ? 'badge-success' : ddcareStatus === 'pending' ? 'badge-warning' : null,
      highlight: true,
    },
    {
      icon: Package,
      title: '주문/배송',
      description: '주문 내역 및 배송 조회',
      href: '/mypage/orders',
      count: ordersData?.data?.pagination?.total,
    },
    {
      icon: Heart,
      title: '위시리스트',
      description: '찜한 상품 보기',
      href: '/mypage/wishlist',
      count: wishlistData?.data?.pagination?.total,
    },
    {
      icon: Star,
      title: '리뷰 관리',
      description: '리뷰 작성 및 관리',
      href: '/mypage/reviews',
      count: reviewsData?.data?.items?.length,
      badge: reviewsData?.data?.items?.length > 0 ? '작성 가능' : null,
    },
    {
      icon: MessageSquare,
      title: '1:1 문의',
      description: '문의 내역 확인',
      href: '/mypage/inquiries',
    },
    {
      icon: User,
      title: '회원 정보',
      description: '개인정보 수정',
      href: '/mypage/profile',
    },
    {
      icon: CreditCard,
      title: '포인트',
      description: '포인트 내역 확인',
      href: '/mypage/points',
      count: user?.point,
      suffix: 'P',
    },
    {
      icon: Gift,
      title: '쿠폰',
      description: '보유 쿠폰 확인',
      href: '/mypage/coupons',
    },
  ];

  return (
    <div className="py-8">
      <div className="container-custom">
        <h1 className="text-2xl font-bold mb-6">마이페이지</h1>

        {/* 사용자 정보 카드 */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{user?.name}님</h2>
              <p className="text-gray-500">{user?.email}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">보유 포인트</p>
              <p className="text-2xl font-bold text-primary-600">{formatPrice(user?.point || 0)}P</p>
            </div>
          </div>
        </div>

        {/* 메뉴 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`card p-4 hover:shadow-md transition flex items-center gap-4 ${
                item.highlight ? 'border-primary-300 bg-primary-50' : ''
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                item.highlight ? 'bg-primary-600 text-white' : 'bg-primary-100 text-primary-600'
              }`}>
                <item.icon size={24} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{item.title}</h3>
                  {item.badge && (
                    <span className={`badge ${item.badgeColor || 'badge-primary'}`}>{item.badge}</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
              {item.count !== undefined && (
                <span className="text-lg font-bold text-primary-600">
                  {formatPrice(item.count)}{item.suffix || ''}
                </span>
              )}
              <ChevronRight size={20} className="text-gray-400" />
            </Link>
          ))}
        </div>

        {/* 최근 주문 */}
        {ordersData?.data?.data?.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">최근 주문</h2>
              <Link to="/mypage/orders" className="text-sm text-primary-600 hover:underline">
                전체보기
              </Link>
            </div>
            <div className="space-y-4">
              {ordersData.data.data.map((order) => (
                <Link
                  key={order.id}
                  to={`/mypage/orders/${order.order_number}`}
                  className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {order.first_item_name}
                        {order.item_count > 1 && ` 외 ${order.item_count - 1}건`}
                      </p>
                      <p className="text-sm text-gray-500">{order.order_number}</p>
                    </div>
                    <div className="text-right">
                      <span className={`badge ${order.status === 'completed' ? 'badge-success' : 'badge-primary'}`}>
                        {getOrderStatusText(order.status)}
                      </span>
                      <p className="text-sm font-bold mt-1">{formatPrice(order.total_amount)}원</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
