const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

// 토스페이먼츠 결제 승인
router.post('/confirm', authenticate, [
  body('paymentKey').notEmpty().withMessage('결제 키가 필요합니다.'),
  body('orderId').notEmpty().withMessage('주문 ID가 필요합니다.'),
  body('amount').isInt({ min: 1 }).withMessage('결제 금액이 필요합니다.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { paymentKey, orderId, amount } = req.body;

    // 주문 확인
    const order = db.prepare(`
      SELECT * FROM orders WHERE order_number = ? AND user_id = ?
    `).get(orderId, req.user.id);

    if (!order) {
      return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
    }

    // 금액 검증
    const expectedAmount = order.total_amount - order.discount_amount - order.used_point + order.shipping_fee;
    if (amount !== expectedAmount) {
      return res.status(400).json({ error: '결제 금액이 일치하지 않습니다.' });
    }

    // 토스페이먼츠 API 호출
    const secretKey = process.env.TOSS_SECRET_KEY;
    const basicAuth = Buffer.from(secretKey + ':').toString('base64');

    const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount
      })
    });

    const paymentResult = await response.json();

    if (!response.ok) {
      console.error('Payment confirm error:', paymentResult);
      return res.status(400).json({
        error: paymentResult.message || '결제 승인에 실패했습니다.',
        code: paymentResult.code
      });
    }

    // 결제 정보 저장
    const transaction = db.transaction(() => {
      // 결제 기록 생성
      db.prepare(`
        INSERT INTO payments (order_id, payment_key, order_number, amount, method, status,
                             approved_at, receipt_url, card_company, card_number,
                             installment_months, easy_pay_provider)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        order.id,
        paymentResult.paymentKey,
        paymentResult.orderId,
        paymentResult.totalAmount,
        paymentResult.method,
        'approved',
        paymentResult.approvedAt,
        paymentResult.receipt?.url || null,
        paymentResult.card?.company || null,
        paymentResult.card?.number || null,
        paymentResult.card?.installmentPlanMonths || 0,
        paymentResult.easyPay?.provider || null
      );

      // 주문 상태 업데이트
      db.prepare(`
        UPDATE orders SET
          status = 'paid',
          payment_status = 'paid',
          payment_method = ?,
          payment_key = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(paymentResult.method, paymentResult.paymentKey, order.id);
    });

    transaction();

    res.json({
      message: '결제가 완료되었습니다.',
      payment: {
        orderId: paymentResult.orderId,
        amount: paymentResult.totalAmount,
        method: paymentResult.method,
        approvedAt: paymentResult.approvedAt,
        receiptUrl: paymentResult.receipt?.url
      }
    });
  } catch (error) {
    console.error('Payment confirm error:', error);
    res.status(500).json({ error: '결제 처리 중 오류가 발생했습니다.' });
  }
});

// 결제 취소/환불
router.post('/cancel', authenticate, [
  body('orderNumber').notEmpty().withMessage('주문번호가 필요합니다.'),
  body('cancelReason').notEmpty().withMessage('취소 사유를 입력해주세요.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderNumber, cancelReason } = req.body;

    // 주문 확인
    const order = db.prepare(`
      SELECT o.*, p.payment_key, p.amount as paid_amount
      FROM orders o
      JOIN payments p ON o.id = p.order_id
      WHERE o.order_number = ? AND o.user_id = ?
    `).get(orderNumber, req.user.id);

    if (!order) {
      return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
    }

    if (order.status === 'cancelled' || order.status === 'refunded') {
      return res.status(400).json({ error: '이미 취소/환불된 주문입니다.' });
    }

    if (!order.payment_key) {
      return res.status(400).json({ error: '결제 정보를 찾을 수 없습니다.' });
    }

    // 토스페이먼츠 결제 취소 API 호출
    const secretKey = process.env.TOSS_SECRET_KEY;
    const basicAuth = Buffer.from(secretKey + ':').toString('base64');

    const response = await fetch(`https://api.tosspayments.com/v1/payments/${order.payment_key}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cancelReason
      })
    });

    const cancelResult = await response.json();

    if (!response.ok) {
      console.error('Payment cancel error:', cancelResult);
      return res.status(400).json({
        error: cancelResult.message || '결제 취소에 실패했습니다.',
        code: cancelResult.code
      });
    }

    // DB 업데이트
    const transaction = db.transaction(() => {
      // 환불 기록
      db.prepare(`
        INSERT INTO refunds (order_id, payment_id, amount, reason, status, approved_at)
        SELECT o.id, p.id, p.amount, ?, 'approved', CURRENT_TIMESTAMP
        FROM orders o
        JOIN payments p ON o.id = p.order_id
        WHERE o.order_number = ?
      `).run(cancelReason, orderNumber);

      // 결제 상태 업데이트
      db.prepare(`
        UPDATE payments SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE order_id = (SELECT id FROM orders WHERE order_number = ?)
      `).run(orderNumber);

      // 주문 상태 업데이트
      db.prepare(`
        UPDATE orders SET status = 'refunded', payment_status = 'refunded', updated_at = CURRENT_TIMESTAMP
        WHERE order_number = ?
      `).run(orderNumber);

      // 재고 복구
      const items = db.prepare(`
        SELECT * FROM order_items WHERE order_id = ?
      `).all(order.id);

      for (const item of items) {
        if (item.product_option_id) {
          db.prepare('UPDATE product_options SET stock = stock + ? WHERE id = ?')
            .run(item.quantity, item.product_option_id);
        } else {
          db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?')
            .run(item.quantity, item.product_id);
        }
      }

      // 포인트 복구
      if (order.used_point > 0) {
        const user = db.prepare('SELECT point FROM users WHERE id = ?').get(req.user.id);
        db.prepare('UPDATE users SET point = point + ? WHERE id = ?')
          .run(order.used_point, req.user.id);

        db.prepare(`
          INSERT INTO point_history (user_id, amount, type, description, order_id, balance_after)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(req.user.id, order.used_point, 'refund', '결제 취소로 인한 포인트 환불', order.id, user.point + order.used_point);
      }

      // 쿠폰 복구
      db.prepare(`
        UPDATE user_coupons SET is_used = 0, used_at = NULL, order_id = NULL
        WHERE order_id = ?
      `).run(order.id);
    });

    transaction();

    res.json({
      message: '결제가 취소되었습니다.',
      refundAmount: order.paid_amount
    });
  } catch (error) {
    console.error('Payment cancel error:', error);
    res.status(500).json({ error: '결제 취소 중 오류가 발생했습니다.' });
  }
});

// 가상계좌 입금 확인 웹훅
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const body = JSON.parse(req.body.toString());
    const { eventType, data } = body;

    console.log('Payment webhook:', eventType, data);

    if (eventType === 'DEPOSIT_CALLBACK') {
      // 가상계좌 입금 확인
      const { orderId, status } = data;

      if (status === 'DONE') {
        db.prepare(`
          UPDATE orders SET status = 'paid', payment_status = 'paid', updated_at = CURRENT_TIMESTAMP
          WHERE order_number = ?
        `).run(orderId);

        db.prepare(`
          UPDATE payments SET status = 'approved', updated_at = CURRENT_TIMESTAMP
          WHERE order_number = ?
        `).run(orderId);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: '웹훅 처리 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
