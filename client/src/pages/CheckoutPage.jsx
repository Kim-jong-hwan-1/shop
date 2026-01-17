import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Shield } from 'lucide-react';
import { orderAPI, couponAPI, paymentAPI } from '@/utils/api';
import { useAuthStore } from '@/context/authStore';
import { useCartStore } from '@/context/cartStore';
import { formatPrice, getImageUrl, calcDdcarePrice } from '@/utils/helpers';
import toast from 'react-hot-toast';

// 토스 결제 SDK 임시 비활성화 (npm 패키지 문제)
const loadTossPayments = () => Promise.resolve(null);

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isDdcareMember = useAuthStore((state) => state.isDdcareMember);
  const { items, fetchCart } = useCartStore();

  const [selectedItems, setSelectedItems] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [usePoint, setUsePoint] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // 저장된 배송정보 불러오기
  const getSavedShippingInfo = () => {
    try {
      const saved = localStorage.getItem('shippingInfo');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const savedShipping = getSavedShippingInfo();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      recipientName: savedShipping?.recipientName || user?.name || '',
      recipientPhone: savedShipping?.recipientPhone || user?.phone || '',
      zipcode: savedShipping?.zipcode || user?.zipcode || '',
      address: savedShipping?.address || user?.address || '',
      addressDetail: savedShipping?.addressDetail || user?.address_detail || '',
      deliveryMemo: savedShipping?.deliveryMemo || '',
      customMemo: savedShipping?.customMemo || '',
    }
  });

  const deliveryMemo = watch('deliveryMemo');
  const isCustomMemo = deliveryMemo === 'custom';

  useEffect(() => {
    const selectedIds = location.state?.selectedItems || [];
    if (selectedIds.length === 0) {
      navigate('/cart');
      return;
    }
    setSelectedItems(selectedIds);
  }, [location.state, navigate]);

  // 주문 상품 필터링
  const orderItems = items.filter(item => selectedItems.includes(item.id) && item.isAvailable);

  // 금액 계산
  const subtotal = orderItems.reduce((sum, item) => sum + item.itemSaleTotal, 0);

  // 든든케어 할인 계산
  const ddcareSubtotal = orderItems.reduce((sum, item) => {
    return sum + calcDdcarePrice(item.unitSalePrice, isDdcareMember()) * item.quantity;
  }, 0);
  const ddcareDiscount = isDdcareMember() ? subtotal - ddcareSubtotal : 0;

  // 쿠폰 할인 (든든케어 할인 후 금액에 적용)
  const priceAfterDdcare = isDdcareMember() ? ddcareSubtotal : subtotal;
  const couponDiscount = selectedCoupon?.discountAmount || 0;

  // 사용 가능 포인트
  const maxUsePoint = Math.min(user?.point || 0, priceAfterDdcare - couponDiscount);
  const actualUsePoint = Math.min(usePoint, maxUsePoint);

  // 배송비
  const afterDiscount = priceAfterDdcare - couponDiscount - actualUsePoint;
  const shippingFee = afterDiscount >= 30000 ? 0 : 2500;

  // 최종 금액
  const finalAmount = afterDiscount + shippingFee;

  // 쿠폰 조회
  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const { data } = await couponAPI.getAvailable(subtotal);
        setCoupons(data.coupons);
      } catch (error) {
        console.error('Fetch coupons error:', error);
      }
    };

    if (subtotal > 0) {
      fetchCoupons();
    }
  }, [subtotal]);

  const handlePayment = async (formData) => {
    if (orderItems.length === 0) {
      toast.error('주문할 상품이 없습니다.');
      return;
    }

    setIsLoading(true);

    try {
      // 배송정보 localStorage에 저장
      const shippingInfo = {
        recipientName: formData.recipientName,
        recipientPhone: formData.recipientPhone,
        zipcode: formData.zipcode,
        address: formData.address,
        addressDetail: formData.addressDetail,
        deliveryMemo: formData.deliveryMemo,
        customMemo: formData.customMemo,
      };
      localStorage.setItem('shippingInfo', JSON.stringify(shippingInfo));

      // 실제 배송메모 값 결정 (직접입력인 경우 customMemo 사용)
      const actualDeliveryMemo = formData.deliveryMemo === 'custom'
        ? formData.customMemo
        : formData.deliveryMemo;

      // 1. 주문 생성
      const orderData = {
        ...formData,
        deliveryMemo: actualDeliveryMemo,
        items: orderItems.map(item => ({
          productId: item.product_id,
          optionId: item.product_option_id,
          quantity: item.quantity,
        })),
        couponId: selectedCoupon?.id,
        usePoint: actualUsePoint >= 1000 ? actualUsePoint : 0,
      };

      const { data: orderResult } = await orderAPI.create(orderData);

      // 2. 결제 진행 (테스트 모드 - 토스 SDK 비활성화)
      toast.success('주문이 완료되었습니다! (테스트 모드)');
      navigate(`/order/complete?orderId=${orderResult.orderNumber}`);
    } catch (error) {
      if (error.code === 'USER_CANCEL') {
        toast.error('결제가 취소되었습니다.');
      } else {
        const message = error.response?.data?.error || error.message || '주문 처리 중 오류가 발생했습니다.';
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (orderItems.length === 0) {
    return null;
  }

  return (
    <div className="py-8">
      <div className="container-custom">
        <h1 className="text-2xl font-bold mb-6">주문/결제</h1>

        <form onSubmit={handleSubmit(handlePayment)}>
          <div className="lg:flex lg:gap-8">
            {/* 왼쪽: 주문 정보 */}
            <div className="flex-1 space-y-6">
              {/* 주문 상품 */}
              <div className="card p-6">
                <h2 className="text-lg font-bold mb-4">주문 상품 ({orderItems.length}개)</h2>
                <ul className="divide-y">
                  {orderItems.map((item) => (
                    <li key={item.id} className="py-3 flex gap-4">
                      <img
                        src={getImageUrl(item.image_url)}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium line-clamp-1">{item.name}</p>
                        {item.option_name && (
                          <p className="text-sm text-gray-500">{item.option_name}: {item.option_value}</p>
                        )}
                        <p className="text-sm text-gray-600">수량: {item.quantity}개</p>
                      </div>
                      <p className="font-bold">{formatPrice(item.itemSaleTotal)}원</p>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 배송 정보 */}
              <div className="card p-6">
                <h2 className="text-lg font-bold mb-4">배송 정보</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">수령인 <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        className={`input ${errors.recipientName ? 'input-error' : ''}`}
                        {...register('recipientName', { required: '수령인을 입력해주세요.' })}
                      />
                      {errors.recipientName && <p className="error-message">{errors.recipientName.message}</p>}
                    </div>
                    <div>
                      <label className="label">연락처 <span className="text-red-500">*</span></label>
                      <input
                        type="tel"
                        className={`input ${errors.recipientPhone ? 'input-error' : ''}`}
                        placeholder="010-0000-0000"
                        {...register('recipientPhone', { required: '연락처를 입력해주세요.' })}
                      />
                      {errors.recipientPhone && <p className="error-message">{errors.recipientPhone.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="label">우편번호 <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        className={`input ${errors.zipcode ? 'input-error' : ''}`}
                        {...register('zipcode', { required: '우편번호를 입력해주세요.' })}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="label">주소 <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        className={`input ${errors.address ? 'input-error' : ''}`}
                        {...register('address', { required: '주소를 입력해주세요.' })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">상세주소</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="상세주소를 입력해주세요"
                      {...register('addressDetail')}
                    />
                  </div>

                  <div>
                    <label className="label">배송 메모</label>
                    <select className="input" {...register('deliveryMemo')}>
                      <option value="">배송 메모를 선택해주세요</option>
                      <option value="문 앞에 놓아주세요">문 앞에 놓아주세요</option>
                      <option value="경비실에 맡겨주세요">경비실에 맡겨주세요</option>
                      <option value="배송 전 연락 바랍니다">배송 전 연락 바랍니다</option>
                      <option value="부재 시 휴대폰으로 연락주세요">부재 시 휴대폰으로 연락주세요</option>
                      <option value="custom">직접 입력</option>
                    </select>
                    {isCustomMemo && (
                      <input
                        type="text"
                        className="input mt-2"
                        placeholder="배송 메모를 입력해주세요"
                        {...register('customMemo')}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* 쿠폰/포인트 */}
              <div className="card p-6">
                <h2 className="text-lg font-bold mb-4">할인 적용</h2>

                {/* 쿠폰 */}
                <div className="mb-4">
                  <label className="label">쿠폰</label>
                  <select
                    value={selectedCoupon?.id || ''}
                    onChange={(e) => {
                      const coupon = coupons.find(c => c.id === parseInt(e.target.value));
                      setSelectedCoupon(coupon || null);
                    }}
                    className="input"
                  >
                    <option value="">쿠폰 선택</option>
                    {coupons.map((coupon) => (
                      <option key={coupon.id} value={coupon.id} disabled={!coupon.isUsable}>
                        {coupon.name} (-{formatPrice(coupon.discountAmount)}원)
                        {!coupon.isUsable && ` (${formatPrice(coupon.min_order_amount)}원 이상 구매 시)`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 포인트 */}
                <div>
                  <label className="label">
                    포인트 (보유: {formatPrice(user?.point || 0)}P)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={usePoint}
                      onChange={(e) => setUsePoint(Math.max(0, parseInt(e.target.value) || 0))}
                      max={maxUsePoint}
                      className="input flex-1"
                      placeholder="사용할 포인트"
                    />
                    <button
                      type="button"
                      onClick={() => setUsePoint(maxUsePoint)}
                      className="btn btn-secondary"
                    >
                      전액사용
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">1,000P 이상부터 사용 가능</p>
                </div>
              </div>
            </div>

            {/* 오른쪽: 결제 금액 */}
            <div className="lg:w-80 mt-6 lg:mt-0">
              <div className="card p-6 sticky top-24">
                <h2 className="text-lg font-bold mb-4">결제 금액</h2>

                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">상품 금액</dt>
                    <dd className="font-medium">{formatPrice(subtotal)}원</dd>
                  </div>
                  {/* 든든케어 할인 */}
                  {isDdcareMember() && ddcareDiscount > 0 && (
                    <div className="flex justify-between text-primary-600">
                      <dt className="flex items-center gap-1">
                        <Shield size={14} />
                        든든케어 할인
                      </dt>
                      <dd>-{formatPrice(ddcareDiscount)}원</dd>
                    </div>
                  )}
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-red-500">
                      <dt>쿠폰 할인</dt>
                      <dd>-{formatPrice(couponDiscount)}원</dd>
                    </div>
                  )}
                  {actualUsePoint >= 1000 && (
                    <div className="flex justify-between text-red-500">
                      <dt>포인트 사용</dt>
                      <dd>-{formatPrice(actualUsePoint)}원</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-gray-600">배송비</dt>
                    <dd className="font-medium">
                      {shippingFee === 0 ? (
                        <span className="text-primary-600">무료</span>
                      ) : (
                        `${formatPrice(shippingFee)}원`
                      )}
                    </dd>
                  </div>
                </dl>

                {/* 든든케어 회원 안내 */}
                {isDdcareMember() && (
                  <div className="mt-3 p-2 bg-primary-50 rounded-lg flex items-center gap-2 text-xs text-primary-700">
                    <Shield size={14} />
                    든든케어 회원 30% 추가 할인 적용
                  </div>
                )}

                <div className="border-t mt-4 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">총 결제 금액</span>
                    <span className="text-xl font-bold text-primary-600">
                      {formatPrice(finalAmount)}원
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-4 mb-4">
                  주문 내용을 확인하였으며, 결제에 동의합니다.
                </p>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary w-full py-3"
                >
                  {isLoading ? '처리 중...' : `${formatPrice(finalAmount)}원 결제하기`}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
