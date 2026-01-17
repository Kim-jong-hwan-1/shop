import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Gift, Ticket } from 'lucide-react';
import { userAPI, couponAPI } from '@/utils/api';
import { formatPrice, formatDate } from '@/utils/helpers';
import toast from 'react-hot-toast';

export default function CouponPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('available');
  const [couponCode, setCouponCode] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['user-coupons', activeTab],
    queryFn: () => userAPI.getCoupons(activeTab),
  });

  const registerMutation = useMutation({
    mutationFn: () => couponAPI.register(couponCode),
    onSuccess: (data) => {
      toast.success(`쿠폰이 등록되었습니다: ${data.data.coupon.name}`);
      queryClient.invalidateQueries(['user-coupons']);
      setCouponCode('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || '쿠폰 등록에 실패했습니다.');
    },
  });

  const coupons = data?.data?.coupons || [];

  const handleRegister = (e) => {
    e.preventDefault();
    if (!couponCode.trim()) {
      toast.error('쿠폰 코드를 입력해주세요.');
      return;
    }
    registerMutation.mutate();
  };

  return (
    <div className="py-8">
      <div className="container-custom max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">쿠폰</h1>

        {/* 쿠폰 등록 */}
        <form onSubmit={handleRegister} className="card p-4 mb-6">
          <label className="label">쿠폰 코드 등록</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="쿠폰 코드를 입력하세요"
              className="input flex-1"
            />
            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="btn btn-primary"
            >
              {registerMutation.isPending ? '등록 중...' : '등록'}
            </button>
          </div>
        </form>

        {/* 탭 */}
        <div className="flex border-b mb-6">
          {[
            { value: 'available', label: '사용 가능' },
            { value: 'used', label: '사용 완료' },
            { value: 'expired', label: '기간 만료' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-3 font-medium border-b-2 -mb-px ${
                activeTab === tab.value ? 'text-primary-600 border-primary-600' : 'border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 쿠폰 목록 */}
        {coupons.length > 0 ? (
          <div className="space-y-4">
            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                className={`card p-4 ${activeTab !== 'available' ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-600">
                    <Ticket size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold">{coupon.name}</h3>
                    <p className="text-2xl font-bold text-primary-600 my-1">
                      {coupon.discount_type === 'percentage'
                        ? `${coupon.discount_value}% 할인`
                        : `${formatPrice(coupon.discount_value)}원 할인`}
                    </p>
                    {coupon.description && (
                      <p className="text-sm text-gray-500">{coupon.description}</p>
                    )}
                    <div className="text-xs text-gray-400 mt-2 space-y-0.5">
                      {coupon.min_order_amount > 0 && (
                        <p>{formatPrice(coupon.min_order_amount)}원 이상 구매 시</p>
                      )}
                      {coupon.max_discount_amount && (
                        <p>최대 {formatPrice(coupon.max_discount_amount)}원 할인</p>
                      )}
                      <p>~ {formatDate(coupon.end_date)} 까지</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Gift size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              {activeTab === 'available' ? '사용 가능한 쿠폰이 없습니다.' :
               activeTab === 'used' ? '사용 완료된 쿠폰이 없습니다.' :
               '만료된 쿠폰이 없습니다.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
