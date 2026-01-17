import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderAPI, paymentAPI } from '@/utils/api';
import { formatPrice, formatDate, getOrderStatusText, getOrderStatusColor, getImageUrl } from '@/utils/helpers';
import { PageLoading } from '@/components/common/Loading';
import toast from 'react-hot-toast';

export default function OrderDetailPage() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: () => orderAPI.getDetail(orderNumber),
  });

  const cancelMutation = useMutation({
    mutationFn: () => orderAPI.cancel(orderNumber),
    onSuccess: () => {
      toast.success('주문이 취소되었습니다.');
      queryClient.invalidateQueries(['order', orderNumber]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || '주문 취소에 실패했습니다.');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => orderAPI.confirm(orderNumber),
    onSuccess: (data) => {
      toast.success(`구매가 확정되었습니다. ${data.data.earnedPoint}P가 적립되었습니다.`);
      queryClient.invalidateQueries(['order', orderNumber]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || '구매 확정에 실패했습니다.');
    },
  });

  if (isLoading) return <PageLoading />;
  if (!data?.data?.order) return <div className="container-custom py-16 text-center">주문을 찾을 수 없습니다.</div>;

  const { order, items, payment } = data.data;
  const finalAmount = order.total_amount - order.discount_amount - order.used_point + order.shipping_fee;

  const handleCancel = () => {
    if (window.confirm('주문을 취소하시겠습니까?')) {
      cancelMutation.mutate();
    }
  };

  const handleConfirm = () => {
    if (window.confirm('구매를 확정하시겠습니까? 확정 후에는 취소/환불이 어려울 수 있습니다.')) {
      confirmMutation.mutate();
    }
  };

  return (
    <div className="py-8">
      <div className="container-custom max-w-3xl">
        <h1 className="text-2xl font-bold mb-6">주문 상세</h1>

        {/* 주문 상태 */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">{formatDate(order.created_at, 'YYYY.MM.DD HH:mm')}</p>
              <p className="text-gray-600">주문번호: {order.order_number}</p>
            </div>
            <span className={`badge ${getOrderStatusColor(order.status)} text-lg px-4 py-1`}>
              {getOrderStatusText(order.status)}
            </span>
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-2">
            {['pending', 'paid'].includes(order.status) && (
              <button
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
                className="btn btn-danger btn-sm"
              >
                주문 취소
              </button>
            )}
            {order.status === 'delivered' && (
              <button
                onClick={handleConfirm}
                disabled={confirmMutation.isPending}
                className="btn btn-primary btn-sm"
              >
                구매 확정
              </button>
            )}
          </div>
        </div>

        {/* 주문 상품 */}
        <div className="card p-6 mb-6">
          <h2 className="font-bold mb-4">주문 상품</h2>
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.id} className="py-4 flex gap-4">
                <img
                  src={getImageUrl(item.image_url)}
                  alt={item.product_name}
                  className="w-20 h-20 object-cover rounded"
                />
                <div className="flex-1">
                  <p className="font-medium">{item.product_name}</p>
                  {item.option_name && (
                    <p className="text-sm text-gray-500">{item.option_name}</p>
                  )}
                  <p className="text-sm text-gray-600">수량: {item.quantity}개</p>
                </div>
                <p className="font-bold">{formatPrice(item.total_price)}원</p>
              </li>
            ))}
          </ul>
        </div>

        {/* 배송 정보 */}
        <div className="card p-6 mb-6">
          <h2 className="font-bold mb-4">배송 정보</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex">
              <dt className="w-24 text-gray-500">수령인</dt>
              <dd>{order.recipient_name}</dd>
            </div>
            <div className="flex">
              <dt className="w-24 text-gray-500">연락처</dt>
              <dd>{order.recipient_phone}</dd>
            </div>
            <div className="flex">
              <dt className="w-24 text-gray-500">주소</dt>
              <dd>({order.zipcode}) {order.address} {order.address_detail}</dd>
            </div>
            {order.delivery_memo && (
              <div className="flex">
                <dt className="w-24 text-gray-500">배송 메모</dt>
                <dd>{order.delivery_memo}</dd>
              </div>
            )}
            {order.tracking_number && (
              <div className="flex">
                <dt className="w-24 text-gray-500">운송장번호</dt>
                <dd className="text-primary-600">{order.tracking_number}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* 결제 정보 */}
        <div className="card p-6">
          <h2 className="font-bold mb-4">결제 정보</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">상품 금액</dt>
              <dd>{formatPrice(order.total_amount)}원</dd>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-red-500">
                <dt>쿠폰 할인</dt>
                <dd>-{formatPrice(order.discount_amount)}원</dd>
              </div>
            )}
            {order.used_point > 0 && (
              <div className="flex justify-between text-red-500">
                <dt>포인트 사용</dt>
                <dd>-{formatPrice(order.used_point)}원</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">배송비</dt>
              <dd>{order.shipping_fee === 0 ? '무료' : `${formatPrice(order.shipping_fee)}원`}</dd>
            </div>
            <div className="flex justify-between pt-3 border-t font-bold text-lg">
              <dt>총 결제 금액</dt>
              <dd className="text-primary-600">{formatPrice(finalAmount)}원</dd>
            </div>
            {order.earned_point > 0 && (
              <div className="flex justify-between text-primary-600">
                <dt>적립 {order.status === 'completed' ? '완료' : '예정'} 포인트</dt>
                <dd>+{formatPrice(order.earned_point)}P</dd>
              </div>
            )}
          </dl>
          {payment && (
            <div className="mt-4 pt-4 border-t text-sm text-gray-500">
              <p>결제 수단: {payment.method}</p>
              {payment.card_company && <p>카드: {payment.card_company} {payment.card_number}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
