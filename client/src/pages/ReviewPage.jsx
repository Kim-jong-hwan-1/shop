import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Pencil } from 'lucide-react';
import { reviewAPI } from '@/utils/api';
import { formatDate, getImageUrl } from '@/utils/helpers';
import { PageLoading } from '@/components/common/Loading';
import toast from 'react-hot-toast';

export default function ReviewPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('writable');
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', content: '', image: null });

  const { data: writableData, isLoading: isWritableLoading } = useQuery({
    queryKey: ['writable-reviews'],
    queryFn: reviewAPI.getWritable,
    enabled: activeTab === 'writable',
  });

  const { data: myReviewsData, isLoading: isMyReviewsLoading } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: () => reviewAPI.getMyReviews({ limit: 100 }),
    enabled: activeTab === 'written',
  });

  const createMutation = useMutation({
    mutationFn: reviewAPI.create,
    onSuccess: () => {
      toast.success('리뷰가 등록되었습니다. 100P가 적립되었습니다!');
      queryClient.invalidateQueries(['writable-reviews']);
      queryClient.invalidateQueries(['my-reviews']);
      setShowModal(false);
      setReviewForm({ rating: 5, title: '', content: '', image: null });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || '리뷰 등록에 실패했습니다.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: reviewAPI.delete,
    onSuccess: () => {
      toast.success('리뷰가 삭제되었습니다.');
      queryClient.invalidateQueries(['my-reviews']);
    },
  });

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (reviewForm.content.length < 10) {
      toast.error('리뷰는 10자 이상 입력해주세요.');
      return;
    }
    createMutation.mutate({
      productId: selectedItem.product_id,
      orderId: selectedItem.order_id,
      ...reviewForm,
    });
  };

  const writableItems = writableData?.data?.items || [];
  const myReviews = myReviewsData?.data?.data || [];

  const renderStars = (rating, interactive = false) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type={interactive ? 'button' : undefined}
          onClick={interactive ? () => setReviewForm({ ...reviewForm, rating: i }) : undefined}
          className={interactive ? 'cursor-pointer' : ''}
        >
          <Star
            size={interactive ? 28 : 16}
            className={i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
          />
        </button>
      ))}
    </div>
  );

  return (
    <div className="py-8">
      <div className="container-custom">
        <h1 className="text-2xl font-bold mb-6">리뷰 관리</h1>

        {/* 탭 */}
        <div className="flex border-b mb-6">
          <button
            onClick={() => setActiveTab('writable')}
            className={`px-4 py-3 font-medium border-b-2 -mb-px ${
              activeTab === 'writable' ? 'text-primary-600 border-primary-600' : 'border-transparent'
            }`}
          >
            작성 가능한 리뷰 ({writableItems.length})
          </button>
          <button
            onClick={() => setActiveTab('written')}
            className={`px-4 py-3 font-medium border-b-2 -mb-px ${
              activeTab === 'written' ? 'text-primary-600 border-primary-600' : 'border-transparent'
            }`}
          >
            작성한 리뷰 ({myReviews.length})
          </button>
        </div>

        {/* 작성 가능한 리뷰 */}
        {activeTab === 'writable' && (
          isWritableLoading ? <PageLoading /> : writableItems.length > 0 ? (
            <div className="space-y-4">
              {writableItems.map((item) => (
                <div key={`${item.order_id}-${item.product_id}`} className="card p-4 flex gap-4 items-center">
                  <img
                    src={getImageUrl(item.product_image)}
                    alt={item.product_name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-sm text-gray-500">{formatDate(item.order_date)}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedItem(item);
                      setShowModal(true);
                    }}
                    className="btn btn-primary btn-sm"
                  >
                    <Pencil size={16} className="mr-1" />
                    리뷰 작성
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-16 text-gray-500">작성 가능한 리뷰가 없습니다.</p>
          )
        )}

        {/* 작성한 리뷰 */}
        {activeTab === 'written' && (
          isMyReviewsLoading ? <PageLoading /> : myReviews.length > 0 ? (
            <div className="space-y-4">
              {myReviews.map((review) => (
                <div key={review.id} className="card p-4">
                  <div className="flex gap-4">
                    <img
                      src={getImageUrl(review.product_image)}
                      alt={review.product_name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium mb-1">{review.product_name}</p>
                      {renderStars(review.rating)}
                      <p className="text-sm text-gray-500 mt-1">{formatDate(review.created_at)}</p>
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm('리뷰를 삭제하시겠습니까?')) {
                          deleteMutation.mutate(review.id);
                        }
                      }}
                      className="text-sm text-red-500 hover:underline"
                    >
                      삭제
                    </button>
                  </div>
                  {review.title && <p className="font-medium mt-3">{review.title}</p>}
                  <p className="text-gray-700 mt-2">{review.content}</p>
                  {review.image_url && (
                    <img
                      src={getImageUrl(review.image_url)}
                      alt="리뷰 이미지"
                      className="w-24 h-24 object-cover rounded mt-3"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-16 text-gray-500">작성한 리뷰가 없습니다.</p>
          )
        )}

        {/* 리뷰 작성 모달 */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
            <div className="relative bg-white rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">리뷰 작성</h2>
              <p className="text-gray-600 mb-4">{selectedItem?.product_name}</p>

              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label className="label">별점</label>
                  {renderStars(reviewForm.rating, true)}
                </div>
                <div>
                  <label className="label">제목 (선택)</label>
                  <input
                    type="text"
                    className="input"
                    value={reviewForm.title}
                    onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                    placeholder="리뷰 제목"
                  />
                </div>
                <div>
                  <label className="label">내용</label>
                  <textarea
                    className="input min-h-[120px]"
                    value={reviewForm.content}
                    onChange={(e) => setReviewForm({ ...reviewForm, content: e.target.value })}
                    placeholder="상품에 대한 솔직한 리뷰를 남겨주세요 (10자 이상)"
                    required
                  />
                </div>
                <div>
                  <label className="label">사진 첨부 (선택)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setReviewForm({ ...reviewForm, image: e.target.files[0] })}
                    className="input"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">
                    취소
                  </button>
                  <button type="submit" disabled={createMutation.isPending} className="btn btn-primary flex-1">
                    {createMutation.isPending ? '등록 중...' : '리뷰 등록'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
