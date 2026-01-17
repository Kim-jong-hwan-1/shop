const jwt = require('jsonwebtoken');
const db = require('../config/database');

// 든든케어 할인율
const DDCARE_DISCOUNT_RATE = 0.30;

// 든든케어 상태 확인 함수
const checkDdcareStatus = (user) => {
  if (user.ddcare_status !== 'approved') {
    return { isDdcareMember: false, ddcareDiscountRate: 0 };
  }

  // 만료 여부 확인
  if (user.ddcare_expires_at) {
    const expiresAt = new Date(user.ddcare_expires_at);
    if (expiresAt < new Date()) {
      // 만료됨
      db.prepare('UPDATE users SET ddcare_status = ? WHERE id = ?').run('expired', user.id);
      return { isDdcareMember: false, ddcareDiscountRate: 0 };
    }
  }

  return { isDdcareMember: true, ddcareDiscountRate: DDCARE_DISCOUNT_RATE };
};

// JWT 인증 미들웨어
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '인증 토큰이 필요합니다.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 사용자 존재 여부 확인 (ddcare, seller 정보 포함)
    const user = db.prepare(`
      SELECT id, email, name, role, is_active, ddcare_status, ddcare_type, ddcare_expires_at,
             seller_status, seller_business_name, seller_business_number, seller_approved_at
      FROM users WHERE id = ?
    `).get(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: '비활성화된 계정입니다.' });
    }

    // 든든케어 상태 확인 및 추가
    const ddcareInfo = checkDdcareStatus(user);
    req.user = {
      ...user,
      ...ddcareInfo
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '토큰이 만료되었습니다.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
    }
    return res.status(500).json({ error: '인증 처리 중 오류가 발생했습니다.' });
  }
};

// 선택적 인증 (로그인 안해도 접근 가능)
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = db.prepare(`
      SELECT id, email, name, role, is_active, ddcare_status, ddcare_type, ddcare_expires_at,
             seller_status, seller_business_name, seller_business_number, seller_approved_at
      FROM users WHERE id = ?
    `).get(decoded.userId);

    if (user && user.is_active) {
      const ddcareInfo = checkDdcareStatus(user);
      req.user = {
        ...user,
        ...ddcareInfo
      };
    }

    next();
  } catch (error) {
    // 토큰이 유효하지 않아도 진행
    next();
  }
};

// 관리자 권한 체크
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  }

  next();
};

// 승인된 판매자 권한 체크
const isSeller = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }

  // 판매자 상태 확인 (승인된 판매자만)
  if (req.user.seller_status !== 'approved') {
    return res.status(403).json({ error: '승인된 판매자만 접근할 수 있습니다.' });
  }

  next();
};

// 판매자 본인 또는 관리자 권한 체크
const isSellerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }

  // 관리자이거나 승인된 판매자인 경우 허용
  if (req.user.role === 'admin' || req.user.seller_status === 'approved') {
    return next();
  }

  return res.status(403).json({ error: '권한이 없습니다.' });
};

module.exports = { authenticate, optionalAuth, isAdmin, isSeller, isSellerOrAdmin, DDCARE_DISCOUNT_RATE };
