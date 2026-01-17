const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, DDCARE_DISCOUNT_RATE } = require('../middlewares/auth');

const router = express.Router();

// 장바구니 조회
router.get('/', authenticate, (req, res) => {
  try {
    const items = db.prepare(`
      SELECT ci.id, ci.quantity, ci.product_id, ci.product_option_id,
             p.name, p.slug, p.price, p.sale_price, p.stock, p.is_active,
             po.name as option_name, po.value as option_value, po.price_adjustment, po.stock as option_stock,
             (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image_url
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN product_options po ON ci.product_option_id = po.id
      WHERE ci.user_id = ?
      ORDER BY ci.created_at DESC
    `).all(req.user.id);

    // 든든케어 회원 여부
    const isDdcareMember = req.user.isDdcareMember || false;
    const ddcareDiscountRate = isDdcareMember ? DDCARE_DISCOUNT_RATE : 0;

    // 총 금액 계산
    let totalPrice = 0;
    let totalDiscountedPrice = 0;
    let totalDdcareDiscountedPrice = 0;

    items.forEach(item => {
      const basePrice = item.price;
      const salePrice = item.sale_price || item.price;
      const adjustment = item.price_adjustment || 0;

      item.unitPrice = basePrice + adjustment;
      item.unitSalePrice = salePrice + adjustment;
      item.itemTotal = item.unitPrice * item.quantity;
      item.itemSaleTotal = item.unitSalePrice * item.quantity;

      // 든든케어 할인 적용 (세일가에서 추가 30% 할인)
      if (isDdcareMember) {
        item.unitDdcarePrice = Math.floor(item.unitSalePrice * (1 - ddcareDiscountRate));
        item.itemDdcareTotal = item.unitDdcarePrice * item.quantity;
      } else {
        item.unitDdcarePrice = item.unitSalePrice;
        item.itemDdcareTotal = item.itemSaleTotal;
      }

      totalPrice += item.itemTotal;
      totalDiscountedPrice += item.itemSaleTotal;
      totalDdcareDiscountedPrice += item.itemDdcareTotal;

      // 재고 체크
      const availableStock = item.option_stock !== null ? item.option_stock : item.stock;
      item.isAvailable = item.is_active && availableStock >= item.quantity;
      item.availableStock = availableStock;
    });

    // 최종 결제 금액 (든든케어 할인 적용된 금액 기준)
    const finalPriceBase = isDdcareMember ? totalDdcareDiscountedPrice : totalDiscountedPrice;
    const shippingFee = finalPriceBase >= 30000 ? 0 : 2500;

    res.json({
      items,
      summary: {
        itemCount: items.length,
        totalPrice,
        totalDiscountedPrice,
        discount: totalPrice - totalDiscountedPrice,
        ddcareDiscount: isDdcareMember ? totalDiscountedPrice - totalDdcareDiscountedPrice : 0,
        totalDdcareDiscountedPrice: isDdcareMember ? totalDdcareDiscountedPrice : totalDiscountedPrice,
        shippingFee,
        finalPrice: finalPriceBase + shippingFee
      },
      isDdcareMember,
      ddcareDiscountRate
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: '장바구니 조회 중 오류가 발생했습니다.' });
  }
});

// 장바구니 추가
router.post('/', authenticate, [
  body('productId').isInt({ min: 1 }).withMessage('유효하지 않은 상품입니다.'),
  body('quantity').isInt({ min: 1, max: 99 }).withMessage('수량은 1~99 사이여야 합니다.')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId, quantity, optionId } = req.body;

    // 상품 존재 여부 확인
    const product = db.prepare('SELECT id, stock, is_active FROM products WHERE id = ?').get(productId);
    if (!product || !product.is_active) {
      return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
    }

    // 옵션 확인
    let availableStock = product.stock;
    if (optionId) {
      const option = db.prepare('SELECT id, stock, is_active FROM product_options WHERE id = ? AND product_id = ?')
        .get(optionId, productId);
      if (!option || !option.is_active) {
        return res.status(404).json({ error: '상품 옵션을 찾을 수 없습니다.' });
      }
      availableStock = option.stock;
    }

    // 재고 확인
    if (availableStock < quantity) {
      return res.status(400).json({ error: `재고가 부족합니다. (현재 재고: ${availableStock}개)` });
    }

    // 이미 장바구니에 있는지 확인
    const existingItem = db.prepare(`
      SELECT id, quantity FROM cart_items
      WHERE user_id = ? AND product_id = ? AND (product_option_id = ? OR (product_option_id IS NULL AND ? IS NULL))
    `).get(req.user.id, productId, optionId || null, optionId || null);

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (availableStock < newQuantity) {
        return res.status(400).json({ error: `재고가 부족합니다. (현재 재고: ${availableStock}개)` });
      }

      db.prepare('UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newQuantity, existingItem.id);

      return res.json({ message: '장바구니가 업데이트되었습니다.', quantity: newQuantity });
    }

    // 새로 추가
    const result = db.prepare(`
      INSERT INTO cart_items (user_id, product_id, product_option_id, quantity)
      VALUES (?, ?, ?, ?)
    `).run(req.user.id, productId, optionId || null, quantity);

    res.status(201).json({ message: '장바구니에 추가되었습니다.', id: result.lastInsertRowid });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: '장바구니 추가 중 오류가 발생했습니다.' });
  }
});

// 장바구니 수량 변경
router.put('/:id', authenticate, [
  body('quantity').isInt({ min: 1, max: 99 }).withMessage('수량은 1~99 사이여야 합니다.')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { quantity } = req.body;

    // 장바구니 아이템 확인
    const item = db.prepare(`
      SELECT ci.*, p.stock, po.stock as option_stock
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN product_options po ON ci.product_option_id = po.id
      WHERE ci.id = ? AND ci.user_id = ?
    `).get(id, req.user.id);

    if (!item) {
      return res.status(404).json({ error: '장바구니 항목을 찾을 수 없습니다.' });
    }

    // 재고 확인
    const availableStock = item.option_stock !== null ? item.option_stock : item.stock;
    if (availableStock < quantity) {
      return res.status(400).json({ error: `재고가 부족합니다. (현재 재고: ${availableStock}개)` });
    }

    db.prepare('UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(quantity, id);

    res.json({ message: '수량이 변경되었습니다.' });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ error: '장바구니 수정 중 오류가 발생했습니다.' });
  }
});

// 장바구니 삭제
router.delete('/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;

    const result = db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?')
      .run(id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: '장바구니 항목을 찾을 수 없습니다.' });
    }

    res.json({ message: '장바구니에서 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete cart error:', error);
    res.status(500).json({ error: '장바구니 삭제 중 오류가 발생했습니다.' });
  }
});

// 장바구니 전체 삭제
router.delete('/', authenticate, (req, res) => {
  try {
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);

    res.json({ message: '장바구니가 비워졌습니다.' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ error: '장바구니 비우기 중 오류가 발생했습니다.' });
  }
});

// 선택 상품 삭제
router.post('/delete-selected', authenticate, [
  body('ids').isArray({ min: 1 }).withMessage('삭제할 항목을 선택해주세요.')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { ids } = req.body;

    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM cart_items WHERE id IN (${placeholders}) AND user_id = ?`)
      .run(...ids, req.user.id);

    res.json({ message: '선택한 항목이 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete selected cart error:', error);
    res.status(500).json({ error: '선택 삭제 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
