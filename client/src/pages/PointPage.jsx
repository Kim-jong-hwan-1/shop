import { useQuery } from '@tanstack/react-query';
import { userAPI } from '@/utils/api';
import { formatPrice, formatDate } from '@/utils/helpers';
import Pagination from '@/components/common/Pagination';
import { PageLoading } from '@/components/common/Loading';
import { useState } from 'react';

export default function PointPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['points', page],
    queryFn: () => userAPI.getPoints({ page }),
  });

  if (isLoading) return <PageLoading />;

  const history = data?.data?.data || [];
  const pagination = data?.data?.pagination || {};
  const currentPoint = data?.data?.currentPoint || 0;

  return (
    <div className="py-8">
      <div className="container-custom max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">포인트</h1>

        <div className="card p-6 mb-6 text-center">
          <p className="text-gray-500 mb-2">보유 포인트</p>
          <p className="text-4xl font-bold text-primary-600">{formatPrice(currentPoint)}P</p>
        </div>

        <div className="card">
          <h2 className="font-bold p-4 border-b">포인트 내역</h2>
          {history.length > 0 ? (
            <ul className="divide-y">
              {history.map((item) => (
                <li key={item.id} className="p-4 flex justify-between">
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-sm text-gray-500">{formatDate(item.created_at, 'YYYY.MM.DD HH:mm')}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${item.amount > 0 ? 'text-primary-600' : 'text-red-500'}`}>
                      {item.amount > 0 ? '+' : ''}{formatPrice(item.amount)}P
                    </p>
                    <p className="text-sm text-gray-500">잔액: {formatPrice(item.balance_after)}P</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center py-8 text-gray-500">포인트 내역이 없습니다.</p>
          )}
        </div>

        {pagination.totalPages > 1 && (
          <div className="mt-6">
            <Pagination pagination={pagination} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
