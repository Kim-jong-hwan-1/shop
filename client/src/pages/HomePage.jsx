import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, Shield, CreditCard, Headphones } from 'lucide-react';
import { productAPI, categoryAPI } from '@/utils/api';
import ProductCard from '@/components/common/ProductCard';
import { ProductGridSkeleton } from '@/components/common/Loading';

export default function HomePage() {
  // 추천 상품
  const { data: featuredProducts, isLoading: isFeaturedLoading } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => productAPI.getList({ featured: 'true', limit: 8 }),
  });

  // 신상품
  const { data: newProducts, isLoading: isNewLoading } = useQuery({
    queryKey: ['products', 'new'],
    queryFn: () => productAPI.getList({ sort: 'newest', limit: 8 }),
  });

  // 카테고리
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryAPI.getList,
  });

  return (
    <div>
      {/* 히어로 섹션 */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="container-custom py-16 md:py-24">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
              건강한 구강을 위한
              <br />
              최고의 선택
            </h1>
            <p className="text-lg md:text-xl text-primary-100 mb-8">
              전문가가 추천하는 프리미엄 구강용품을
              <br />
              합리적인 가격에 만나보세요
            </p>
            <div className="flex gap-4">
              <Link to="/products" className="btn bg-white text-primary-700 hover:bg-gray-100 btn-lg">
                전체 상품 보기
              </Link>
              <Link to="/products?featured=true" className="btn btn-outline border-white text-white hover:bg-white/10 btn-lg">
                베스트 상품
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 특징 섹션 */}
      <section className="py-8 bg-white border-b">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-600">
                <Truck size={24} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">무료배송</p>
                <p className="text-sm text-gray-500">3만원 이상 구매 시</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-600">
                <Shield size={24} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">정품 보장</p>
                <p className="text-sm text-gray-500">100% 정품만 판매</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-600">
                <CreditCard size={24} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">안전결제</p>
                <p className="text-sm text-gray-500">토스페이먼츠 연동</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-600">
                <Headphones size={24} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">고객센터</p>
                <p className="text-sm text-gray-500">1:1 친절 상담</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 카테고리 섹션 */}
      {categories?.data?.flatCategories && (
        <section className="py-12 bg-gray-50">
          <div className="container-custom">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">카테고리</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
              {categories.data.flatCategories.slice(0, 8).map((category) => {
                const categoryIcons = {
                  'toothbrush': '🪥',
                  'toothpaste': '🦷',
                  'floss': '🧵',
                  'mouthwash': '💧',
                  'whitening': '✨',
                  'electric-toothbrush': '⚡',
                  'kids': '👶',
                  'set': '🎁',
                };
                const icon = categoryIcons[category.slug] || '🦷';
                return (
                  <Link
                    key={category.id}
                    to={`/products?category=${category.slug}`}
                    className="card p-4 text-center hover:shadow-md transition group"
                  >
                    <div className="w-12 h-12 mx-auto mb-2 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition">
                      <span className="text-2xl">{icon}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{category.name}</p>
                    <p className="text-xs text-gray-500">{category.product_count}개 상품</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 추천 상품 섹션 */}
      <section className="py-12">
        <div className="container-custom">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">추천 상품</h2>
            <Link
              to="/products?featured=true"
              className="flex items-center gap-1 text-primary-600 hover:text-primary-700"
            >
              더보기 <ArrowRight size={18} />
            </Link>
          </div>

          {isFeaturedLoading ? (
            <ProductGridSkeleton count={4} />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {featuredProducts?.data?.data?.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 신상품 섹션 */}
      <section className="py-12">
        <div className="container-custom">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">신상품</h2>
            <Link
              to="/products?sort=newest"
              className="flex items-center gap-1 text-primary-600 hover:text-primary-700"
            >
              더보기 <ArrowRight size={18} />
            </Link>
          </div>

          {isNewLoading ? (
            <ProductGridSkeleton count={4} />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {newProducts?.data?.data?.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
