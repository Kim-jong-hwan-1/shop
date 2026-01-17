const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middlewares/auth');
const { upload, handleUploadError } = require('../middlewares/upload');
const { paginate, paginatedResponse } = require('../utils/helpers');

const router = express.Router();

// 내 문의 목록
router.get('/', authenticate, (req, res) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { status } = req.query;

    let whereClause = 'WHERE user_id = ?';
    const params = [req.user.id];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    const total = db.prepare(`SELECT COUNT(*) as count FROM inquiries ${whereClause}`).get(...params).count;

    const inquiries = db.prepare(`
      SELECT id, category, title, status, created_at,
             (admin_reply IS NOT NULL) as has_reply
      FROM inquiries
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json(paginatedResponse(inquiries, total, page, limit));
  } catch (error) {
    console.error('Get inquiries error:', error);
    res.status(500).json({ error: '문의 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 문의 상세
router.get('/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;

    const inquiry = db.prepare(`
      SELECT i.*, o.order_number
      FROM inquiries i
      LEFT JOIN orders o ON i.order_id = o.id
      WHERE i.id = ? AND i.user_id = ?
    `).get(id, req.user.id);

    if (!inquiry) {
      return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });
    }

    res.json({ inquiry });
  } catch (error) {
    console.error('Get inquiry error:', error);
    res.status(500).json({ error: '문의 조회 중 오류가 발생했습니다.' });
  }
});

// 문의 작성
router.post('/', authenticate, upload.single('image'), handleUploadError, [
  body('category').notEmpty().withMessage('문의 유형을 선택해주세요.'),
  body('title').notEmpty().withMessage('제목을 입력해주세요.'),
  body('content').isLength({ min: 10 }).withMessage('내용을 10자 이상 입력해주세요.')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { category, title, content, orderId } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // 주문 확인
    if (orderId) {
      const order = db.prepare('SELECT id FROM orders WHERE id = ? AND user_id = ?')
        .get(orderId, req.user.id);
      if (!order) {
        return res.status(400).json({ error: '주문을 찾을 수 없습니다.' });
      }
    }

    const result = db.prepare(`
      INSERT INTO inquiries (user_id, order_id, category, title, content, image_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.id, orderId || null, category, title, content, imageUrl);

    res.status(201).json({
      message: '문의가 등록되었습니다.',
      inquiryId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Create inquiry error:', error);
    res.status(500).json({ error: '문의 등록 중 오류가 발생했습니다.' });
  }
});

// 문의 삭제 (답변 전만 가능)
router.delete('/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;

    const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ? AND user_id = ?')
      .get(id, req.user.id);

    if (!inquiry) {
      return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });
    }

    if (inquiry.admin_reply) {
      return res.status(400).json({ error: '답변이 등록된 문의는 삭제할 수 없습니다.' });
    }

    db.prepare('DELETE FROM inquiries WHERE id = ?').run(id);

    res.json({ message: '문의가 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete inquiry error:', error);
    res.status(500).json({ error: '문의 삭제 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
