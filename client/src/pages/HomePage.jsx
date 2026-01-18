import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, X, Search, MapPin, ExternalLink } from 'lucide-react';
import { productAPI, categoryAPI } from '@/utils/api';
import ProductCard from '@/components/common/ProductCard';
import { ProductGridSkeleton } from '@/components/common/Loading';

const heroSlides = [
  {
    image: '/donghang.png',
    alt: '든든동행회원 추가 30% 할인',
    title: '취약계층 고객님을 위한',
    subtitle: '특별 할인 프로그램',
    description: '기초생활수급자 · 차상위계층\n한부모가정 · 장애인\n국가유공자 · 다문화가정',
    link: '/mypage/ddcare',
    buttonText: '인증하기',
    type: 'ddcare',
  },
  {
    image: '/hanmaum.png',
    alt: '한마음의료바우처',
    title: '한마음의료바우처',
    subtitle: '제휴 치과 안내',
    description: '한마음의료바우처를\n사용할 수 있는\n치과를 찾아보세요',
    type: 'hanmaum',
  },
];

// 지역 데이터
const regions = [
  { id: 'seoul', name: '서울' },
  { id: 'gyeonggi', name: '경기' },
  { id: 'incheon', name: '인천' },
  { id: 'gangwon', name: '강원' },
  { id: 'sejong', name: '세종' },
  { id: 'daejeon', name: '대전' },
  { id: 'chungbuk', name: '충북' },
  { id: 'chungnam', name: '충남' },
  { id: 'gwangju', name: '광주' },
  { id: 'jeonbuk', name: '전북' },
  { id: 'jeonnam', name: '전남' },
  { id: 'daegu', name: '대구' },
  { id: 'gyeongbuk', name: '경북' },
  { id: 'gyeongnam', name: '경남' },
  { id: 'busan', name: '부산' },
  { id: 'ulsan', name: '울산' },
  { id: 'jeju', name: '제주' },
];

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isClinicModalOpen, setIsClinicModalOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [searchAddress, setSearchAddress] = useState('');

  // 자동 슬라이드
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const handleRegionClick = (region) => {
    setSelectedRegion(region);
  };

  const handleSearchClinic = () => {
    // 한마음의료바우처 사이트로 검색 결과 연결
    const query = selectedRegion ? selectedRegion.name : searchAddress;
    if (query) {
      window.open(`https://www.hmcs.or.kr/front/member/orgSearch.do?searchKeyword=${encodeURIComponent(query + ' 치과')}`, '_blank');
    }
  };
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
                건강한 구강을 위한
                <br />
                최고의 선택
              </h1>
              <p className="text-base md:text-lg text-primary-100 mb-6">
                엄선된 프리미엄 구강케어 제품을
                <br />
                합리적인 가격으로 만나보세요
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

            {/* 오른쪽: 슬라이드 배너 */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-xl">
              <div className="grid grid-cols-[1fr_220px]">
                <div className="relative overflow-hidden">
                  {heroSlides.map((slide, index) => (
                    <img
                      key={index}
                      src={slide.image}
                      alt={slide.alt}
                      className={`w-full h-full object-cover object-top absolute inset-0 transition-opacity duration-500 ${
                        index === currentSlide ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  ))}
                  <img
                    src={heroSlides[0].image}
                    alt=""
                    className="w-full h-full object-cover object-top invisible"
                  />
                </div>
                <div className="p-6 bg-gradient-to-b from-yellow-50 to-white flex flex-col justify-center">
                  <p className="text-gray-700 text-base mb-1 text-center font-semibold">
                    {heroSlides[currentSlide].title}
                  </p>
                  <p className="text-gray-700 text-base mb-3 text-center font-semibold">
                    {heroSlides[currentSlide].subtitle}
                  </p>
                  <p className="text-gray-500 text-sm mb-4 text-center leading-relaxed whitespace-pre-line">
                    {heroSlides[currentSlide].description}
                  </p>
                  {heroSlides[currentSlide].type === 'ddcare' ? (
                    <Link to={heroSlides[currentSlide].link} className="btn bg-primary-600 text-white hover:bg-primary-700 font-bold w-full py-3 text-base text-center block">
                      {heroSlides[currentSlide].buttonText}
                    </Link>
                  ) : (
                    <div className="space-y-2">
                      <a
                        href="https://www.hmcs.or.kr/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium w-full py-2.5 text-sm text-center flex items-center justify-center gap-1"
                      >
                        자세히 알아보기 <ExternalLink size={14} />
                      </a>
                      <button
                        onClick={() => setIsClinicModalOpen(true)}
                        className="btn bg-primary-600 text-white hover:bg-primary-700 font-bold w-full py-2.5 text-sm text-center"
                      >
                        사용가능 치과 찾기
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {/* 슬라이드 인디케이터 */}
              <div className="flex justify-center gap-2 py-3 bg-gray-50">
                {heroSlides.map((_, index) => (
                  <button
                    key={index}
                    onMouseEnter={() => {
                      setIsPaused(true);
                      setCurrentSlide(index);
                    }}
                    onMouseLeave={() => setIsPaused(false)}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      index === currentSlide
                        ? 'bg-primary-600 w-6'
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
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

      {/* 치과 찾기 모달 */}
      {isClinicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setIsClinicModalOpen(false);
              setSelectedRegion(null);
              setSearchAddress('');
            }}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* 모달 헤더 */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">한마음의료바우처 사용가능 치과 찾기</h3>
                  <p className="text-primary-100 text-sm mt-1">지역을 선택하거나 주소를 검색하세요</p>
                </div>
                <button
                  onClick={() => {
                    setIsClinicModalOpen(false);
                    setSelectedRegion(null);
                    setSearchAddress('');
                  }}
                  className="p-2 hover:bg-white/20 rounded-full transition"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* 모달 본문 */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* 주소 검색 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Search size={16} className="inline mr-1" />
                  주소로 검색
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchAddress}
                    onChange={(e) => {
                      setSearchAddress(e.target.value);
                      setSelectedRegion(null);
                    }}
                    placeholder="예: 서울시 강남구, 인천시 서구..."
                    className="input flex-1"
                  />
                  <button
                    onClick={handleSearchClinic}
                    disabled={!searchAddress && !selectedRegion}
                    className="btn btn-primary px-6"
                  >
                    검색
                  </button>
                </div>
              </div>

              {/* 지역 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <MapPin size={16} className="inline mr-1" />
                  지역 선택
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                  {regions.map((region) => (
                    <button
                      key={region.id}
                      onClick={() => handleRegionClick(region)}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        selectedRegion?.id === region.id
                          ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-md'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:bg-primary-50'
                      }`}
                    >
                      {region.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 선택된 지역 표시 */}
              {selectedRegion && (
                <div className="mt-4 p-4 bg-primary-50 rounded-xl border border-primary-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin size={20} className="text-primary-600" />
                      <span className="font-semibold text-primary-800">
                        {selectedRegion.name} 지역 선택됨
                      </span>
                    </div>
                    <button
                      onClick={handleSearchClinic}
                      className="btn btn-primary"
                    >
                      이 지역 치과 검색
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="border-t bg-gray-50 p-4">
              <p className="text-xs text-gray-500 text-center">
                검색 결과는 한마음의료바우처 공식 사이트에서 확인하실 수 있습니다
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
