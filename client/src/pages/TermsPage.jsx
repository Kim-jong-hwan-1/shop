import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { termsAPI } from '@/utils/api';
import { formatDate } from '@/utils/helpers';
import { PageLoading } from '@/components/common/Loading';

export default function TermsPage() {
  const { type } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ['terms', type],
    queryFn: () => termsAPI.getDetail(type),
  });

  if (isLoading) return <PageLoading />;

  const term = data?.data?.term;

  if (!term) {
    return (
      <div className="container-custom py-16 text-center">
        <p className="text-gray-500">약관을 찾을 수 없습니다.</p>
        <Link to="/" className="btn btn-primary mt-4">
          홈으로
        </Link>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="container-custom max-w-3xl">
        <h1 className="text-2xl font-bold mb-2">{term.title}</h1>
        <p className="text-sm text-gray-500 mb-6">
          시행일: {formatDate(term.effective_date)} | 버전: {term.version}
        </p>

        <div className="card p-6">
          <div
            className="prose max-w-none text-gray-700 whitespace-pre-wrap"
            style={{ fontSize: '14px', lineHeight: '1.8' }}
          >
            {term.content}
          </div>
        </div>

        {/* 다른 약관 링크 */}
        <div className="mt-6 flex gap-4">
          {type !== 'service' && (
            <Link to="/terms/service" className="text-primary-600 hover:underline text-sm">
              이용약관 보기
            </Link>
          )}
          {type !== 'privacy' && (
            <Link to="/terms/privacy" className="text-primary-600 hover:underline text-sm">
              개인정보처리방침 보기
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
