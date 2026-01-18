import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* 회사 정보 */}
          <div className="md:col-span-2">
            <h2 className="text-3xl text-white mb-4" style={{ fontFamily: 'Cute Font, sans-serif' }}>DLAS 케어 샵</h2>
            <div className="text-sm space-y-1">
              <p>상호명: DLAS | 대표: 김종환</p>
              <p>사업자등록번호: 753-06-03175</p>
              <p>통신판매업신고: 제2025-대전서구-1033호</p>
              <p>주소: 인천시 서구 청라동 202-3번지 청라더리브티아모지식산업센터 지원동 543호</p>
              <p>이메일: support@dlas.io</p>
              <p>고객센터: 032-212-2882, 2885, 2887 (팩스: 032-212-2883)</p>
            </div>
          </div>

          {/* 고객 서비스 */}
          <div>
            <h3 className="text-white font-semibold mb-4">고객 서비스</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/notices" className="hover:text-white transition">
                  공지사항
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-white transition">
                  자주 묻는 질문
                </Link>
              </li>
              <li>
                <Link to="/mypage/inquiries" className="hover:text-white transition">
                  1:1 문의
                </Link>
              </li>
              <li>
                <Link to="/mypage/orders" className="hover:text-white transition">
                  주문 조회
                </Link>
              </li>
            </ul>
          </div>

          {/* 이용 안내 */}
          <div>
            <h3 className="text-white font-semibold mb-4">이용 안내</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/terms/service" className="hover:text-white transition">
                  이용약관
                </Link>
              </li>
              <li>
                <Link to="/terms/privacy" className="hover:text-white transition">
                  개인정보처리방침
                </Link>
              </li>
              <li>
                <Link to="/terms/refund" className="hover:text-white transition">
                  교환/반품 안내
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* 결제 수단 */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="text-sm">
            <p className="text-gray-500 mb-2">결제 수단</p>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-gray-800 rounded text-xs">신용카드</span>
              <span className="px-2 py-1 bg-gray-800 rounded text-xs">계좌이체</span>
              <span className="px-2 py-1 bg-gray-800 rounded text-xs">카카오페이</span>
              <span className="px-2 py-1 bg-gray-800 rounded text-xs">네이버페이</span>
              <span className="px-2 py-1 bg-gray-800 rounded text-xs">토스페이</span>
            </div>
          </div>
        </div>

        {/* 저작권 */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} DLAS. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
