import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Package, ShoppingCart } from 'lucide-react';
import { adminAPI } from '@/utils/api';
import Loading from '@/components/common/Loading';

export default function AdminStats() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('daily');
  const [days, setDays] = useState(30);
  const [salesData, setSalesData] = useState([]);
  const [summary, setSummary] = useState({});
  const [topProducts, setTopProducts] = useState([]);

  useEffect(() => {
    fetchStats();
  }, [period, days]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [salesRes, summaryRes, productsRes] = await Promise.all([
        adminAPI.getSalesStats({ period, days }),
        adminAPI.getDashboard(),
        adminAPI.getTopProducts({ limit: 10 }),
      ]);

      setSalesData(salesRes.data?.stats || []);
      setSummary(summaryRes.data?.stats || {});
      setTopProducts(productsRes.data?.products || []);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ko-KR').format(price || 0);
  };

  const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (period === 'monthly') {
      return `${date.getMonth() + 1}월`;
    }
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 최대값 계산 (차트용)
  const maxSales = Math.max(...salesData.map((d) => d.total_sales || 0), 1);

  if (loading) return <Loading />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">매출 통계</h1>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">총 매출</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatPrice(summary.totalSales || 0)}원
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">총 주문</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatPrice(summary.totalOrders || 0)}건
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">총 상품</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatPrice(summary.totalProducts || 0)}개
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 기간 필터 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">기간:</span>
          </div>
          <div className="flex gap-2">
            {[
              { value: 'daily', label: '일별' },
              { value: 'weekly', label: '주별' },
              { value: 'monthly', label: '월별' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === opt.value
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 ml-4">
            {[
              { value: 7, label: '7일' },
              { value: 30, label: '30일' },
              { value: 90, label: '90일' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  days === opt.value
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 매출 차트 (간단한 바 차트) */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">매출 추이</h3>
          <div className="space-y-3">
            {salesData.slice(0, 10).map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-sm text-gray-500 w-16">{formatDate(item.date)}</span>
                <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all"
                    style={{ width: `${((item.total_sales || 0) / maxSales) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-24 text-right">
                  {formatPrice(item.total_sales || 0)}원
                </span>
              </div>
            ))}
          </div>
          {salesData.length === 0 && (
            <div className="text-center py-8 text-gray-500">데이터가 없습니다.</div>
          )}
        </div>

        {/* 인기 상품 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">인기 상품 TOP 10</h3>
          <div className="space-y-3">
            {topProducts.map((product, index) => (
              <div key={product.id} className="flex items-center gap-3">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    index < 3 ? 'bg-red-500' : 'bg-gray-400'
                  }`}
                >
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{product.name}</p>
                  <p className="text-xs text-gray-500">
                    판매: {product.sales_count || 0}건
                  </p>
                </div>
                <span className="text-sm font-medium">
                  {formatPrice(product.total_sales || 0)}원
                </span>
              </div>
            ))}
          </div>
          {topProducts.length === 0 && (
            <div className="text-center py-8 text-gray-500">데이터가 없습니다.</div>
          )}
        </div>
      </div>

      {/* 상세 테이블 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">상세 데이터</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">날짜</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">주문 수</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">총 매출</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">평균 주문액</th>
              </tr>
            </thead>
            <tbody>
              {salesData.map((item, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">{formatDate(item.date)}</td>
                  <td className="py-3 px-4 text-right">{item.order_count || 0}건</td>
                  <td className="py-3 px-4 text-right font-medium">
                    {formatPrice(item.total_sales || 0)}원
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600">
                    {formatPrice(
                      item.order_count > 0 ? Math.round((item.total_sales || 0) / item.order_count) : 0
                    )}원
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {salesData.length === 0 && (
          <div className="text-center py-12 text-gray-500">데이터가 없습니다.</div>
        )}
      </div>
    </div>
  );
}
