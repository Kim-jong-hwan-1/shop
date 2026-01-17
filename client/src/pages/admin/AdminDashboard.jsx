import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  Shield,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { adminAPI } from '@/utils/api';
import Loading from '@/components/common/Loading';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [recentOrders, setRecentOrders] = useState([]);
  const [pendingDdcare, setPendingDdcare] = useState(0);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await adminAPI.getDashboard();
      const data = response.data;
      setStats(data.stats || {});
      setRecentOrders(data.recentOrders || []);
      setPendingDdcare(data.pending?.ddcare || 0);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ko-KR').format(price || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('ko-KR');
  };

  if (loading) return <Loading />;

  const statCards = [
    {
      label: '이번 달 매출',
      value: `${formatPrice(stats.monthlySales)}원`,
      icon: TrendingUp,
      color: 'bg-green-500',
      link: '/admin/stats',
    },
    {
      label: '총 주문',
      value: `${formatPrice(stats.totalOrders)}건`,
      icon: ShoppingCart,
      color: 'bg-blue-500',
      link: '/admin/orders',
    },
    {
      label: '등록 상품',
      value: `${formatPrice(stats.totalProducts)}개`,
      icon: Package,
      color: 'bg-orange-500',
      link: '/admin/products',
    },
    {
      label: '전체 회원',
      value: `${formatPrice(stats.totalUsers)}명`,
      icon: Users,
      color: 'bg-purple-500',
      link: '/admin/customers',
    },
  ];

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: '결제완료', className: 'bg-yellow-100 text-yellow-800' },
      shipped: { label: '배송중', className: 'bg-blue-100 text-blue-800' },
      delivered: { label: '배송완료', className: 'bg-green-100 text-green-800' },
    };
    const info = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${info.className}`}>
        {info.label}
      </span>
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">대시보드</h1>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat, index) => (
          <Link
            key={index}
            to={stat.link}
            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 알림 카드 */}
      {pendingDdcare > 0 && (
        <Link
          to="/admin/ddcare"
          className="block bg-green-50 border border-green-200 rounded-xl p-4 mb-6 hover:bg-green-100 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-green-800">든든케어 심사 대기</p>
              <p className="text-sm text-green-700">{pendingDdcare}건의 신청이 심사를 기다리고 있습니다.</p>
            </div>
            <AlertCircle className="w-5 h-5 text-green-600" />
          </div>
        </Link>
      )}

      {/* 최근 주문 */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">최근 주문</h2>
          <Link
            to="/admin/orders"
            className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
          >
            전체 보기 <ArrowRight size={16} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">주문번호</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">구매자</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">금액</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">상태</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">날짜</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.slice(0, 5).map((order) => (
                <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-sm">{order.order_number}</td>
                  <td className="py-3 px-4">{order.buyer_name}</td>
                  <td className="py-3 px-4 text-right font-medium">
                    {formatPrice(order.total_amount)}원
                  </td>
                  <td className="py-3 px-4 text-center">{getStatusBadge(order.status)}</td>
                  <td className="py-3 px-4 text-center text-sm text-gray-500">
                    {formatDate(order.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentOrders.length === 0 && (
            <div className="text-center py-8 text-gray-500">주문이 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}
