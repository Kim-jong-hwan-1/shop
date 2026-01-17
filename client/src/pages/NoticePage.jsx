import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, ChevronRight } from 'lucide-react';
import { noticeAPI } from '@/utils/api';
import { formatDate } from '@/utils/helpers';
import Pagination from '@/components/common/Pagination';
import { PageLoading } from '@/components/common/Loading';

export default function NoticePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page')) || 1;

  const { data, isLoading } = useQuery({
    queryKey: ['notices', page],
    queryFn: () => noticeAPI.getList({ page }),
  });

  if (isLoading) return <PageLoading />;

  const notices = data?.data?.data || [];
  const pagination = data?.data?.pagination || {};

  return (
    <div className="py-8">
      <div className="container-custom max-w-3xl">
        <h1 className="text-2xl font-bold mb-6">공지사항</h1>

        {notices.length > 0 ? (
          <div className="card divide-y">
            {notices.map((notice) => (
              <Link
                key={notice.id}
                to={`/notices/${notice.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {notice.is_important && (
                      <span className="badge badge-danger">중요</span>
                    )}
                    <span className="font-medium line-clamp-1">{notice.title}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{formatDate(notice.created_at)}</p>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Bell size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">공지사항이 없습니다.</p>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="mt-6">
            <Pagination
              pagination={pagination}
              onPageChange={(p) => setSearchParams({ page: String(p) })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
