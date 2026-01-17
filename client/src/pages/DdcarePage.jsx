import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Upload, CheckCircle, Clock, XCircle, AlertCircle, FileText } from 'lucide-react';
import { ddcareAPI } from '@/utils/api';
import { useAuthStore } from '@/context/authStore';
import { formatDate, getDdcareStatusText, getDdcareStatusColor, getDdcareTypeName } from '@/utils/helpers';
import { PageLoading } from '@/components/common/Loading';
import toast from 'react-hot-toast';

const DDCARE_TYPES = {
  BASIC_LIVELIHOOD: '기초생활수급자',
  SECOND_CLASS: '차상위계층',
  SINGLE_PARENT: '한부모가정',
  DISABLED: '장애인',
  NATIONAL_MERIT: '국가유공자',
  MULTICULTURAL: '다문화가정'
};

export default function DdcarePage() {
  const queryClient = useQueryClient();
  const updateDdcareStatus = useAuthStore((state) => state.updateDdcareStatus);

  const [selectedType, setSelectedType] = useState('');
  const [document, setDocument] = useState(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  // 든든케어 상태 조회
  const { data: statusData, isLoading } = useQuery({
    queryKey: ['ddcare-status'],
    queryFn: ddcareAPI.getStatus,
  });

  // 신청 내역 조회
  const { data: applicationsData } = useQuery({
    queryKey: ['ddcare-applications'],
    queryFn: ddcareAPI.getApplications,
  });

  // 신청 mutation
  const applyMutation = useMutation({
    mutationFn: ddcareAPI.apply,
    onSuccess: () => {
      toast.success('든든케어 신청이 완료되었습니다.');
      queryClient.invalidateQueries(['ddcare-status']);
      queryClient.invalidateQueries(['ddcare-applications']);
      updateDdcareStatus('pending');
      setShowApplicationForm(false);
      setSelectedType('');
      setDocument(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || '신청 중 오류가 발생했습니다.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedType) {
      toast.error('인증 유형을 선택해주세요.');
      return;
    }

    if (!document) {
      toast.error('증빙서류를 첨부해주세요.');
      return;
    }

    applyMutation.mutate({
      ddcareType: selectedType,
      document,
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 파일 크기 체크 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('파일 크기는 10MB를 초과할 수 없습니다.');
        return;
      }

      // 파일 형식 체크
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('jpg, png, gif, webp, pdf 파일만 업로드 가능합니다.');
        return;
      }

      setDocument(file);
    }
  };

  if (isLoading) return <PageLoading />;

  const status = statusData?.data?.status;
  const applications = applicationsData?.data?.applications || [];
  const canApply = !status || status === 'rejected' || status === 'expired';

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="text-green-500" size={24} />;
      case 'pending':
        return <Clock className="text-yellow-500" size={24} />;
      case 'rejected':
        return <XCircle className="text-red-500" size={24} />;
      case 'expired':
        return <AlertCircle className="text-gray-500" size={24} />;
      default:
        return <Shield className="text-gray-400" size={24} />;
    }
  };

  return (
    <div className="py-8">
      <div className="container-custom max-w-3xl">
        <h1 className="text-2xl font-bold mb-6">든든케어 회원</h1>

        {/* 안내 카드 */}
        <div className="card p-6 mb-6 bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
              <Shield size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary-900 mb-2">든든케어란?</h2>
              <p className="text-primary-700 text-sm mb-3">
                취약계층 고객님을 위한 특별 할인 프로그램입니다.
                든든케어 회원으로 인증되시면 <strong>모든 상품 30% 추가 할인</strong> 혜택을 받으실 수 있습니다.
              </p>
              <div className="text-xs text-primary-600">
                <p className="font-medium mb-1">인증 대상</p>
                <p>기초생활수급자, 차상위계층, 한부모가정, 장애인, 국가유공자, 다문화가정</p>
              </div>
            </div>
          </div>
        </div>

        {/* 현재 상태 */}
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">나의 든든케어 상태</h2>

          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            {getStatusIcon(status)}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`badge ${getDdcareStatusColor(status)}`}>
                  {getDdcareStatusText(status)}
                </span>
                {status === 'approved' && statusData?.data?.type && (
                  <span className="text-sm text-gray-600">
                    ({getDdcareTypeName(statusData.data.type)})
                  </span>
                )}
              </div>
              {status === 'approved' && statusData?.data?.expiresAt && (
                <p className="text-sm text-gray-500 mt-1">
                  유효기간: {formatDate(statusData.data.expiresAt, 'YYYY.MM.DD')}까지
                </p>
              )}
              {status === 'pending' && statusData?.data?.pendingApplication && (
                <p className="text-sm text-gray-500 mt-1">
                  신청일: {formatDate(statusData.data.pendingApplication.created_at, 'YYYY.MM.DD')}
                </p>
              )}
            </div>
            {status === 'approved' && (
              <div className="text-right">
                <p className="text-3xl font-bold text-primary-600">30%</p>
                <p className="text-xs text-gray-500">추가 할인</p>
              </div>
            )}
          </div>

          {/* 신청 버튼 */}
          {canApply && !showApplicationForm && (
            <button
              onClick={() => setShowApplicationForm(true)}
              className="btn btn-primary w-full mt-4"
            >
              든든케어 신청하기
            </button>
          )}
        </div>

        {/* 신청 폼 */}
        {showApplicationForm && (
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">든든케어 신청</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 인증 유형 선택 */}
              <div>
                <label className="label">인증 유형 <span className="text-red-500">*</span></label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">선택해주세요</option>
                  {Object.entries(DDCARE_TYPES).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
              </div>

              {/* 증빙서류 업로드 */}
              <div>
                <label className="label">증빙서류 <span className="text-red-500">*</span></label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition cursor-pointer">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="document-upload"
                  />
                  <label htmlFor="document-upload" className="cursor-pointer">
                    {document ? (
                      <div className="flex items-center justify-center gap-2 text-primary-600">
                        <FileText size={24} />
                        <span>{document.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">클릭하여 파일 선택</p>
                        <p className="text-xs text-gray-400 mt-1">jpg, png, gif, webp, pdf (최대 10MB)</p>
                      </>
                    )}
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  * 수급자증명서, 한부모가족증명서, 장애인등록증, 국가유공자증 등 관련 증빙서류를 첨부해주세요.
                </p>
              </div>

              {/* 안내사항 */}
              <div className="bg-gray-50 rounded-lg p-4 text-sm">
                <p className="font-medium mb-2">신청 안내</p>
                <ul className="text-gray-600 space-y-1 text-xs">
                  <li>- 신청 후 영업일 기준 1~3일 내에 검토가 완료됩니다.</li>
                  <li>- 승인 시 1년간 든든케어 혜택을 받으실 수 있습니다.</li>
                  <li>- 허위 서류 제출 시 회원 자격이 박탈될 수 있습니다.</li>
                </ul>
              </div>

              {/* 버튼 */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowApplicationForm(false);
                    setSelectedType('');
                    setDocument(null);
                  }}
                  className="btn btn-secondary flex-1"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={applyMutation.isPending}
                  className="btn btn-primary flex-1"
                >
                  {applyMutation.isPending ? '신청 중...' : '신청하기'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 신청 내역 */}
        {applications.length > 0 && (
          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4">신청 내역</h2>

            <div className="space-y-3">
              {applications.map((app) => (
                <div key={app.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`badge ${getDdcareStatusColor(app.status)}`}>
                          {getDdcareStatusText(app.status)}
                        </span>
                        <span className="text-sm text-gray-600">
                          {getDdcareTypeName(app.ddcare_type)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        신청일: {formatDate(app.created_at, 'YYYY.MM.DD HH:mm')}
                      </p>
                      {app.reviewed_at && (
                        <p className="text-xs text-gray-500">
                          처리일: {formatDate(app.reviewed_at, 'YYYY.MM.DD HH:mm')}
                        </p>
                      )}
                    </div>
                  </div>
                  {app.admin_memo && app.status === 'rejected' && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-600">
                      거절 사유: {app.admin_memo}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
