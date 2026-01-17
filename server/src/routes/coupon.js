const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

// 쿠폰 등록 (코드 입력)
router.post('/register', authenticate, [
  body('code').notEmpty().withMessage('쿠폰 코드를 입력해주세요.')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { code } = req.body;

    // 쿠폰 확인
    const coupon = db.prepare(`
      SELECT * FROM coupons
      WHERE code = ? AND is_active = 1
        AND start_date <= datetime('now')
        AND end_date >= datetime('now')
    `).get(code.toUpperCase());

    if (!coupon) {
      return res.status(404).json({ error: '유효하지 않은 쿠폰 코드입니다.' });
    }

    // 사용 횟수 제한 확인
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return res.status(400).json({ error: '쿠폰 사용 한도가 초과되었습니다.' });
    }

    // 이미 보유 여부 확인
    const existing = db.prepare(`
      SELECT id FROM user_coupons WHERE user_id = ? AND coupon_id = ?
    `).get(req.user.id, coupon.id);

    if (existing) {
      return res.status(400).json({ error: '이미 보유한 쿠폰입니다.' });
    }

    // 쿠폰 발급
    db.prepare('INSERT INTO user_coupons (user_id, coupon_id) VALUES (?, ?)')
      .run(req.user.id, coupon.id);

    db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?')
      .run(coupon.id);

    res.json({
      message: '쿠폰이 등록되었습니다.',
      coupon: {
        name: coupon.name,
        discountType: coupon.discount_type,
        discountValue: coupon.discount_value,
        minOrderAmount: coupon.min_order_amount,
        endDate: coupon.end_date
      }
    });
  } catch (error) {
    console.error('Register coupon error:', error);
    res.status(500).json({ error: '쿠폰 등록 중 오류가 발생했습니다.' });
  }
});

// 사용 가능한 쿠폰 목록 (주문 시)
router.get('/available', authenticate, (req, res) => {
  try {
    const { orderAmount } = req.query;
    const amount = parseInt(orderAmount) || 0;

    const coupons = db.prepare(`
      SELECT uc.id, c.code, c.name, c.description, c.discount_type, c.discount_value,
             c.min_order_amount, c.max_discount_amount, c.end_date
      FROM user_coupons uc
      JOIN coupons c ON uc.coupon_id = c.id
      WHERE uc.user_id = ? AND uc.is_used = 0
        AND c.is_active = 1 AND c.end_date >= datetime('now')
      ORDER BY c.end_date ASC
    `).all(req.user.id);

    // 사용 가능 여부 표시
    coupons.forEach(coupon => {
      coupon.isUsable = amount >= coupon.min_order_amount;

      // 할인 금액 계산
      if (coupon.isUsable) {
        if (coupon.discount_type === 'percentage') {
          coupon.discountAmount = Math.floor(amount * coupon.discount_value / 100);
          if (coupon.max_discount_amount) {
            coupon.discountAmount = Math.min(coupon.discountAmount, coupon.max_discount_amount);
          }
        } else {
          coupon.discountAmount = coupon.discount_value;
        }
      } else {
        coupon.discountAmount = 0;
      }
    });

    res.json({ coupons });
  } catch (error) {
    console.error('Get available coupons error:', error);
    res.status(500).json({ error: '쿠폰 조회 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
