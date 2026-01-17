import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Package, ChevronRight } from 'lucide-react';
import { orderAPI } from '@/utils/api';
import { formatPrice, formatDate, getOrderStatusText, getOrderStatusColor, getImageUrl } from '@/utils/helpers';
import Pagination from '@/components/common/Pagination';
import { PageLoading } from '@/components/common/Loading';

export default function OrderListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page')) || 1;
  const status = searchParams.get('status') || '';

  const { data, isLoading } = useQuery({
    queryKey: ['orders', { page, status }],
    queryFn: () => orderAPI.getList({ page, status, limit: 10 }),
  });

  const orders = data?.data?.data || [];
  const pagination = data?.data?.pagination || {};

  const statusFilters = [
    { value: '', label: '전체' },
    { value: 'pending', label: '결제 대기' },
    { value: 'paid', label: '결제 완료' },
    { value: 'shipped', label: '배송중' },
    { value: 'delivered', label: '배송 완료' },
    { value: 'completed', label: '구매 확정' },
    { value: 'cancelled', label: '주문 취소' },
  ];

  if (isLoading) return <PageLoading />;

  return (
    <div className="py-8">
      <div className="container-custom">
        <h1 className="text-2xl font-bold mb-6">주문/배송 조회</h1>

        {/* 상태 필터 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                if (filter.value) {
                  params.set('status', filter.value);
                } else {
                  params.delete('status');
                }
                params.delete('page');
                setSearchParams(params);
              }}
              className={`btn btn-sm whitespace-nowrap ${
                status === filter.value ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* 주문 목록 */}
        {orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                to={`/mypage/orders/${order.order_number}`}
                className="card p-4 md:p-6 block hover:shadow-md transition"
              >
                <div className="flex items-start gap-4">
                  {/* 이미지 */}
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {order.first_item_image ? (
                      <img
                        src={getImageUrl(order.first_item_image)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={32} className="text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge ${getOrderStatusColor(order.status)}`}>
                        {getOrderStatusText(order.status)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDate(order.created_at)}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900 line-clamp-1">
                      {order.first_item_name}
                      {order.item_count > 1 && ` 외 ${order.item_count - 1}건`}
                    </p>
                    <p className="text-sm text-gray-500">{order.order_number}</p>
                  </div>

                  {/* 금액 */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-lg">{formatPrice(order.total_amount)}원</p>
                    {order.tracking_number && (
                      <p className="text-xs text-gray-500 mt-1">
                        운송장: {order.tracking_number}
                      </p>
                    )}
                  </div>

                  <ChevronRight size={20} className="text-gray-400 flex-shrink-0" />
                </div>
              </Link>
            ))}

            {pagination.totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  pagination={pagination}
                  onPageChange={(p) => {
                    const params = new URLSearchParams(searchParams);
                    params.set('page', String(p));
                    setSearchParams(params);
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <Package size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">주문 내역이 없습니다.</p>
            <Link to="/products" className="btn btn-primary mt-4">
              쇼핑하러 가기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
