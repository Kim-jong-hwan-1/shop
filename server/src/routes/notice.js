const express = require('express');
const db = require('../config/database');
const { paginate, paginatedResponse } = require('../utils/helpers');

const router = express.Router();

// 공지사항 목록
router.get('/', (req, res) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);

    const total = db.prepare('SELECT COUNT(*) as count FROM notices WHERE is_active = 1').get().count;

    const notices = db.prepare(`
      SELECT id, title, is_important, view_count, created_at
      FROM notices
      WHERE is_active = 1
      ORDER BY is_important DESC, created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    res.json(paginatedResponse(notices, total, page, limit));
  } catch (error) {
    console.error('Get notices error:', error);
    res.status(500).json({ error: '공지사항 조회 중 오류가 발생했습니다.' });
  }
});

// 공지사항 상세
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const notice = db.prepare(`
      SELECT * FROM notices WHERE id = ? AND is_active = 1
    `).get(id);

    if (!notice) {
      return res.status(404).json({ error: '공지사항을 찾을 수 없습니다.' });
    }

    // 조회수 증가
    db.prepare('UPDATE notices SET view_count = view_count + 1 WHERE id = ?').run(id);

    // 이전/다음 글
    const prevNotice = db.prepare(`
      SELECT id, title FROM notices
      WHERE is_active = 1 AND (is_important > ? OR (is_important = ? AND created_at > ?))
      ORDER BY is_important ASC, created_at ASC
      LIMIT 1
    `).get(notice.is_important, notice.is_important, notice.created_at);

    const nextNotice = db.prepare(`
      SELECT id, title FROM notices
      WHERE is_active = 1 AND (is_important < ? OR (is_important = ? AND created_at < ?))
      ORDER BY is_important DESC, created_at DESC
      LIMIT 1
    `).get(notice.is_important, notice.is_important, notice.created_at);

    res.json({ notice, prevNotice, nextNotice });
  } catch (error) {
    console.error('Get notice error:', error);
    res.status(500).json({ error: '공지사항 조회 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
