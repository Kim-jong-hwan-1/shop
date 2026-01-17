import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Heart, ShoppingCart, Minus, Plus, Star, ChevronRight, Shield } from 'lucide-react';
import { productAPI, wishlistAPI } from '@/utils/api';
import { useAuthStore } from '@/context/authStore';
import { useCartStore } from '@/context/cartStore';
import { formatPrice, calcDiscountRate, calcDdcarePrice, formatDate, getImageUrl } from '@/utils/helpers';
import Pagination from '@/components/common/Pagination';
import ProductCard from '@/components/common/ProductCard';
import { PageLoading } from '@/components/common/Loading';
import toast from 'react-hot-toast';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isDdcareMember = useAuthStore((state) => state.isDdcareMember);
  const addToCart = useCartStore((state) => state.addItem);

  const [quantity, setQuantity] = useState(1);
  const [selectedOption, setSelectedOption] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState('description');
  const [reviewPage, setReviewPage] = useState(1);

  // 상품 상세 조회
  const { data: productData, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productAPI.getDetail(slug),
  });

  // 리뷰 조회
  const { data: reviewsData } = useQuery({
    queryKey: ['product-reviews', productData?.data?.product?.id, reviewPage],
    queryFn: () => productAPI.getReviews(productData?.data?.product?.id, { page: reviewPage }),
    enabled: !!productData?.data?.product?.id,
  });

  const product = productData?.data?.product;
  const reviews = reviewsData?.data?.data || [];
  const reviewPagination = reviewsData?.data?.pagination || {};
  const [isWishlisted, setIsWishlisted] = useState(product?.isWishlisted || false);

  if (isLoading) return <PageLoading />;
  if (!product) return <div className="container-custom py-16 text-center">상품을 찾을 수 없습니다.</div>;

  const discountRate = calcDiscountRate(product.price, product.sale_price);
  const displayPrice = product.sale_price || product.price;
  const optionPrice = selectedOption?.price_adjustment || 0;
  const unitPrice = displayPrice + optionPrice;
  const ddcareUnitPrice = calcDdcarePrice(unitPrice, isDdcareMember());
  const totalPrice = (isDdcareMember() ? ddcareUnitPrice : unitPrice) * quantity;

  const handleQuantityChange = (delta) => {
    const newQuantity = quantity + delta;
    const maxStock = selectedOption?.stock ?? product.stock;
    if (newQuantity >= 1 && newQuantity <= maxStock) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    if (product.options?.length > 0 && !selectedOption) {
      toast.error('옵션을 선택해주세요.');
      return;
    }

    const success = await addToCart(product.id, quantity, selectedOption?.id);
    if (success) {
      setQuantity(1);
    }
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    if (product.options?.length > 0 && !selectedOption) {
      toast.error('옵션을 선택해주세요.');
      return;
    }

    const success = await addToCart(product.id, quantity, selectedOption?.id);
    if (success) {
      navigate('/cart');
    }
  };

  const handleToggleWishlist = async () => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    try {
      const { data } = await wishlistAPI.toggle(product.id);
      setIsWishlisted(data.isWishlisted);
      toast.success(data.message);
    } catch (error) {
      toast.error('처리에 실패했습니다.');
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={16}
            className={i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="py-8">
      <div className="container-custom">
        {/* 브레드크럼 */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link to="/" className="hover:text-primary-600">홈</Link>
          <ChevronRight size={16} />
          <Link to="/products" className="hover:text-primary-600">상품</Link>
          {product.category_name && (
            <>
              <ChevronRight size={16} />
              <Link to={`/products?category=${product.category_slug}`} className="hover:text-primary-600">
                {product.category_name}
              </Link>
            </>
          )}
        </nav>

        {/* 상품 정보 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* 이미지 갤러리 */}
          <div>
            <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden mb-4">
              <img
                src={getImageUrl(product.images?.[selectedImage]?.image_url || product.image_url)}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.map((img, index) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                      selectedImage === index ? 'border-primary-600' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={getImageUrl(img.image_url)}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 상품 정보 */}
          <div>
            {/* 카테고리 */}
            {product.category_name && (
              <p className="text-sm text-gray-500 mb-2">{product.category_name}</p>
            )}

            {/* 상품명 */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>

            {/* 리뷰 요약 */}
            {product.reviewStats?.total > 0 && (
              <div className="flex items-center gap-2 mb-4">
                {renderStars(Math.round(product.reviewStats.average))}
                <span className="text-sm text-gray-600">
                  {product.reviewStats.average?.toFixed(1)} ({product.reviewStats.total}개 리뷰)
                </span>
              </div>
            )}

            {/* 가격 */}
            <div className="mb-6">
              {discountRate > 0 && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-red-500 font-bold">{discountRate}%</span>
                  <span className="text-gray-400 line-through">{formatPrice(product.price)}원</span>
                </div>
              )}
              <p className="text-3xl font-bold text-gray-900">{formatPrice(displayPrice)}원</p>

              {/* 든든케어 할인가 표시 */}
              {isDdcareMember() && (
                <div className="mt-2 p-3 bg-primary-50 rounded-lg border border-primary-200">
                  <div className="flex items-center gap-2">
                    <Shield size={18} className="text-primary-600" />
                    <span className="text-sm font-medium text-primary-700">든든케어 회원가</span>
                  </div>
                  <p className="text-2xl font-bold text-primary-600 mt-1">
                    {formatPrice(calcDdcarePrice(displayPrice, true))}원
                    <span className="text-sm font-normal text-primary-500 ml-2">(-30%)</span>
                  </p>
                </div>
              )}
            </div>

            {/* 짧은 설명 */}
            {product.short_description && (
              <p className="text-gray-600 mb-6">{product.short_description}</p>
            )}

            {/* 배송 정보 */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">배송비</span>
                <span className="font-medium">3만원 이상 무료 (미만 2,500원)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">배송 예정</span>
                <span className="font-medium">결제 후 1~2일 이내 출고</span>
              </div>
            </div>

            {/* 옵션 선택 */}
            {product.options?.length > 0 && (
              <div className="mb-6">
                <label className="label">옵션 선택</label>
                <select
                  value={selectedOption?.id || ''}
                  onChange={(e) => {
                    const option = product.options.find(o => o.id === parseInt(e.target.value));
                    setSelectedOption(option || null);
                    setQuantity(1);
                  }}
                  className="input"
                >
                  <option value="">옵션을 선택해주세요</option>
                  {product.options.map((option) => (
                    <option key={option.id} value={option.id} disabled={option.stock <= 0}>
                      {option.name}: {option.value}
                      {option.price_adjustment > 0 && ` (+${formatPrice(option.price_adjustment)}원)`}
                      {option.stock <= 0 && ' (품절)'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 수량 선택 */}
            <div className="mb-6">
              <label className="label">수량</label>
              <div className="flex items-center gap-3">
                <div className="flex items-center border rounded-lg">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="p-2 hover:bg-gray-100 disabled:opacity-50"
                  >
                    <Minus size={20} />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= (selectedOption?.stock ?? product.stock)}
                    className="p-2 hover:bg-gray-100 disabled:opacity-50"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <span className="text-sm text-gray-500">
                  재고: {selectedOption?.stock ?? product.stock}개
                </span>
              </div>
            </div>

            {/* 총 금액 */}
            <div className="flex items-center justify-between py-4 border-t border-b mb-6">
              <span className="text-lg font-medium">총 상품 금액</span>
              <span className="text-2xl font-bold text-primary-600">{formatPrice(totalPrice)}원</span>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3">
              <button
                onClick={handleToggleWishlist}
                className={`p-3 rounded-lg border-2 transition ${
                  isWishlisted
                    ? 'border-red-500 text-red-500 bg-red-50'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                <Heart size={24} fill={isWishlisted ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                className="btn btn-outline flex-1 py-3"
              >
                <ShoppingCart size={20} className="mr-2" />
                장바구니
              </button>
              <button
                onClick={handleBuyNow}
                disabled={product.stock <= 0}
                className="btn btn-primary flex-1 py-3"
              >
                바로 구매
              </button>
            </div>
          </div>
        </div>

        {/* 탭 */}
        <div className="border-b mb-8">
          <div className="flex gap-8">
            {[
              { id: 'description', label: '상품 설명' },
              { id: 'reviews', label: `리뷰 (${product.reviewStats?.total || 0})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 font-medium transition border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'text-primary-600 border-primary-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 탭 콘텐츠 */}
        {activeTab === 'description' && (
          <div className="prose max-w-none">
            <div dangerouslySetInnerHTML={{ __html: product.description?.replace(/\n/g, '<br/>') || '상품 설명이 없습니다.' }} />
          </div>
        )}

        {activeTab === 'reviews' && (
          <div>
            {/* 리뷰 통계 */}
            {product.reviewStats?.total > 0 && (
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-5xl font-bold text-gray-900 mb-2">
                      {product.reviewStats.average?.toFixed(1)}
                    </p>
                    {renderStars(Math.round(product.reviewStats.average))}
                    <p className="text-sm text-gray-500 mt-1">{product.reviewStats.total}개 리뷰</p>
                  </div>
                  <div className="flex-1">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = product.reviewStats[['one', 'two', 'three', 'four', 'five'][star - 1]] || 0;
                      const percentage = product.reviewStats.total > 0 ? (count / product.reviewStats.total) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 mb-1">
                          <span className="text-sm w-8">{star}점</span>
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-400 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-500 w-8">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 리뷰 목록 */}
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="card p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        {renderStars(review.rating)}
                        <p className="text-sm text-gray-500 mt-1">
                          {review.user_name} · {formatDate(review.created_at)}
                        </p>
                      </div>
                    </div>
                    {review.title && (
                      <p className="font-medium mb-2">{review.title}</p>
                    )}
                    <p className="text-gray-700">{review.content}</p>
                    {review.image_url && (
                      <img
                        src={getImageUrl(review.image_url)}
                        alt="리뷰 이미지"
                        className="mt-3 w-24 h-24 object-cover rounded-lg"
                      />
                    )}
                    {review.admin_reply && (
                      <div className="mt-4 bg-gray-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-primary-600 mb-1">판매자 답변</p>
                        <p className="text-sm text-gray-700">{review.admin_reply}</p>
                      </div>
                    )}
                  </div>
                ))}

                {reviewPagination.totalPages > 1 && (
                  <div className="mt-6">
                    <Pagination
                      pagination={reviewPagination}
                      onPageChange={setReviewPage}
                    />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">아직 리뷰가 없습니다.</p>
            )}
          </div>
        )}

        {/* 관련 상품 */}
        {product.relatedProducts?.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-bold text-gray-900 mb-6">관련 상품</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {product.relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
