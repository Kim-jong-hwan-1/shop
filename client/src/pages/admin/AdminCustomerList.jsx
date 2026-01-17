import { useState, useEffect } from 'react';
import { Search, Filter, Eye, Shield } from 'lucide-react';
import { adminAPI } from '@/utils/api';
import Loading from '@/components/common/Loading';
import Pagination from '@/components/common/Pagination';

export default function AdminCustomerList() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [search, setSearch] = useState('');
  const [ddcareOnly, setDdcareOnly] = useState(false);
  const [detailModal, setDetailModal] = useState({ open: false, customer: null });

  useEffect(() => {
    fetchCustomers();
  }, [pagination.page, ddcareOnly]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getUsers({
        page: pagination.page,
        limit: 20,
        role: 'customer',
        search: search || undefined,
        ddcare: ddcareOnly || undefined,
      });
      setCustomers(response.data.users || []);
      setPagination(response.data.pagination || { page: 1, total: 0, pages: 1 });
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination({ ...pagination, page: 1 });
    fetchCustomers();
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('ko-KR');
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ko-KR').format(price || 0);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">고객 목록</h1>

      {/* 필터 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 flex gap-2 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="이름, 이메일 검색"
                className="input pl-10 w-full"
              />
            </div>
            <button type="submit" className="btn btn-primary">검색</button>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={ddcareOnly}
              onChange={(e) => {
                setDdcareOnly(e.target.checked);
                setPagination({ ...pagination, page: 1 });
              }}
              className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <Shield size={18} className="text-green-600" />
            <span className="text-sm text-gray-700">든든케어 회원만</span>
          </label>
        </form>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">이름</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">이메일</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">가입일</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">주문 수</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">총 구매액</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">든든케어</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">상세</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{customer.name}</td>
                    <td className="py-3 px-4 text-gray-600">{customer.email}</td>
                    <td className="py-3 px-4 text-center text-sm text-gray-500">
                      {formatDate(customer.created_at)}
                    </td>
                    <td className="py-3 px-4 text-center">{customer.order_count || 0}건</td>
                    <td className="py-3 px-4 text-right font-medium">
                      {formatPrice(customer.total_spent || 0)}원
                    </td>
                    <td className="py-3 px-4 text-center">
                      {customer.ddcare_status === 'approved' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                          <Shield size={12} />
                          승인
                        </span>
                      ) : customer.ddcare_status === 'pending' ? (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                          심사중
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setDetailModal({ open: true, customer })}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {customers.length === 0 && (
            <div className="text-center py-12 text-gray-500">고객이 없습니다.</div>
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

      {/* 고객 상세 모달 */}
      {detailModal.open && detailModal.customer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 mb-4">고객 정보</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">이름</p>
                  <p className="font-medium">{detailModal.customer.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">연락처</p>
                  <p>{detailModal.customer.phone || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">이메일</p>
                  <p>{detailModal.customer.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">가입일</p>
                  <p>{formatDate(detailModal.customer.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">포인트</p>
                  <p>{formatPrice(detailModal.customer.points || 0)}P</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-sm text-gray-500">주문 수</p>
                    <p className="text-xl font-bold">{detailModal.customer.order_count || 0}건</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-sm text-gray-500">총 구매액</p>
                    <p className="text-xl font-bold">{formatPrice(detailModal.customer.total_spent || 0)}원</p>
                  </div>
                </div>
              </div>

              {detailModal.customer.ddcare_status === 'approved' && (
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 text-green-700">
                    <Shield size={18} />
                    <span className="font-medium">든든케어 승인 회원</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setDetailModal({ open: false, customer: null })}
                className="btn btn-secondary"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
