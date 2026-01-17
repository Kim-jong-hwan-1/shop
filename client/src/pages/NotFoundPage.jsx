import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[500px] flex items-center justify-center py-16">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-gray-200">404</h1>
        <h2 className="text-2xl font-bold text-gray-900 mt-4 mb-2">
          페이지를 찾을 수 없습니다
        </h2>
        <p className="text-gray-500 mb-8">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/" className="btn btn-primary">
            <Home size={18} className="mr-2" />
            홈으로 가기
          </Link>
          <Link to="/products" className="btn btn-secondary">
            <Search size={18} className="mr-2" />
            상품 둘러보기
          </Link>
        </div>
      </div>
    </div>
  );
}
