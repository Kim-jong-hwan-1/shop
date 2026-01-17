import { useState, useEffect } from 'react';
import { Check, X, Eye, FileText, Filter, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '@/utils/api';
import Loading from '@/components/common/Loading';
import Pagination from '@/components/common/Pagination';

export default function AdminDdcareList() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [status, setStatus] = useState('');
  const [detailModal, setDetailModal] = useState({ open: false, application: null });
  const [rejectModal, setRejectModal] = useState({ open: false, id: null });
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchApplications();
  }, [pagination.page, status]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getDdcareApplications({
        page: pagination.page,
        limit: 20,
        status: status || undefined,
      });
      setApplications(response.data.applications || []);
      setPagination(response.data.pagination || { page: 1, total: 0, pages: 1 });
    } catch (error) {
      console.error('Failed to fetch applications:', error);
      toast.error('신청 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!confirm('이 신청을 승인하시겠습니까?\n해당 회원에게 30% 할인 혜택이 적용됩니다.')) return;

    try {
      await adminAPI.approveDdcare(id);
      toast.success('든든케어 신청이 승인되었습니다.');
      fetchApplications();
    } catch (error) {
      toast.error('승인에 실패했습니다.');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('반려 사유를 입력해주세요.');
      return;
    }

    try {
      await adminAPI.rejectDdcare(rejectModal.id, { reason: rejectReason });
      toast.success('든든케어 신청이 반려되었습니다.');
      setRejectModal({ open: false, id: null });
      setRejectReason('');
      fetchApplications();
    } catch (error) {
      toast.error('반려에 실패했습니다.');
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ko-KR');
  };

  const statusOptions = [
    { value: '', label: '전체' },
    { value: 'pending', label: '심사대기' },
    { value: 'approved', label: '승인' },
    { value: 'rejected', label: '반려' },
  ];

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: '심사대기', className: 'bg-yellow-100 text-yellow-800' },
      approved: { label: '승인', className: 'bg-green-100 text-green-800' },
      rejected: { label: '반려', className: 'bg-red-100 text-red-800' },
      expired: { label: '만료', className: 'bg-gray-100 text-gray-800' },
    };
    const info = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${info.className}`}>
        {info.label}
      </span>
    );
  };

  const getTypeName = (type) => {
    const typeMap = {
      basic_livelihood: '기초생활수급자',
      near_poverty: '차상위계층',
      single_parent: '한부모가정',
      disabled: '장애인',
      veteran: '국가유공자',
      multicultural: '다문화가정',
    };
    return typeMap[type] || type;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">든든케어 심사</h1>

      {/* 안내 */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Shield className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-green-800">든든케어 프로그램</h3>
          <p className="text-sm text-green-700 mt-1">
            취약계층 고객에게 구강관리 용품 30% 할인 혜택을 제공하는 프로그램입니다.
            증빙서류를 확인 후 승인해주세요.
          </p>
        </div>
      </div>

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
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">신청자</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">유형</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">증빙서류</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">신청일</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">상태</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">관리</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-medium">{app.user_name}</p>
                      <p className="text-sm text-gray-500">{app.user_email}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">
                        {getTypeName(app.ddcare_type)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {app.document_url ? (
                        <a
                          href={app.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                        >
                          <FileText size={16} />
                          <span className="text-sm">보기</span>
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">없음</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center text-sm text-gray-500">
                      {formatDate(app.created_at)}
                    </td>
                    <td className="py-3 px-4 text-center">{getStatusBadge(app.status)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        {app.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(app.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                              title="승인"
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={() => setRejectModal({ open: true, id: app.id })}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="반려"
                            >
                              <X size={18} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setDetailModal({ open: true, application: app })}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                          title="상세"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {applications.length === 0 && (
            <div className="text-center py-12 text-gray-500">신청 내역이 없습니다.</div>
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

      {/* 상세 모달 */}
      {detailModal.open && detailModal.application && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">든든케어 신청 상세</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">신청자</p>
                  <p className="font-medium">{detailModal.application.user_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">상태</p>
                  {getStatusBadge(detailModal.application.status)}
                </div>
                <div>
                  <p className="text-sm text-gray-500">유형</p>
                  <p>{getTypeName(detailModal.application.ddcare_type)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">신청일</p>
                  <p>{formatDate(detailModal.application.created_at)}</p>
                </div>
              </div>

              {detailModal.application.document_url && (
                <div className="pt-4 border-t">
                  <a
                    href={detailModal.application.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary inline-flex items-center gap-2"
                  >
                    <FileText size={18} />
                    증빙서류 보기
                  </a>
                </div>
              )}

              {detailModal.application.reject_reason && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-500 mb-1">반려 사유</p>
                  <p className="text-red-600">{detailModal.application.reject_reason}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              {detailModal.application.status === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      handleApprove(detailModal.application.id);
                      setDetailModal({ open: false, application: null });
                    }}
                    className="btn btn-primary"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => {
                      setDetailModal({ open: false, application: null });
                      setRejectModal({ open: true, id: detailModal.application.id });
                    }}
                    className="btn bg-red-600 text-white hover:bg-red-700"
                  >
                    반려
                  </button>
                </>
              )}
              <button
                onClick={() => setDetailModal({ open: false, application: null })}
                className="btn btn-secondary"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 반려 모달 */}
      {rejectModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 mb-4">든든케어 신청 반려</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                반려 사유
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="input w-full"
                rows={3}
                placeholder="반려 사유를 입력하세요"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRejectModal({ open: false, id: null });
                  setRejectReason('');
                }}
                className="btn btn-secondary flex-1"
              >
                취소
              </button>
              <button
                onClick={handleReject}
                className="btn bg-red-600 text-white hover:bg-red-700 flex-1"
              >
                반려
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
