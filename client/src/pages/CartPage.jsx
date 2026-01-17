import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Minus, Plus, ShoppingBag, Shield } from 'lucide-react';
import { useAuthStore } from '@/context/authStore';
import { useCartStore } from '@/context/cartStore';
import { formatPrice, getImageUrl, calcDdcarePrice } from '@/utils/helpers';
import { PageLoading } from '@/components/common/Loading';

export default function CartPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isDdcareMember = useAuthStore((state) => state.isDdcareMember);
  const { items, summary, isLoading, fetchCart, updateQuantity, removeItem, deleteSelected } = useCartStore();
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    }
  }, [isAuthenticated, fetchCart]);

  useEffect(() => {
    // 전체 선택 초기화
    setSelectedItems(items.filter(item => item.isAvailable).map(item => item.id));
  }, [items]);

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(items.filter(item => item.isAvailable).map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id, checked) => {
    if (checked) {
      setSelectedItems([...selectedItems, id]);
    } else {
      setSelectedItems(selectedItems.filter(i => i !== id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;
    await deleteSelected(selectedItems);
    setSelectedItems([]);
  };

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      return;
    }
    navigate('/checkout', { state: { selectedItems } });
  };

  // 선택된 상품의 합계 계산
  const selectedSummary = items.reduce((acc, item) => {
    if (selectedItems.includes(item.id)) {
      acc.totalPrice += item.itemTotal;
      acc.totalSalePrice += item.itemSaleTotal;
      // 든든케어 할인가 계산
      const ddcarePrice = calcDdcarePrice(item.unitSalePrice, isDdcareMember()) * item.quantity;
      acc.totalDdcarePrice += ddcarePrice;
    }
    return acc;
  }, { totalPrice: 0, totalSalePrice: 0, totalDdcarePrice: 0 });

  // 든든케어 회원이면 할인된 금액 기준으로 배송비 계산
  const priceForShipping = isDdcareMember() ? selectedSummary.totalDdcarePrice : selectedSummary.totalSalePrice;
  const shippingFee = priceForShipping >= 30000 ? 0 : 2500;
  const ddcareDiscount = isDdcareMember() ? selectedSummary.totalSalePrice - selectedSummary.totalDdcarePrice : 0;
  const finalPrice = priceForShipping + (selectedItems.length > 0 ? shippingFee : 0);

  if (!isAuthenticated) {
    return (
      <div className="container-custom py-16 text-center">
        <ShoppingBag size={64} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold mb-2">로그인이 필요합니다</h2>
        <p className="text-gray-500 mb-6">장바구니를 이용하려면 로그인해주세요.</p>
        <Link to="/login" className="btn btn-primary">
          로그인
        </Link>
      </div>
    );
  }

  if (isLoading) return <PageLoading />;

  if (items.length === 0) {
    return (
      <div className="container-custom py-16 text-center">
        <ShoppingBag size={64} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold mb-2">장바구니가 비어있습니다</h2>
        <p className="text-gray-500 mb-6">마음에 드는 상품을 담아보세요.</p>
        <Link to="/products" className="btn btn-primary">
          쇼핑 계속하기
        </Link>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="container-custom">
        <h1 className="text-2xl font-bold mb-6">장바구니</h1>

        <div className="lg:flex lg:gap-8">
          {/* 장바구니 목록 */}
          <div className="flex-1">
            {/* 전체 선택 */}
            <div className="flex items-center justify-between py-4 border-b">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedItems.length === items.filter(i => i.isAvailable).length && items.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
                <span className="font-medium">전체 선택 ({selectedItems.length}/{items.length})</span>
              </label>
              <button
                onClick={handleDeleteSelected}
                disabled={selectedItems.length === 0}
                className="text-sm text-gray-500 hover:text-red-500 disabled:opacity-50"
              >
                선택 삭제
              </button>
            </div>

            {/* 상품 목록 */}
            <ul className="divide-y">
              {items.map((item) => (
                <li key={item.id} className={`py-4 ${!item.isAvailable ? 'opacity-50' : ''}`}>
                  <div className="flex gap-4">
                    {/* 체크박스 */}
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                      disabled={!item.isAvailable}
                      className="mt-8"
                    />

                    {/* 이미지 */}
                    <Link to={`/products/${item.slug}`} className="flex-shrink-0">
                      <img
                        src={getImageUrl(item.image_url)}
                        alt={item.name}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    </Link>

                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <Link to={`/products/${item.slug}`} className="font-medium text-gray-900 hover:text-primary-600 line-clamp-2">
                        {item.name}
                      </Link>
                      {item.option_name && (
                        <p className="text-sm text-gray-500 mt-1">
                          옵션: {item.option_name} - {item.option_value}
                        </p>
                      )}
                      {!item.isAvailable && (
                        <p className="text-sm text-red-500 mt-1">
                          {item.is_active ? `재고 부족 (남은 재고: ${item.availableStock}개)` : '판매 중지된 상품'}
                        </p>
                      )}

                      <div className="flex items-center gap-4 mt-3">
                        {/* 가격 */}
                        <div>
                          <span className="font-bold text-gray-900">{formatPrice(item.unitSalePrice)}원</span>
                          {item.unitSalePrice < item.unitPrice && (
                            <span className="text-sm text-gray-400 line-through ml-2">
                              {formatPrice(item.unitPrice)}원
                            </span>
                          )}
                        </div>

                        {/* 수량 조절 */}
                        <div className="flex items-center border rounded">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="p-1.5 hover:bg-gray-100 disabled:opacity-50"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-10 text-center text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.availableStock}
                            className="p-1.5 hover:bg-gray-100 disabled:opacity-50"
                          >
                            <Plus size={16} />
                          </button>
                        </div>

                        {/* 삭제 */}
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* 소계 */}
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatPrice(item.itemSaleTotal)}원</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* 결제 요약 */}
          <div className="lg:w-80 mt-8 lg:mt-0">
            <div className="card p-6 sticky top-24">
              <h2 className="text-lg font-bold mb-4">결제 예상 금액</h2>

              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">상품 금액</dt>
                  <dd className="font-medium">{formatPrice(selectedSummary.totalPrice)}원</dd>
                </div>
                {selectedSummary.totalPrice - selectedSummary.totalSalePrice > 0 && (
                  <div className="flex justify-between text-red-500">
                    <dt>할인 금액</dt>
                    <dd>-{formatPrice(selectedSummary.totalPrice - selectedSummary.totalSalePrice)}원</dd>
                  </div>
                )}
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
                <div className="flex justify-between">
                  <dt className="text-gray-600">배송비</dt>
                  <dd className="font-medium">
                    {selectedItems.length === 0 ? (
                      '-'
                    ) : shippingFee === 0 ? (
                      <span className="text-primary-600">무료</span>
                    ) : (
                      `${formatPrice(shippingFee)}원`
                    )}
                  </dd>
                </div>
              </dl>

              {priceForShipping > 0 && priceForShipping < 30000 && (
                <p className="text-xs text-gray-500 mt-3">
                  {formatPrice(30000 - priceForShipping)}원 더 구매 시 무료배송
                </p>
              )}

              {/* 든든케어 회원 안내 */}
              {isDdcareMember() && (
                <div className="mt-3 p-2 bg-primary-50 rounded-lg flex items-center gap-2 text-xs text-primary-700">
                  <Shield size={14} />
                  든든케어 회원 30% 추가 할인 적용 중
                </div>
              )}

              <div className="border-t mt-4 pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">총 결제 금액</span>
                  <span className="text-xl font-bold text-primary-600">
                    {formatPrice(finalPrice)}원
                  </span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={selectedItems.length === 0}
                className="btn btn-primary w-full mt-6 py-3"
              >
                주문하기 ({selectedItems.length}개)
              </button>

              <Link
                to="/products"
                className="btn btn-secondary w-full mt-2 py-3"
              >
                쇼핑 계속하기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
