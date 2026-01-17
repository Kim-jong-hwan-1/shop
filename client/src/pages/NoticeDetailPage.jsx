import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { noticeAPI } from '@/utils/api';
import { formatDate } from '@/utils/helpers';
import { PageLoading } from '@/components/common/Loading';

export default function NoticeDetailPage() {
  const { id } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ['notice', id],
    queryFn: () => noticeAPI.getDetail(id),
  });

  if (isLoading) return <PageLoading />;
  if (!data?.data?.notice) return <div className="container-custom py-16 text-center">공지사항을 찾을 수 없습니다.</div>;

  const { notice, prevNotice, nextNotice } = data.data;

  return (
    <div className="py-8">
      <div className="container-custom max-w-3xl">
        <div className="mb-6">
          <Link to="/notices" className="text-primary-600 hover:underline flex items-center gap-1">
            <ChevronLeft size={18} /> 목록으로
          </Link>
        </div>

        <div className="card p-6">
          <div className="mb-4">
            {notice.is_important && <span className="badge badge-danger mr-2">중요</span>}
            <span className="text-sm text-gray-500">{formatDate(notice.created_at)}</span>
          </div>
          <h1 className="text-2xl font-bold mb-6">{notice.title}</h1>
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: notice.content.replace(/\n/g, '<br/>') }} />
        </div>

        {/* 이전/다음 글 */}
        <div className="flex border-t border-b mt-6 divide-x">
          {prevNotice ? (
            <Link to={`/notices/${prevNotice.id}`} className="flex-1 p-4 hover:bg-gray-50">
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <ChevronLeft size={16} /> 이전 글
              </p>
              <p className="line-clamp-1">{prevNotice.title}</p>
            </Link>
          ) : (
            <div className="flex-1 p-4 text-gray-400">이전 글이 없습니다.</div>
          )}
          {nextNotice ? (
            <Link to={`/notices/${nextNotice.id}`} className="flex-1 p-4 hover:bg-gray-50 text-right">
              <p className="text-sm text-gray-500 flex items-center justify-end gap-1">
                다음 글 <ChevronRight size={16} />
              </p>
              <p className="line-clamp-1">{nextNotice.title}</p>
            </Link>
          ) : (
            <div className="flex-1 p-4 text-gray-400 text-right">다음 글이 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}
