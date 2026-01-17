import dayjs from 'dayjs';
import 'dayjs/locale/ko';

dayjs.locale('ko');

// 가격 포맷
export const formatPrice = (price) => {
  if (price === null || price === undefined) return '0';
  return new Intl.NumberFormat('ko-KR').format(price);
};

// 날짜 포맷
export const formatDate = (date, format = 'YYYY.MM.DD') => {
  if (!date) return '';
  return dayjs(date).format(format);
};

// 상대 시간
export const formatRelativeTime = (date) => {
  if (!date) return '';
  const now = dayjs();
  const target = dayjs(date);
  const diffMinutes = now.diff(target, 'minute');
  const diffHours = now.diff(target, 'hour');
  const diffDays = now.diff(target, 'day');

  if (diffMinutes < 1) return '방금 전';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return formatDate(date);
};

// 주문 상태 텍스트
export const getOrderStatusText = (status) => {
  const statusMap = {
    pending: '결제 대기',
    paid: '결제 완료',
    preparing: '상품 준비중',
    shipped: '배송중',
    delivered: '배송 완료',
    completed: '구매 확정',
    cancelled: '주문 취소',
    refunded: '환불 완료',
  };
  return statusMap[status] || status;
};

// 주문 상태 배지 색상
export const getOrderStatusColor = (status) => {
  const colorMap = {
    pending: 'badge-warning',
    paid: 'badge-primary',
    preparing: 'badge-primary',
    shipped: 'badge-primary',
    delivered: 'badge-success',
    completed: 'badge-success',
    cancelled: 'badge-gray',
    refunded: 'badge-danger',
  };
  return colorMap[status] || 'badge-gray';
};

// 전화번호 포맷
export const formatPhone = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  }
  return phone;
};

// 할인율 계산
export const calcDiscountRate = (price, salePrice) => {
  if (!salePrice || salePrice >= price) return 0;
  return Math.round((1 - salePrice / price) * 100);
};

// 배송비 계산
export const calcShippingFee = (totalAmount, threshold = 30000) => {
  return totalAmount >= threshold ? 0 : 2500;
};

// 든든케어 할인율 (30%)
export const DDCARE_DISCOUNT_RATE = 0.30;

// 든든케어 할인가 계산
export const calcDdcarePrice = (price, isDdcareMember = false) => {
  if (!isDdcareMember) return price;
  return Math.floor(price * (1 - DDCARE_DISCOUNT_RATE));
};

// 든든케어 할인 금액 계산
export const calcDdcareDiscount = (price, isDdcareMember = false) => {
  if (!isDdcareMember) return 0;
  return price - calcDdcarePrice(price, isDdcareMember);
};

// 든든케어 상태 텍스트
export const getDdcareStatusText = (status) => {
  const statusMap = {
    pending: '심사 중',
    approved: '승인됨',
    rejected: '거절됨',
    expired: '만료됨',
  };
  return statusMap[status] || status || '미신청';
};

// 든든케어 상태 배지 색상
export const getDdcareStatusColor = (status) => {
  const colorMap = {
    pending: 'badge-warning',
    approved: 'badge-success',
    rejected: 'badge-danger',
    expired: 'badge-gray',
  };
  return colorMap[status] || 'badge-gray';
};

// 든든케어 유형 텍스트
export const getDdcareTypeName = (type) => {
  const typeMap = {
    BASIC_LIVELIHOOD: '기초생활수급자',
    SECOND_CLASS: '차상위계층',
    SINGLE_PARENT: '한부모가정',
    DISABLED: '장애인',
    NATIONAL_MERIT: '국가유공자',
    MULTICULTURAL: '다문화가정',
  };
  return typeMap[type] || type || '-';
};

// 이름 마스킹
export const maskName = (name) => {
  if (!name || name.length < 2) return name;
  if (name.length === 2) return name[0] + '*';
  return name[0] + '*'.repeat(name.length - 2) + name.slice(-1);
};

// 이메일 마스킹
export const maskEmail = (email) => {
  if (!email) return '';
  const [id, domain] = email.split('@');
  if (id.length <= 3) return id[0] + '**@' + domain;
  return id.slice(0, 3) + '***@' + domain;
};

// 유효성 검사
export const validators = {
  email: (value) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(value) || '올바른 이메일 형식이 아닙니다.';
  },
  phone: (value) => {
    if (!value) return true;
    const regex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
    return regex.test(value.replace(/-/g, '')) || '올바른 전화번호 형식이 아닙니다.';
  },
  password: (value) => {
    if (value.length < 8) return '비밀번호는 8자 이상이어야 합니다.';
    if (!/[a-zA-Z]/.test(value)) return '비밀번호에 영문자가 포함되어야 합니다.';
    if (!/[0-9]/.test(value)) return '비밀번호에 숫자가 포함되어야 합니다.';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return '비밀번호에 특수문자가 포함되어야 합니다.';
    return true;
  },
  required: (value) => {
    return !!value || '필수 입력 항목입니다.';
  },
};

// 스크롤 맨 위로
export const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// URL 쿼리 파라미터 파싱
export const parseQueryString = (search) => {
  const params = new URLSearchParams(search);
  const result = {};
  for (const [key, value] of params) {
    result[key] = value;
  }
  return result;
};

// 이미지 URL 처리
export const getImageUrl = (url) => {
  if (!url) return '/placeholder.png';
  if (url.startsWith('http')) return url;
  return url;
};
