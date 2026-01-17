const express = require('express');
const db = require('../config/database');

const router = express.Router();

// 카테고리 목록 조회
router.get('/', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT c.id, c.name, c.slug, c.description, c.parent_id,
             (SELECT COUNT(*) FROM products WHERE category_id = c.id AND is_active = 1) as product_count
      FROM categories c
      WHERE c.is_active = 1
      ORDER BY c.sort_order ASC, c.name ASC
    `).all();

    // 계층 구조로 변환
    const buildTree = (items, parentId = null) => {
      return items
        .filter(item => item.parent_id === parentId)
        .map(item => ({
          ...item,
          children: buildTree(items, item.id)
        }));
    };

    const categoryTree = buildTree(categories);

    res.json({ categories: categoryTree, flatCategories: categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: '카테고리 조회 중 오류가 발생했습니다.' });
  }
});

// 카테고리 상세 조회
router.get('/:idOrSlug', (req, res) => {
  try {
    const { idOrSlug } = req.params;

    const category = db.prepare(`
      SELECT c.*,
             (SELECT COUNT(*) FROM products WHERE category_id = c.id AND is_active = 1) as product_count
      FROM categories c
      WHERE (c.id = ? OR c.slug = ?) AND c.is_active = 1
    `).get(parseInt(idOrSlug) || 0, idOrSlug);

    if (!category) {
      return res.status(404).json({ error: '카테고리를 찾을 수 없습니다.' });
    }

    // 하위 카테고리
    const subCategories = db.prepare(`
      SELECT id, name, slug,
             (SELECT COUNT(*) FROM products WHERE category_id = categories.id AND is_active = 1) as product_count
      FROM categories
      WHERE parent_id = ? AND is_active = 1
      ORDER BY sort_order ASC
    `).all(category.id);

    res.json({ category, subCategories });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: '카테고리 조회 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
