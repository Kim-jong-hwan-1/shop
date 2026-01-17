import { useState, useEffect } from 'react';
import { Eye, Truck, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '@/utils/api';
import Loading from '@/components/common/Loading';
import Pagination from '@/components/common/Pagination';

export default function AdminOrderList() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [status, setStatus] = useState('');
  const [detailModal, setDetailModal] = useState({ open: false, order: null });
  const [shipModal, setShipModal] = useState({ open: false, orderNumber: null });
  const [trackingNumber, setTrackingNumber] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [pagination.page, status]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getOrders({
        page: pagination.page,
        limit: 20,
        status: status || undefined,
      });
      setOrders(response.data.orders || []);
      setPagination(response.data.pagination || { page: 1, total: 0, pages: 1 });
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('주문 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleShip = async () => {
    if (!trackingNumber.trim()) {
      toast.error('운송장 번호를 입력해주세요.');
      return;
    }

    try {
      await adminAPI.shipOrder(shipModal.orderNumber, { trackingNumber });
      toast.success('배송 처리가 완료되었습니다.');
      setShipModal({ open: false, orderNumber: null });
      setTrackingNumber('');
      fetchOrders();
    } catch (error) {
      toast.error('배송 처리에 실패했습니다.');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ko-KR').format(price || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusOptions = [
    { value: '', label: '전체' },
    { value: 'pending', label: '결제완료' },
    { value: 'preparing', label: '배송준비' },
    { value: 'shipped', label: '배송중' },
    { value: 'delivered', label: '배송완료' },
    { value: 'cancelled', label: '취소' },
  ];

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: '결제완료', className: 'bg-yellow-100 text-yellow-800' },
      preparing: { label: '배송준비', className: 'bg-orange-100 text-orange-800' },
      shipped: { label: '배송중', className: 'bg-blue-100 text-blue-800' },
      delivered: { label: '배송완료', className: 'bg-green-100 text-green-800' },
      cancelled: { label: '취소', className: 'bg-red-100 text-red-800' },
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">주문 관리</h1>

      {/* 필터 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">상태:</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setStatus(opt.value);
                  setPagination({ ...pagination, page: 1 });
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  status === opt.value
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">주문번호</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">구매자</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">금액</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">상태</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">주문일</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">관리</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono text-sm">{order.order_number}</td>
                    <td className="py-3 px-4">
                      <p className="font-medium">{order.buyer_name || order.recipient_name}</p>
                      <p className="text-sm text-gray-500">{order.buyer_email}</p>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {formatPrice(order.total_amount)}원
                    </td>
                    <td className="py-3 px-4 text-center">{getStatusBadge(order.status)}</td>
                    <td className="py-3 px-4 text-center text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setDetailModal({ open: true, order })}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                          title="상세"
                        >
                          <Eye size={18} />
                        </button>
                        {(order.status === 'pending' || order.status === 'preparing') && (
                          <button
                            onClick={() => setShipModal({ open: true, orderNumber: order.order_number })}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="배송처리"
                          >
                            <Truck size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {orders.length === 0 && (
            <div className="text-center py-12 text-gray-500">주문이 없습니다.</div>
          )}

          {pagination.pages > 1 && (
            <div className="p-4 border-t border-gray-200">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.pages}
                onPageChange={(page) => setPagination({ ...pagination, page })}
              />
            </div>
          )}
        </div>
      )}

      {/* 주문 상세 모달 */}
      {detailModal.open && detailModal.order && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">주문 상세</h3>
              <button
                onClick={() => setDetailModal({ open: false, order: null })}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">주문번호</p>
                  <p className="font-mono">{detailModal.order.order_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">상태</p>
                  {getStatusBadge(detailModal.order.status)}
                </div>
                <div>
                  <p className="text-sm text-gray-500">구매자</p>
                  <p>{detailModal.order.buyer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">결제금액</p>
                  <p className="font-semibold">{formatPrice(detailModal.order.total_amount)}원</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500 mb-1">배송지</p>
                <p>{detailModal.order.recipient_name} ({detailModal.order.recipient_phone})</p>
                <p className="text-gray-600">
                  [{detailModal.order.zipcode}] {detailModal.order.address} {detailModal.order.address_detail}
                </p>
              </div>

              {detailModal.order.tracking_number && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-500 mb-1">운송장 번호</p>
                  <p className="font-mono">{detailModal.order.tracking_number}</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setDetailModal({ open: false, order: null })}
                className="btn btn-secondary"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 배송 처리 모달 */}
      {shipModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 mb-4">배송 처리</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                운송장 번호
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="input w-full"
                placeholder="운송장 번호 입력"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShipModal({ open: false, orderNumber: null });
                  setTrackingNumber('');
                }}
                className="btn btn-secondary flex-1"
              >
                취소
              </button>
              <button onClick={handleShip} className="btn btn-primary flex-1">
                배송 처리
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
