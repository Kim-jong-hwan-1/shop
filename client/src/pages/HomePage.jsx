import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
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
        <div className="container-custom py-8 md:py-12">
          <div className="grid md:grid-cols-[1fr_1.5fr] gap-2 items-center">
            {/* 왼쪽: 메인 타이틀 */}
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-3">
                사회적 가치를 만듭니다
              </h1>
              <p className="text-base md:text-lg text-primary-100 mb-6">
                덴탈 CAD 소프트웨어 전문 기업 DLAS가 운영하는
                <br />
                취약계층을 위한 구강케어 전문 사회적 쇼핑몰
              </p>
              <div className="flex gap-3 justify-center">
                <Link to="/products" className="btn bg-white text-primary-700 hover:bg-gray-100">
                  전체 상품 보기
                </Link>
                <Link to="/products?featured=true" className="btn btn-outline border-white text-white hover:bg-white/10">
                  베스트 상품
                </Link>
              </div>
            </div>

            {/* 오른쪽: 든든동행회원 혜택 */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-xl grid grid-cols-[1fr_220px]">
              <img
                src="/donghang.png"
                alt="든든동행회원 추가 30% 할인"
                className="w-full h-full object-cover"
              />
              <div className="p-6 bg-gradient-to-b from-yellow-50 to-white flex flex-col justify-center">
                <p className="text-gray-700 text-base mb-3 text-center font-semibold">
                  취약계층 고객님을 위한<br/>특별 할인 프로그램
                </p>
                <p className="text-gray-500 text-sm mb-4 text-center leading-relaxed">
                  기초생활수급자 · 차상위계층<br/>한부모가정 · 장애인<br/>국가유공자 · 다문화가정
                </p>
                <Link to="/mypage/ddcare" className="btn bg-primary-600 text-white hover:bg-primary-700 font-bold w-full py-3 text-base text-center block">
                  인증하기
                </Link>
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
