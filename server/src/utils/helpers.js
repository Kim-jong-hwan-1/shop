const crypto = require('crypto');

// 주문번호 생성
const generateOrderNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `ORD${dateStr}${random}`;
};

// 슬러그 생성
const generateSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

// 페이지네이션 헬퍼
const paginate = (page = 1, limit = 10) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  return { page: pageNum, limit: limitNum, offset };
};

// 페이지네이션 응답 포맷
const paginatedResponse = (data, total, page, limit) => {
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  };
};

// 가격 포맷
const formatPrice = (price) => {
  return new Intl.NumberFormat('ko-KR').format(price);
};

// 날짜 포맷
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// 이메일 유효성 검사
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 전화번호 유효성 검사
const isValidPhone = (phone) => {
  const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
  return phoneRegex.test(phone.replace(/-/g, ''));
};

// 비밀번호 강도 검사
const validatePassword = (password) => {
  const errors = [];

  if (password.length < 8) {
    errors.push('비밀번호는 8자 이상이어야 합니다.');
  }
  if (!/[a-zA-Z]/.test(password)) {
    errors.push('비밀번호에 영문자가 포함되어야 합니다.');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('비밀번호에 숫자가 포함되어야 합니다.');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('비밀번호에 특수문자가 포함되어야 합니다.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// XSS 방지를 위한 HTML 이스케이프
const escapeHtml = (text) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

// 포인트 적립률 계산 (구매금액의 1%)
const calculatePoints = (amount) => {
  return Math.floor(amount * 0.01);
};

// 배송비 계산
const calculateShippingFee = (totalAmount, freeShippingThreshold = 30000) => {
  return totalAmount >= freeShippingThreshold ? 0 : 2500;
};

module.exports = {
  generateOrderNumber,
  generateSlug,
  paginate,
  paginatedResponse,
  formatPrice,
  formatDate,
  isValidEmail,
  isValidPhone,
  validatePassword,
  escapeHtml,
  calculatePoints,
  calculateShippingFee
};
