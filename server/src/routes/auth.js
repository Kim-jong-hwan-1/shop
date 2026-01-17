const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middlewares/auth');
const { validatePassword, isValidEmail, isValidPhone } = require('../utils/helpers');

const router = express.Router();

// 회원가입
router.post('/register', [
  body('email').isEmail().withMessage('올바른 이메일 형식이 아닙니다.'),
  body('password').isLength({ min: 8 }).withMessage('비밀번호는 8자 이상이어야 합니다.'),
  body('name').notEmpty().withMessage('이름은 필수입니다.'),
  body('phone').optional().custom(value => {
    if (value && !isValidPhone(value)) {
      throw new Error('올바른 전화번호 형식이 아닙니다.');
    }
    return true;
  }),
  body('userType').optional().isIn(['buyer', 'seller']).withMessage('유효하지 않은 회원 유형입니다.'),
  body('businessName').optional().custom((value, { req }) => {
    if (req.body.userType === 'seller' && !value) {
      throw new Error('판매자는 상호명을 입력해야 합니다.');
    }
    return true;
  }),
  body('businessNumber').optional().custom((value, { req }) => {
    if (req.body.userType === 'seller' && !value) {
      throw new Error('판매자는 사업자등록번호를 입력해야 합니다.');
    }
    return true;
  }),
  body('agreeTerms').equals('true').withMessage('이용약관에 동의해야 합니다.'),
  body('agreePrivacy').equals('true').withMessage('개인정보 처리방침에 동의해야 합니다.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, phone, birthDate, gender, zipcode, address, addressDetail, marketingAgree, emailAgree, smsAgree, userType, businessName, businessNumber } = req.body;

    // 비밀번호 강도 검사
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.errors[0] });
    }

    // 이메일 중복 체크
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: '이미 사용 중인 이메일입니다.' });
    }

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(password, 10);

    // 판매자 여부에 따른 처리
    const isSeller = userType === 'seller';
    const sellerStatus = isSeller ? 'pending' : null;

    // 사용자 생성
    const result = db.prepare(`
      INSERT INTO users (email, password, name, phone, birth_date, gender, zipcode, address, address_detail, marketing_agree, email_agree, sms_agree, point, seller_business_name, seller_business_number, seller_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      email,
      hashedPassword,
      name,
      phone || null,
      birthDate || null,
      gender || null,
      zipcode || null,
      address || null,
      addressDetail || null,
      marketingAgree ? 1 : 0,
      emailAgree ? 1 : 0,
      smsAgree ? 1 : 0,
      1000, // 신규 가입 포인트
      isSeller ? businessName : null,
      isSeller ? businessNumber : null,
      sellerStatus
    );

    // 신규 가입 포인트 기록
    db.prepare(`
      INSERT INTO point_history (user_id, amount, type, description, balance_after)
      VALUES (?, ?, ?, ?, ?)
    `).run(result.lastInsertRowid, 1000, 'earn', '신규 회원가입 축하 포인트', 1000);

    // JWT 토큰 생성
    const token = jwt.sign(
      { userId: result.lastInsertRowid },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: isSeller
        ? '회원가입이 완료되었습니다. 판매자 승인 후 상품 등록이 가능합니다.'
        : '회원가입이 완료되었습니다.',
      token,
      user: {
        id: result.lastInsertRowid,
        email,
        name,
        point: 1000,
        seller_status: sellerStatus,
        seller_business_name: isSeller ? businessName : null
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: '회원가입 처리 중 오류가 발생했습니다.' });
  }
});

// 로그인
router.post('/login', [
  body('email').isEmail().withMessage('올바른 이메일 형식이 아닙니다.'),
  body('password').notEmpty().withMessage('비밀번호를 입력해주세요.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // 사용자 조회
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    // 계정 활성화 체크
    if (!user.is_active) {
      return res.status(403).json({ error: '비활성화된 계정입니다. 고객센터에 문의해주세요.' });
    }

    // 비밀번호 검증
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    // 마지막 로그인 시간 업데이트
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

    // JWT 토큰 생성
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: '로그인 성공',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        point: user.point,
        seller_status: user.seller_status,
        seller_business_name: user.seller_business_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
  }
});

// 이메일 중복 체크
router.get('/check-email', [
  body('email').isEmail().withMessage('올바른 이메일 형식이 아닙니다.')
], (req, res) => {
  try {
    const { email } = req.query;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: '올바른 이메일 형식이 아닙니다.' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

    res.json({ available: !existingUser });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ error: '이메일 확인 중 오류가 발생했습니다.' });
  }
});

// 현재 사용자 정보 조회
router.get('/me', authenticate, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, email, name, phone, birth_date, gender, zipcode, address, address_detail,
             role, marketing_agree, email_agree, sms_agree, point, created_at, last_login,
             seller_status, seller_business_name, seller_business_number, seller_approved_at
      FROM users WHERE id = ?
    `).get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: '사용자 정보 조회 중 오류가 발생했습니다.' });
  }
});

// 비밀번호 변경
router.put('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('현재 비밀번호를 입력해주세요.'),
  body('newPassword').isLength({ min: 8 }).withMessage('새 비밀번호는 8자 이상이어야 합니다.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    // 비밀번호 강도 검사
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.errors[0] });
    }

    // 현재 사용자 조회
    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);

    // 현재 비밀번호 검증
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: '현재 비밀번호가 올바르지 않습니다.' });
    }

    // 새 비밀번호 해시
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 비밀번호 업데이트
    db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(hashedPassword, req.user.id);

    res.json({ message: '비밀번호가 변경되었습니다.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: '비밀번호 변경 중 오류가 발생했습니다.' });
  }
});

// 토큰 갱신
router.post('/refresh', authenticate, (req, res) => {
  try {
    const token = jwt.sign(
      { userId: req.user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({ token });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: '토큰 갱신 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
