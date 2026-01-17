const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middlewares/auth');
const { upload, handleUploadError } = require('../middlewares/upload');
const { paginate, paginatedResponse } = require('../utils/helpers');

const router = express.Router();

// 내 리뷰 목록
router.get('/my', authenticate, (req, res) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);

    const total = db.prepare('SELECT COUNT(*) as count FROM reviews WHERE user_id = ?')
      .get(req.user.id).count;

    const reviews = db.prepare(`
      SELECT r.*, p.name as product_name, p.slug as product_slug,
             (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as product_image
      FROM reviews r
      JOIN products p ON r.product_id = p.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).all(req.user.id, limit, offset);

    res.json(paginatedResponse(reviews, total, page, limit));
  } catch (error) {
    console.error('Get my reviews error:', error);
    res.status(500).json({ error: '리뷰 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 리뷰 작성 가능한 상품 목록
router.get('/writable', authenticate, (req, res) => {
  try {
    const writableItems = db.prepare(`
      SELECT DISTINCT oi.product_id, oi.product_name, oi.order_id, o.order_number, o.created_at as order_date,
             (SELECT image_url FROM product_images WHERE product_id = oi.product_id AND is_primary = 1 LIMIT 1) as product_image
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.user_id = ? AND o.status = 'completed'
        AND NOT EXISTS (SELECT 1 FROM reviews WHERE user_id = ? AND product_id = oi.product_id AND order_id = o.id)
      ORDER BY o.created_at DESC
    `).all(req.user.id, req.user.id);

    res.json({ items: writableItems });
  } catch (error) {
    console.error('Get writable reviews error:', error);
    res.status(500).json({ error: '작성 가능한 리뷰 조회 중 오류가 발생했습니다.' });
  }
});

// 리뷰 작성
router.post('/', authenticate, upload.single('image'), handleUploadError, [
  body('productId').isInt({ min: 1 }).withMessage('상품을 선택해주세요.'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('별점은 1~5 사이여야 합니다.'),
  body('content').isLength({ min: 10, max: 1000 }).withMessage('리뷰는 10~1000자 사이로 작성해주세요.')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId, orderId, rating, title, content } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // 구매 확인
    const orderItem = db.prepare(`
      SELECT oi.id FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'completed'
      ${orderId ? 'AND o.id = ?' : ''}
      LIMIT 1
    `).get(req.user.id, productId, ...(orderId ? [orderId] : []));

    if (!orderItem) {
      return res.status(400).json({ error: '구매한 상품만 리뷰를 작성할 수 있습니다.' });
    }

    // 중복 리뷰 확인
    const existingReview = db.prepare(`
      SELECT id FROM reviews WHERE user_id = ? AND product_id = ? AND order_id = ?
    `).get(req.user.id, productId, orderId || null);

    if (existingReview) {
      return res.status(400).json({ error: '이미 리뷰를 작성한 상품입니다.' });
    }

    const result = db.prepare(`
      INSERT INTO reviews (user_id, product_id, order_id, rating, title, content, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, productId, orderId || null, rating, title || null, content, imageUrl);

    // 리뷰 작성 포인트 적립 (100포인트)
    const user = db.prepare('SELECT point FROM users WHERE id = ?').get(req.user.id);
    db.prepare('UPDATE users SET point = point + 100 WHERE id = ?').run(req.user.id);
    db.prepare(`
      INSERT INTO point_history (user_id, amount, type, description, balance_after)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, 100, 'earn', '리뷰 작성 포인트', user.point + 100);

    res.status(201).json({
      message: '리뷰가 등록되었습니다. 100포인트가 적립되었습니다.',
      reviewId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: '리뷰 등록 중 오류가 발생했습니다.' });
  }
});

// 리뷰 수정
router.put('/:id', authenticate, upload.single('image'), handleUploadError, [
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('별점은 1~5 사이여야 합니다.'),
  body('content').optional().isLength({ min: 10, max: 1000 }).withMessage('리뷰는 10~1000자 사이로 작성해주세요.')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { rating, title, content } = req.body;

    const review = db.prepare('SELECT * FROM reviews WHERE id = ? AND user_id = ?')
      .get(id, req.user.id);

    if (!review) {
      return res.status(404).json({ error: '리뷰를 찾을 수 없습니다.' });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : review.image_url;

    db.prepare(`
      UPDATE reviews SET
        rating = COALESCE(?, rating),
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        image_url = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(rating || null, title || null, content || null, imageUrl, id);

    res.json({ message: '리뷰가 수정되었습니다.' });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: '리뷰 수정 중 오류가 발생했습니다.' });
  }
});

// 리뷰 삭제
router.delete('/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;

    const result = db.prepare('DELETE FROM reviews WHERE id = ? AND user_id = ?')
      .run(id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: '리뷰를 찾을 수 없습니다.' });
    }

    res.json({ message: '리뷰가 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: '리뷰 삭제 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
