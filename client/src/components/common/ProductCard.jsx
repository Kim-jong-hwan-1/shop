import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Star, Shield } from 'lucide-react';
import { formatPrice, calcDiscountRate, calcDdcarePrice, getImageUrl } from '@/utils/helpers';
import { useAuthStore } from '@/context/authStore';
import { useCartStore } from '@/context/cartStore';
import { wishlistAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function ProductCard({ product }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isDdcareMember = useAuthStore((state) => state.isDdcareMember);
  const addToCart = useCartStore((state) => state.addItem);
  const [isWishlisted, setIsWishlisted] = useState(product.isWishlisted || false);

  const discountRate = calcDiscountRate(product.price, product.sale_price);
  const displayPrice = product.sale_price || product.price;
  const ddcarePrice = calcDdcarePrice(displayPrice, isDdcareMember());

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    await addToCart(product.id);
  };

  const handleToggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();

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

  return (
    <Link to={`/products/${product.slug}`} className="group">
      <div className="card card-hover overflow-hidden">
        {/* 이미지 */}
        <div className="relative aspect-square bg-gray-100">
          <img
            src={getImageUrl(product.image_url)}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />

          {/* 배지 영역 */}
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            {/* 할인 배지 */}
            {discountRate > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                {discountRate}% OFF
              </span>
            )}
            {/* 든든케어 배지 */}
            {isDdcareMember() && (
              <span className="bg-primary-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                <Shield size={10} /> 30%
              </span>
            )}
          </div>

          {/* 품절 표시 */}
          {product.stock <= 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-bold text-lg">품절</span>
            </div>
          )}

          {/* 호버 버튼 */}
          <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleToggleWishlist}
              className={`p-2 rounded-full shadow-lg transition ${
                isWishlisted
                  ? 'bg-red-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Heart size={18} fill={isWishlisted ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={handleAddToCart}
              disabled={product.stock <= 0}
              className="p-2 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart size={18} />
            </button>
          </div>
        </div>

        {/* 정보 */}
        <div className="p-4">
          {/* 카테고리 */}
          {product.category_name && (
            <p className="text-xs text-gray-500 mb-1">{product.category_name}</p>
          )}

          {/* 상품명 */}
          <h3 className="font-medium text-gray-900 line-clamp-2 mb-2 group-hover:text-primary-600 transition">
            {product.name}
          </h3>

          {/* 가격 */}
          <div className="space-y-1">
            {isDdcareMember() ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-primary-600">
                    {formatPrice(ddcarePrice)}원
                  </span>
                  <span className="text-sm text-gray-400 line-through">
                    {formatPrice(displayPrice)}원
                  </span>
                </div>
                <p className="text-xs text-primary-600 flex items-center gap-1">
                  <Shield size={10} /> 든든케어 할인가
                </p>
              </>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-gray-900">
                  {formatPrice(displayPrice)}원
                </span>
                {product.sale_price && (
                  <span className="text-sm text-gray-400 line-through">
                    {formatPrice(product.price)}원
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 리뷰 */}
          {product.review_count > 0 && (
            <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
              <Star size={14} className="text-yellow-400 fill-yellow-400" />
              <span>{product.avg_rating?.toFixed(1)}</span>
              <span>({product.review_count})</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
