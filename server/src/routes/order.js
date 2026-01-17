const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, DDCARE_DISCOUNT_RATE } = require('../middlewares/auth');
const { generateOrderNumber, paginate, paginatedResponse, calculatePoints, calculateShippingFee } = require('../utils/helpers');

const router = express.Router();

// 주문 목록 조회
router.get('/', authenticate, (req, res) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { status, startDate, endDate } = req.query;

    let whereClause = 'WHERE o.user_id = ?';
    const params = [req.user.id];

    if (status) {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }

    if (startDate) {
      whereClause += ' AND o.created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND o.created_at <= ?';
      params.push(endDate + ' 23:59:59');
    }

    const total = db.prepare(`SELECT COUNT(*) as count FROM orders o ${whereClause}`).get(...params).count;

    const orders = db.prepare(`
      SELECT o.id, o.order_number, o.status, o.total_amount, o.discount_amount,
             o.shipping_fee, o.payment_method, o.payment_status,
             o.recipient_name, o.tracking_number, o.created_at,
             (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count,
             (SELECT oi.product_name FROM order_items oi WHERE oi.order_id = o.id LIMIT 1) as first_item_name,
             (SELECT pi.image_url FROM order_items oi
              JOIN product_images pi ON oi.product_id = pi.product_id AND pi.is_primary = 1
              WHERE oi.order_id = o.id LIMIT 1) as first_item_image
      FROM orders o
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json(paginatedResponse(orders, total, page, limit));
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: '주문 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 주문 상세 조회
router.get('/:orderNumber', authenticate, (req, res) => {
  try {
    const { orderNumber } = req.params;

    const order = db.prepare(`
      SELECT o.*
      FROM orders o
      WHERE o.order_number = ? AND o.user_id = ?
    `).get(orderNumber, req.user.id);

    if (!order) {
      return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
    }

    // 주문 상품
    const items = db.prepare(`
      SELECT oi.*,
             (SELECT image_url FROM product_images WHERE product_id = oi.product_id AND is_primary = 1 LIMIT 1) as image_url,
             (SELECT slug FROM products WHERE id = oi.product_id) as product_slug
      FROM order_items oi
      WHERE oi.order_id = ?
    `).all(order.id);

    // 결제 정보
    const payment = db.prepare(`
      SELECT * FROM payments WHERE order_id = ?
    `).get(order.id);

    res.json({ order, items, payment });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: '주문 조회 중 오류가 발생했습니다.' });
  }
});

// 주문 생성
router.post('/', authenticate, [
  body('recipientName').notEmpty().withMessage('수령인 이름을 입력해주세요.'),
  body('recipientPhone').notEmpty().withMessage('수령인 전화번호를 입력해주세요.'),
  body('zipcode').notEmpty().withMessage('우편번호를 입력해주세요.'),
  body('address').notEmpty().withMessage('주소를 입력해주세요.'),
  body('items').isArray({ min: 1 }).withMessage('주문할 상품을 선택해주세요.')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      recipientName, recipientPhone, zipcode, address, addressDetail,
      deliveryMemo, items, couponId, usePoint
    } = req.body;

    // 든든케어 회원 여부
    const isDdcareMember = req.user.isDdcareMember || false;
    const ddcareDiscountRate = isDdcareMember ? DDCARE_DISCOUNT_RATE : 0;

    // 트랜잭션 시작
    const transaction = db.transaction(() => {
      let totalAmount = 0;
      let ddcareDiscountAmount = 0;
      let discountAmount = 0;
      const orderItems = [];

      // 상품 검증 및 금액 계산
      for (const item of items) {
        const product = db.prepare(`
          SELECT p.*, po.price_adjustment, po.stock as option_stock, po.name as option_name, po.value as option_value
          FROM products p
          LEFT JOIN product_options po ON po.id = ? AND po.product_id = p.id
          WHERE p.id = ? AND p.is_active = 1
        `).get(item.optionId || null, item.productId);

        if (!product) {
          throw new Error(`상품을 찾을 수 없습니다. (ID: ${item.productId})`);
        }

        const availableStock = item.optionId ? product.option_stock : product.stock;
        if (availableStock < item.quantity) {
          throw new Error(`${product.name} 재고가 부족합니다.`);
        }

        const basePrice = product.sale_price || product.price;
        const adjustment = product.price_adjustment || 0;
        let unitPrice = basePrice + adjustment;

        // 든든케어 할인 적용
        if (isDdcareMember) {
          const ddcarePrice = Math.floor(unitPrice * (1 - ddcareDiscountRate));
          ddcareDiscountAmount += (unitPrice - ddcarePrice) * item.quantity;
          unitPrice = ddcarePrice;
        }

        const itemTotal = unitPrice * item.quantity;
        totalAmount += itemTotal;

        orderItems.push({
          productId: item.productId,
          optionId: item.optionId || null,
          productName: product.name,
          optionName: item.optionId ? `${product.option_name}: ${product.option_value}` : null,
          price: unitPrice,
          quantity: item.quantity,
          totalPrice: itemTotal
        });

        // 재고 차감
        if (item.optionId) {
          db.prepare('UPDATE product_options SET stock = stock - ? WHERE id = ?')
            .run(item.quantity, item.optionId);
        } else {
          db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?')
            .run(item.quantity, item.productId);
        }

        // 판매량 증가
        db.prepare('UPDATE products SET sale_count = sale_count + ? WHERE id = ?')
          .run(item.quantity, item.productId);
      }

      // 쿠폰 적용
      let appliedCouponId = null;
      if (couponId) {
        const userCoupon = db.prepare(`
          SELECT uc.*, c.discount_type, c.discount_value, c.min_order_amount, c.max_discount_amount
          FROM user_coupons uc
          JOIN coupons c ON uc.coupon_id = c.id
          WHERE uc.id = ? AND uc.user_id = ? AND uc.is_used = 0
            AND c.is_active = 1 AND c.end_date >= datetime('now')
        `).get(couponId, req.user.id);

        if (userCoupon && totalAmount >= userCoupon.min_order_amount) {
          if (userCoupon.discount_type === 'percentage') {
            discountAmount = Math.floor(totalAmount * userCoupon.discount_value / 100);
            if (userCoupon.max_discount_amount) {
              discountAmount = Math.min(discountAmount, userCoupon.max_discount_amount);
            }
          } else {
            discountAmount = userCoupon.discount_value;
          }
          appliedCouponId = userCoupon.id;
        }
      }

      // 포인트 사용
      let usedPoint = 0;
      const user = db.prepare('SELECT point FROM users WHERE id = ?').get(req.user.id);
      if (usePoint && usePoint > 0) {
        usedPoint = Math.min(usePoint, user.point, totalAmount - discountAmount);
        if (usedPoint >= 1000) { // 최소 1000포인트 이상 사용 가능
          db.prepare('UPDATE users SET point = point - ? WHERE id = ?')
            .run(usedPoint, req.user.id);

          db.prepare(`
            INSERT INTO point_history (user_id, amount, type, description, balance_after)
            VALUES (?, ?, ?, ?, ?)
          `).run(req.user.id, -usedPoint, 'use', '주문 시 포인트 사용', user.point - usedPoint);
        } else {
          usedPoint = 0;
        }
      }

      // 배송비 계산
      const subtotal = totalAmount - discountAmount - usedPoint;
      const shippingFee = calculateShippingFee(subtotal);

      // 적립 예정 포인트
      const earnedPoint = calculatePoints(subtotal);

      // 주문 생성
      const orderNumber = generateOrderNumber();
      const orderResult = db.prepare(`
        INSERT INTO orders (user_id, order_number, total_amount, discount_amount, shipping_fee,
                           used_point, earned_point, recipient_name, recipient_phone,
                           zipcode, address, address_detail, delivery_memo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.user.id, orderNumber, totalAmount, discountAmount, shippingFee,
        usedPoint, earnedPoint, recipientName, recipientPhone,
        zipcode, address, addressDetail || null, deliveryMemo || null
      );

      const orderId = orderResult.lastInsertRowid;

      // 주문 상품 저장
      const insertOrderItem = db.prepare(`
        INSERT INTO order_items (order_id, product_id, product_option_id, product_name, option_name, price, quantity, total_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of orderItems) {
        insertOrderItem.run(
          orderId, item.productId, item.optionId, item.productName,
          item.optionName, item.price, item.quantity, item.totalPrice
        );
      }

      // 쿠폰 사용 처리
      if (appliedCouponId) {
        db.prepare(`
          UPDATE user_coupons SET is_used = 1, used_at = CURRENT_TIMESTAMP, order_id = ?
          WHERE id = ?
        `).run(orderId, appliedCouponId);
      }

      // 장바구니에서 삭제
      const cartProductIds = items.map(i => i.productId);
      const placeholders = cartProductIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM cart_items WHERE user_id = ? AND product_id IN (${placeholders})`)
        .run(req.user.id, ...cartProductIds);

      return {
        orderNumber,
        orderId,
        totalAmount,
        discountAmount,
        ddcareDiscountAmount,
        shippingFee,
        usedPoint,
        earnedPoint,
        finalAmount: subtotal + shippingFee,
        isDdcareMember
      };
    });

    const result = transaction();

    res.status(201).json({
      message: '주문이 생성되었습니다.',
      ...result
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: error.message || '주문 생성 중 오류가 발생했습니다.' });
  }
});

// 주문 취소
router.post('/:orderNumber/cancel', authenticate, [
  body('reason').optional()
], (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { reason } = req.body;

    const order = db.prepare(`
      SELECT * FROM orders WHERE order_number = ? AND user_id = ?
    `).get(orderNumber, req.user.id);

    if (!order) {
      return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
    }

    if (!['pending', 'paid'].includes(order.status)) {
      return res.status(400).json({ error: '취소할 수 없는 주문 상태입니다.' });
    }

    const transaction = db.transaction(() => {
      // 주문 상태 변경
      db.prepare(`
        UPDATE orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(order.id);

      // 재고 복구
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
      for (const item of items) {
        if (item.product_option_id) {
          db.prepare('UPDATE product_options SET stock = stock + ? WHERE id = ?')
            .run(item.quantity, item.product_option_id);
        } else {
          db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?')
            .run(item.quantity, item.product_id);
        }
        db.prepare('UPDATE products SET sale_count = sale_count - ? WHERE id = ?')
          .run(item.quantity, item.product_id);
      }

      // 포인트 복구
      if (order.used_point > 0) {
        const user = db.prepare('SELECT point FROM users WHERE id = ?').get(req.user.id);
        db.prepare('UPDATE users SET point = point + ? WHERE id = ?')
          .run(order.used_point, req.user.id);

        db.prepare(`
          INSERT INTO point_history (user_id, amount, type, description, order_id, balance_after)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(req.user.id, order.used_point, 'refund', '주문 취소로 인한 포인트 환불', order.id, user.point + order.used_point);
      }

      // 쿠폰 복구
      db.prepare(`
        UPDATE user_coupons SET is_used = 0, used_at = NULL, order_id = NULL
        WHERE order_id = ?
      `).run(order.id);
    });

    transaction();

    res.json({ message: '주문이 취소되었습니다.' });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: '주문 취소 중 오류가 발생했습니다.' });
  }
});

// 구매 확정
router.post('/:orderNumber/confirm', authenticate, (req, res) => {
  try {
    const { orderNumber } = req.params;

    const order = db.prepare(`
      SELECT * FROM orders WHERE order_number = ? AND user_id = ?
    `).get(orderNumber, req.user.id);

    if (!order) {
      return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({ error: '배송 완료된 주문만 구매 확정할 수 있습니다.' });
    }

    const transaction = db.transaction(() => {
      // 주문 상태 변경
      db.prepare(`
        UPDATE orders SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(order.id);

      // 포인트 적립
      if (order.earned_point > 0) {
        const user = db.prepare('SELECT point FROM users WHERE id = ?').get(req.user.id);
        db.prepare('UPDATE users SET point = point + ? WHERE id = ?')
          .run(order.earned_point, req.user.id);

        db.prepare(`
          INSERT INTO point_history (user_id, amount, type, description, order_id, balance_after)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(req.user.id, order.earned_point, 'earn', '구매 확정 포인트 적립', order.id, user.point + order.earned_point);
      }
    });

    transaction();

    res.json({ message: '구매가 확정되었습니다.', earnedPoint: order.earned_point });
  } catch (error) {
    console.error('Confirm order error:', error);
    res.status(500).json({ error: '구매 확정 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
