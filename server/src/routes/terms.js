const express = require('express');
const db = require('../config/database');

const router = express.Router();

// 약관 목록
router.get('/', (req, res) => {
  try {
    const terms = db.prepare(`
      SELECT id, type, title, version, is_required, effective_date
      FROM terms
      WHERE is_active = 1
      ORDER BY is_required DESC, type ASC
    `).all();

    res.json({ terms });
  } catch (error) {
    console.error('Get terms error:', error);
    res.status(500).json({ error: '약관 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 약관 상세
router.get('/:type', (req, res) => {
  try {
    const { type } = req.params;

    const term = db.prepare(`
      SELECT * FROM terms
      WHERE type = ? AND is_active = 1
      ORDER BY effective_date DESC
      LIMIT 1
    `).get(type);

    if (!term) {
      return res.status(404).json({ error: '약관을 찾을 수 없습니다.' });
    }

    res.json({ term });
  } catch (error) {
    console.error('Get term error:', error);
    res.status(500).json({ error: '약관 조회 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
