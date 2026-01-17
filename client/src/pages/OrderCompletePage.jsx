import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import { paymentAPI, orderAPI } from '@/utils/api';
import { formatPrice } from '@/utils/helpers';
import { PageLoading } from '@/components/common/Loading';

export default function OrderCompletePage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading, success, fail
  const [orderInfo, setOrderInfo] = useState(null);
  const [error, setError] = useState('');

  const orderId = searchParams.get('orderId');
  const paymentKey = searchParams.get('paymentKey');
  const amount = searchParams.get('amount');

  useEffect(() => {
    const confirmPayment = async () => {
      if (!orderId || !paymentKey || !amount) {
        setStatus('fail');
        setError('결제 정보가 올바르지 않습니다.');
        return;
      }

      try {
        // 결제 승인
        await paymentAPI.confirm({
          orderId,
          paymentKey,
          amount: parseInt(amount),
        });

        // 주문 정보 조회
        const { data } = await orderAPI.getDetail(orderId);
        setOrderInfo(data);
        setStatus('success');
      } catch (error) {
        setStatus('fail');
        setError(error.response?.data?.error || '결제 처리 중 오류가 발생했습니다.');
      }
    };

    confirmPayment();
  }, [orderId, paymentKey, amount]);

  if (status === 'loading') {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center">
        <PageLoading />
        <p className="mt-4 text-gray-600">결제 처리 중입니다...</p>
      </div>
    );
  }

  if (status === 'fail') {
    return (
      <div className="container-custom py-16 text-center">
        <XCircle size={80} className="mx-auto text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">결제에 실패했습니다</h1>
        <p className="text-gray-600 mb-8">{error}</p>
        <div className="flex gap-4 justify-center">
          <Link to="/cart" className="btn btn-secondary">
            장바구니로 돌아가기
          </Link>
          <Link to="/" className="btn btn-primary">
            홈으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-16">
      <div className="max-w-lg mx-auto text-center">
        <CheckCircle size={80} className="mx-auto text-green-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">주문이 완료되었습니다!</h1>
        <p className="text-gray-600 mb-8">
          주문해 주셔서 감사합니다. 빠른 시일 내에 배송해 드리겠습니다.
        </p>

        {orderInfo && (
          <div className="card p-6 text-left mb-8">
            <h2 className="font-bold mb-4">주문 정보</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">주문번호</dt>
                <dd className="font-medium">{orderInfo.order.order_number}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">결제 금액</dt>
                <dd className="font-bold text-primary-600">
                  {formatPrice(orderInfo.order.total_amount - orderInfo.order.discount_amount - orderInfo.order.used_point + orderInfo.order.shipping_fee)}원
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">적립 예정 포인트</dt>
                <dd className="text-primary-600">+{formatPrice(orderInfo.order.earned_point)}P</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">배송지</dt>
                <dd>{orderInfo.order.address} {orderInfo.order.address_detail}</dd>
              </div>
            </dl>
          </div>
        )}

        <div className="flex gap-4 justify-center">
          <Link to="/mypage/orders" className="btn btn-secondary">
            주문 내역 보기
          </Link>
          <Link to="/" className="btn btn-primary">
            쇼핑 계속하기
          </Link>
        </div>
      </div>
    </div>
  );
}
