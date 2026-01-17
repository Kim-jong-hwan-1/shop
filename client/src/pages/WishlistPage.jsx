import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { wishlistAPI } from '@/utils/api';
import ProductCard from '@/components/common/ProductCard';
import { ProductGridSkeleton } from '@/components/common/Loading';

export default function WishlistPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => wishlistAPI.getList({ limit: 100 }),
  });

  const items = data?.data?.data || [];

  if (isLoading) return <ProductGridSkeleton count={8} />;

  return (
    <div className="py-8">
      <div className="container-custom">
        <h1 className="text-2xl font-bold mb-6">위시리스트</h1>

        {items.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {items.map((item) => (
              <ProductCard
                key={item.id}
                product={{
                  ...item,
                  id: item.product_id,
                  isWishlisted: true,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Heart size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">위시리스트가 비어있습니다.</p>
            <Link to="/products" className="btn btn-primary">
              상품 둘러보기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
