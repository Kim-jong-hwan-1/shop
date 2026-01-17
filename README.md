# 오랄케어샵 - 구강용품 전문 쇼핑몰

구강용품을 판매하는 풀스택 이커머스 웹 애플리케이션입니다.

## 기술 스택

### 백엔드
- **Node.js + Express.js** - 서버 프레임워크
- **SQLite (better-sqlite3)** - 데이터베이스
- **JWT** - 인증
- **bcrypt** - 비밀번호 암호화
- **multer** - 파일 업로드

### 프론트엔드
- **React 18** - UI 라이브러리
- **Vite** - 빌드 도구
- **TailwindCSS** - 스타일링
- **React Router** - 라우팅
- **TanStack Query** - 서버 상태 관리
- **Zustand** - 클라이언트 상태 관리
- **React Hook Form** - 폼 관리
- **토스페이먼츠 SDK** - 결제 연동

## 주요 기능

### 사용자
- 회원가입/로그인 (JWT 인증)
- 상품 검색 및 카테고리별 필터링
- 장바구니
- 주문 및 결제 (토스페이먼츠)
- 주문 내역 조회
- 리뷰 작성 및 관리
- 위시리스트
- 포인트 적립/사용
- 쿠폰 등록/사용
- 1:1 문의

### 관리자
- 대시보드 (주문/매출 통계)
- 상품 관리 (CRUD)
- 카테고리 관리
- 주문 관리 (상태 변경, 운송장 입력)
- 회원 관리
- 문의 답변
- 쿠폰 관리
- 공지사항 관리

## 시작하기

### 1. 저장소 클론
\`\`\`bash
cd oral-care-shop
\`\`\`

### 2. 서버 설정
\`\`\`bash
cd server
npm install
npm run init-db  # 데이터베이스 초기화
npm run dev      # 개발 서버 시작 (포트 5000)
\`\`\`

### 3. 클라이언트 설정
\`\`\`bash
cd client
npm install
npm run dev      # 개발 서버 시작 (포트 3000)
\`\`\`

### 4. 접속
- 프론트엔드: http://localhost:3000
- 백엔드 API: http://localhost:5000/api

## 테스트 계정

### 관리자
- 이메일: admin@oralcare.com
- 비밀번호: admin123!

## 환경 변수

서버 환경 변수 (.env):
\`\`\`
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
DB_PATH=./database.sqlite
CLIENT_URL=http://localhost:3000
TOSS_CLIENT_KEY=your-toss-client-key
TOSS_SECRET_KEY=your-toss-secret-key
\`\`\`

## API 엔드포인트

### 인증
- POST /api/auth/register - 회원가입
- POST /api/auth/login - 로그인
- GET /api/auth/me - 내 정보 조회
- PUT /api/auth/change-password - 비밀번호 변경

### 상품
- GET /api/products - 상품 목록
- GET /api/products/:id - 상품 상세
- GET /api/products/:id/reviews - 상품 리뷰

### 카테고리
- GET /api/categories - 카테고리 목록

### 장바구니
- GET /api/cart - 장바구니 조회
- POST /api/cart - 장바구니 추가
- PUT /api/cart/:id - 수량 변경
- DELETE /api/cart/:id - 삭제

### 주문
- GET /api/orders - 주문 목록
- GET /api/orders/:orderNumber - 주문 상세
- POST /api/orders - 주문 생성
- POST /api/orders/:orderNumber/cancel - 주문 취소
- POST /api/orders/:orderNumber/confirm - 구매 확정

### 결제
- POST /api/payments/confirm - 결제 승인
- POST /api/payments/cancel - 결제 취소

## 법적 문서

이 프로젝트에는 다음 법적 문서가 포함되어 있습니다:
- 이용약관 (전자상거래법 준수)
- 개인정보처리방침 (개인정보보호법 준수)
- 마케팅 정보 수신 동의

## 라이선스

이 프로젝트는 개인 학습 및 포트폴리오 목적으로 제작되었습니다.
