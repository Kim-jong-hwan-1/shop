import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Plus } from 'lucide-react';
import { inquiryAPI } from '@/utils/api';
import { formatDate } from '@/utils/helpers';
import { PageLoading } from '@/components/common/Loading';
import toast from 'react-hot-toast';

export default function InquiryPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [form, setForm] = useState({ category: '', title: '', content: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['inquiries'],
    queryFn: () => inquiryAPI.getList({ limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: inquiryAPI.create,
    onSuccess: () => {
      toast.success('문의가 등록되었습니다.');
      queryClient.invalidateQueries(['inquiries']);
      setShowModal(false);
      setForm({ category: '', title: '', content: '' });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || '문의 등록에 실패했습니다.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: inquiryAPI.delete,
    onSuccess: () => {
      toast.success('문의가 삭제되었습니다.');
      queryClient.invalidateQueries(['inquiries']);
      setSelectedInquiry(null);
    },
  });

  const inquiries = data?.data?.data || [];
  const categories = ['상품 문의', '배송 문의', '교환/반품', '결제 문의', '기타'];

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  if (isLoading) return <PageLoading />;

  return (
    <div className="py-8">
      <div className="container-custom">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">1:1 문의</h1>
          <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm">
            <Plus size={18} className="mr-1" /> 문의하기
          </button>
        </div>

        {inquiries.length > 0 ? (
          <div className="space-y-4">
            {inquiries.map((inquiry) => (
              <div
                key={inquiry.id}
                onClick={() => setSelectedInquiry(inquiry)}
                className="card p-4 cursor-pointer hover:shadow-md transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="badge badge-gray mr-2">{inquiry.category}</span>
                    <span className={`badge ${inquiry.has_reply ? 'badge-success' : 'badge-warning'}`}>
                      {inquiry.has_reply ? '답변 완료' : '답변 대기'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">{formatDate(inquiry.created_at)}</span>
                </div>
                <p className="font-medium mt-2">{inquiry.title}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <MessageSquare size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">문의 내역이 없습니다.</p>
          </div>
        )}

        {/* 문의 작성 모달 */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
            <div className="relative bg-white rounded-xl p-6 w-full max-w-lg mx-4">
              <h2 className="text-xl font-bold mb-4">문의하기</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">문의 유형</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="">선택해주세요</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">제목</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">내용</label>
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    className="input min-h-[120px]"
                    required
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">
                    취소
                  </button>
                  <button type="submit" disabled={createMutation.isPending} className="btn btn-primary flex-1">
                    {createMutation.isPending ? '등록 중...' : '등록'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 문의 상세 모달 */}
        {selectedInquiry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedInquiry(null)} />
            <div className="relative bg-white rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">문의 상세</h2>
                {!selectedInquiry.admin_reply && (
                  <button
                    onClick={() => {
                      if (window.confirm('문의를 삭제하시겠습니까?')) {
                        deleteMutation.mutate(selectedInquiry.id);
                      }
                    }}
                    className="text-sm text-red-500 hover:underline"
                  >
                    삭제
                  </button>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <span className="badge badge-gray mr-2">{selectedInquiry.category}</span>
                  <span className="text-sm text-gray-500">{formatDate(selectedInquiry.created_at)}</span>
                </div>
                <h3 className="font-bold">{selectedInquiry.title}</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedInquiry.content}</p>

                {selectedInquiry.admin_reply && (
                  <div className="bg-primary-50 rounded-lg p-4 mt-4">
                    <p className="font-medium text-primary-600 mb-2">답변</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedInquiry.admin_reply}</p>
                    <p className="text-sm text-gray-500 mt-2">{formatDate(selectedInquiry.admin_reply_at)}</p>
                  </div>
                )}
              </div>
              <button onClick={() => setSelectedInquiry(null)} className="btn btn-secondary w-full mt-6">
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
