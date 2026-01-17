const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middlewares/auth');
const { isValidPhone, paginate, paginatedResponse } = require('../utils/helpers');

const router = express.Router();

// 회원정보 수정
router.put('/profile', authenticate, [
  body('name').optional().notEmpty().withMessage('이름은 비워둘 수 없습니다.'),
  body('phone').optional().custom(value => {
    if (value && !isValidPhone(value)) {
      throw new Error('올바른 전화번호 형식이 아닙니다.');
    }
    return true;
  })
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone, birthDate, gender, zipcode, address, addressDetail, marketingAgree, emailAgree, smsAgree } = req.body;

    db.prepare(`
      UPDATE users SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        birth_date = COALESCE(?, birth_date),
        gender = COALESCE(?, gender),
        zipcode = COALESCE(?, zipcode),
        address = COALESCE(?, address),
        address_detail = COALESCE(?, address_detail),
        marketing_agree = COALESCE(?, marketing_agree),
        email_agree = COALESCE(?, email_agree),
        sms_agree = COALESCE(?, sms_agree),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name || null,
      phone || null,
      birthDate || null,
      gender || null,
      zipcode || null,
      address || null,
      addressDetail || null,
      marketingAgree !== undefined ? (marketingAgree ? 1 : 0) : null,
      emailAgree !== undefined ? (emailAgree ? 1 : 0) : null,
      smsAgree !== undefined ? (smsAgree ? 1 : 0) : null,
      req.user.id
    );

    const updatedUser = db.prepare(`
      SELECT id, email, name, phone, birth_date, gender, zipcode, address, address_detail,
             marketing_agree, email_agree, sms_agree, point
      FROM users WHERE id = ?
    `).get(req.user.id);

    res.json({ message: '회원정보가 수정되었습니다.', user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: '회원정보 수정 중 오류가 발생했습니다.' });
  }
});

// 회원 탈퇴
router.delete('/withdraw', authenticate, [
  body('password').notEmpty().withMessage('비밀번호를 입력해주세요.'),
  body('reason').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { password } = req.body;

    // 비밀번호 확인
    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(400).json({ error: '비밀번호가 올바르지 않습니다.' });
    }

    // 진행 중인 주문 확인
    const pendingOrders = db.prepare(`
      SELECT COUNT(*) as count FROM orders
      WHERE user_id = ? AND status NOT IN ('completed', 'cancelled', 'refunded')
    `).get(req.user.id);

    if (pendingOrders.count > 0) {
      return res.status(400).json({ error: '진행 중인 주문이 있어 탈퇴할 수 없습니다.' });
    }

    // 회원 비활성화 (soft delete)
    db.prepare(`
      UPDATE users SET
        is_active = 0,
        email = email || '_deleted_' || id,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.user.id);

    res.json({ message: '회원 탈퇴가 완료되었습니다.' });
  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({ error: '회원 탈퇴 처리 중 오류가 발생했습니다.' });
  }
});

// 포인트 내역 조회
router.get('/points', authenticate, (req, res) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);

    const total = db.prepare('SELECT COUNT(*) as count FROM point_history WHERE user_id = ?')
      .get(req.user.id).count;

    const history = db.prepare(`
      SELECT id, amount, type, description, balance_after, created_at
      FROM point_history
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(req.user.id, limit, offset);

    const currentPoint = db.prepare('SELECT point FROM users WHERE id = ?').get(req.user.id).point;

    res.json({
      currentPoint,
      ...paginatedResponse(history, total, page, limit)
    });
  } catch (error) {
    console.error('Get points error:', error);
    res.status(500).json({ error: '포인트 내역 조회 중 오류가 발생했습니다.' });
  }
});

// 내 쿠폰 목록 조회
router.get('/coupons', authenticate, (req, res) => {
  try {
    const { status } = req.query; // available, used, expired

    let query = `
      SELECT uc.id, uc.is_used, uc.used_at, uc.created_at,
             c.code, c.name, c.description, c.discount_type, c.discount_value,
             c.min_order_amount, c.max_discount_amount, c.end_date
      FROM user_coupons uc
      JOIN coupons c ON uc.coupon_id = c.id
      WHERE uc.user_id = ?
    `;

    if (status === 'available') {
      query += ` AND uc.is_used = 0 AND c.end_date >= datetime('now') AND c.is_active = 1`;
    } else if (status === 'used') {
      query += ` AND uc.is_used = 1`;
    } else if (status === 'expired') {
      query += ` AND uc.is_used = 0 AND c.end_date < datetime('now')`;
    }

    query += ` ORDER BY c.end_date ASC`;

    const coupons = db.prepare(query).all(req.user.id);

    res.json({ coupons });
  } catch (error) {
    console.error('Get user coupons error:', error);
    res.status(500).json({ error: '쿠폰 조회 중 오류가 발생했습니다.' });
  }
});

// 배송지 목록 (주소 저장 - 기본 주소만 관리)
router.get('/addresses', authenticate, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT zipcode, address, address_detail
      FROM users WHERE id = ?
    `).get(req.user.id);

    const addresses = user.zipcode ? [{
      id: 1,
      isDefault: true,
      zipcode: user.zipcode,
      address: user.address,
      addressDetail: user.address_detail
    }] : [];

    res.json({ addresses });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ error: '배송지 조회 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
