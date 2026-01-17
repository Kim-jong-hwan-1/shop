const express = require('express');
const db = require('../config/database');

const router = express.Router();

// FAQ 목록
router.get('/', (req, res) => {
  try {
    const { category } = req.query;

    let query = 'SELECT * FROM faqs WHERE is_active = 1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY sort_order ASC, id DESC';

    const faqs = db.prepare(query).all(...params);

    // 카테고리 목록
    const categories = db.prepare(`
      SELECT DISTINCT category FROM faqs WHERE is_active = 1 ORDER BY category
    `).all().map(c => c.category);

    // 카테고리별로 그룹화
    const groupedFaqs = {};
    faqs.forEach(faq => {
      if (!groupedFaqs[faq.category]) {
        groupedFaqs[faq.category] = [];
      }
      groupedFaqs[faq.category].push(faq);
    });

    res.json({ faqs, categories, groupedFaqs });
  } catch (error) {
    console.error('Get faqs error:', error);
    res.status(500).json({ error: 'FAQ 조회 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
