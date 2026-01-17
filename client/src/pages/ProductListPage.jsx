import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, X } from 'lucide-react';
import { productAPI, categoryAPI } from '@/utils/api';
import ProductCard from '@/components/common/ProductCard';
import Pagination from '@/components/common/Pagination';
import { ProductGridSkeleton } from '@/components/common/Loading';

export default function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'newest';
  const page = parseInt(searchParams.get('page')) || 1;
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const featured = searchParams.get('featured') || '';

  // 상품 목록
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', { category, search, sort, page, minPrice, maxPrice, featured }],
    queryFn: () =>
      productAPI.getList({
        category,
        search,
        sort,
        page,
        limit: 12,
        minPrice,
        maxPrice,
        featured,
      }),
  });

  // 카테고리 목록
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryAPI.getList,
  });

  const products = productsData?.data?.data || [];
  const pagination = productsData?.data?.pagination || {};
  const categories = categoriesData?.data?.flatCategories || [];

  const updateParams = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (key !== 'page') {
      params.delete('page');
    }
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchParams({});
  };

  const hasFilters = category || minPrice || maxPrice || featured;

  const sortOptions = [
    { value: 'newest', label: '최신순' },
    { value: 'popular', label: '인기순' },
    { value: 'price_asc', label: '가격 낮은순' },
    { value: 'price_desc', label: '가격 높은순' },
    { value: 'name', label: '이름순' },
  ];

  return (
    <div className="py-8">
      <div className="container-custom">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {search ? `"${search}" 검색 결과` : category ? categories.find(c => c.slug === category)?.name || '상품 목록' : '전체 상품'}
          </h1>
          <p className="text-gray-600">총 {pagination.total || 0}개의 상품</p>
        </div>

        <div className="flex gap-8">
          {/* 사이드바 필터 (데스크톱) */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="card p-4 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">필터</h2>
                {hasFilters && (
                  <button onClick={clearFilters} className="text-sm text-primary-600 hover:underline">
                    초기화
                  </button>
                )}
              </div>

              {/* 카테고리 */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">카테고리</h3>
                <ul className="space-y-1">
                  <li>
                    <button
                      onClick={() => updateParams('category', '')}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm ${
                        !category ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      전체
                    </button>
                  </li>
                  {categories.map((cat) => (
                    <li key={cat.id}>
                      <button
                        onClick={() => updateParams('category', cat.slug)}
                        className={`w-full text-left px-2 py-1.5 rounded text-sm ${
                          category === cat.slug
                            ? 'bg-primary-100 text-primary-700'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        {cat.name} ({cat.product_count})
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 가격 범위 */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">가격</h3>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="최소"
                    value={minPrice}
                    onChange={(e) => updateParams('minPrice', e.target.value)}
                    className="input py-1.5 text-sm"
                  />
                  <span className="text-gray-400">~</span>
                  <input
                    type="number"
                    placeholder="최대"
                    value={maxPrice}
                    onChange={(e) => updateParams('maxPrice', e.target.value)}
                    className="input py-1.5 text-sm"
                  />
                </div>
              </div>

              {/* 추천 상품만 */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featured === 'true'}
                    onChange={(e) => updateParams('featured', e.target.checked ? 'true' : '')}
                  />
                  <span className="text-sm">추천 상품만 보기</span>
                </label>
              </div>
            </div>
          </aside>

          {/* 메인 콘텐츠 */}
          <div className="flex-1">
            {/* 상단 필터/정렬 바 */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b">
              <button
                onClick={() => setShowFilters(true)}
                className="lg:hidden btn btn-secondary btn-sm"
              >
                <SlidersHorizontal size={18} className="mr-1" />
                필터
              </button>

              <select
                value={sort}
                onChange={(e) => updateParams('sort', e.target.value)}
                className="input w-auto py-1.5"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 상품 그리드 */}
            {isLoading ? (
              <ProductGridSkeleton count={12} />
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* 페이지네이션 */}
                {pagination.totalPages > 1 && (
                  <div className="mt-8">
                    <Pagination
                      pagination={pagination}
                      onPageChange={(p) => updateParams('page', String(p))}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-500 text-lg">상품이 없습니다.</p>
                {hasFilters && (
                  <button onClick={clearFilters} className="btn btn-primary mt-4">
                    필터 초기화
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 모바일 필터 모달 */}
        {showFilters && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
            <div className="absolute right-0 top-0 bottom-0 w-80 bg-white p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">필터</h2>
                <button onClick={() => setShowFilters(false)}>
                  <X size={24} />
                </button>
              </div>

              {/* 모바일 필터 내용 (데스크톱과 동일) */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">카테고리</h3>
                <ul className="space-y-1">
                  {categories.map((cat) => (
                    <li key={cat.id}>
                      <button
                        onClick={() => {
                          updateParams('category', cat.slug);
                          setShowFilters(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded text-sm ${
                          category === cat.slug
                            ? 'bg-primary-100 text-primary-700'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        {cat.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => {
                    clearFilters();
                    setShowFilters(false);
                  }}
                  className="btn btn-secondary flex-1"
                >
                  초기화
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="btn btn-primary flex-1"
                >
                  적용
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
