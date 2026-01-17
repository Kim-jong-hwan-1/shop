const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middlewares/auth');
const { paginate, paginatedResponse } = require('../utils/helpers');

const router = express.Router();

// 위시리스트 조회
router.get('/', authenticate, (req, res) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);

    const total = db.prepare('SELECT COUNT(*) as count FROM wishlists WHERE user_id = ?')
      .get(req.user.id).count;

    const items = db.prepare(`
      SELECT w.id, w.created_at, p.id as product_id, p.name, p.slug, p.price, p.sale_price, p.stock, p.is_active,
             (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image_url
      FROM wishlists w
      JOIN products p ON w.product_id = p.id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
      LIMIT ? OFFSET ?
    `).all(req.user.id, limit, offset);

    res.json(paginatedResponse(items, total, page, limit));
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ error: '위시리스트 조회 중 오류가 발생했습니다.' });
  }
});

// 위시리스트 추가
router.post('/:productId', authenticate, (req, res) => {
  try {
    const { productId } = req.params;

    // 상품 확인
    const product = db.prepare('SELECT id FROM products WHERE id = ? AND is_active = 1').get(productId);
    if (!product) {
      return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
    }

    // 중복 확인
    const existing = db.prepare('SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?')
      .get(req.user.id, productId);

    if (existing) {
      return res.status(400).json({ error: '이미 위시리스트에 있는 상품입니다.' });
    }

    db.prepare('INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)')
      .run(req.user.id, productId);

    res.status(201).json({ message: '위시리스트에 추가되었습니다.' });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ error: '위시리스트 추가 중 오류가 발생했습니다.' });
  }
});

// 위시리스트 삭제
router.delete('/:productId', authenticate, (req, res) => {
  try {
    const { productId } = req.params;

    const result = db.prepare('DELETE FROM wishlists WHERE user_id = ? AND product_id = ?')
      .run(req.user.id, productId);

    if (result.changes === 0) {
      return res.status(404).json({ error: '위시리스트에 없는 상품입니다.' });
    }

    res.json({ message: '위시리스트에서 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete from wishlist error:', error);
    res.status(500).json({ error: '위시리스트 삭제 중 오류가 발생했습니다.' });
  }
});

// 위시리스트 토글
router.post('/:productId/toggle', authenticate, (req, res) => {
  try {
    const { productId } = req.params;

    const existing = db.prepare('SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?')
      .get(req.user.id, productId);

    if (existing) {
      db.prepare('DELETE FROM wishlists WHERE id = ?').run(existing.id);
      res.json({ message: '위시리스트에서 삭제되었습니다.', isWishlisted: false });
    } else {
      const product = db.prepare('SELECT id FROM products WHERE id = ? AND is_active = 1').get(productId);
      if (!product) {
        return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
      }

      db.prepare('INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)')
        .run(req.user.id, productId);
      res.json({ message: '위시리스트에 추가되었습니다.', isWishlisted: true });
    }
  } catch (error) {
    console.error('Toggle wishlist error:', error);
    res.status(500).json({ error: '위시리스트 처리 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
