const express = require('express');
const db = require('../config/database');
const { optionalAuth } = require('../middlewares/auth');
const { paginate, paginatedResponse } = require('../utils/helpers');

const router = express.Router();

// 상품 목록 조회
router.get('/', optionalAuth, (req, res) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { category, search, sort, minPrice, maxPrice, featured } = req.query;

    let whereClause = 'WHERE p.is_active = 1';
    const params = [];

    // 카테고리 필터
    if (category) {
      whereClause += ' AND (c.slug = ? OR c.id = ?)';
      params.push(category, parseInt(category) || 0);
    }

    // 검색어 필터
    if (search) {
      whereClause += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // 가격 필터
    if (minPrice) {
      whereClause += ' AND COALESCE(p.sale_price, p.price) >= ?';
      params.push(parseInt(minPrice));
    }
    if (maxPrice) {
      whereClause += ' AND COALESCE(p.sale_price, p.price) <= ?';
      params.push(parseInt(maxPrice));
    }

    // 추천 상품 필터
    if (featured === 'true') {
      whereClause += ' AND p.is_featured = 1';
    }

    // 정렬
    let orderClause = 'ORDER BY p.created_at DESC';
    switch (sort) {
      case 'price_asc':
        orderClause = 'ORDER BY COALESCE(p.sale_price, p.price) ASC';
        break;
      case 'price_desc':
        orderClause = 'ORDER BY COALESCE(p.sale_price, p.price) DESC';
        break;
      case 'name':
        orderClause = 'ORDER BY p.name ASC';
        break;
      case 'popular':
        orderClause = 'ORDER BY p.sale_count DESC';
        break;
      case 'newest':
      default:
        orderClause = 'ORDER BY p.created_at DESC';
    }

    // 전체 개수
    const countQuery = `
      SELECT COUNT(*) as count FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
    `;
    const total = db.prepare(countQuery).get(...params).count;

    // 상품 목록
    const productsQuery = `
      SELECT p.id, p.name, p.slug, p.short_description, p.price, p.sale_price, p.stock,
             p.is_featured, p.view_count, p.sale_count, p.created_at, p.seller_id,
             c.name as category_name, c.slug as category_slug,
             s.name as seller_name, s.seller_business_name,
             (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image_url,
             (SELECT AVG(rating) FROM reviews WHERE product_id = p.id AND is_visible = 1) as avg_rating,
             (SELECT COUNT(*) FROM reviews WHERE product_id = p.id AND is_visible = 1) as review_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users s ON p.seller_id = s.id
      ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?
    `;
    const products = db.prepare(productsQuery).all(...params, limit, offset);

    // 로그인한 사용자의 위시리스트 체크
    if (req.user) {
      const wishlistIds = db.prepare('SELECT product_id FROM wishlists WHERE user_id = ?')
        .all(req.user.id)
        .map(w => w.product_id);

      products.forEach(product => {
        product.isWishlisted = wishlistIds.includes(product.id);
      });
    }

    res.json(paginatedResponse(products, total, page, limit));
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: '상품 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 상품 상세 조회
router.get('/:idOrSlug', optionalAuth, (req, res) => {
  try {
    const { idOrSlug } = req.params;

    // ID 또는 슬러그로 조회
    const product = db.prepare(`
      SELECT p.*, c.name as category_name, c.slug as category_slug,
             s.name as seller_name, s.seller_business_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users s ON p.seller_id = s.id
      WHERE (p.id = ? OR p.slug = ?) AND p.is_active = 1
    `).get(parseInt(idOrSlug) || 0, idOrSlug);

    if (!product) {
      return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
    }

    // 조회수 증가
    db.prepare('UPDATE products SET view_count = view_count + 1 WHERE id = ?').run(product.id);

    // 상품 이미지
    const images = db.prepare(`
      SELECT id, image_url, alt_text, is_primary
      FROM product_images
      WHERE product_id = ?
      ORDER BY sort_order ASC, is_primary DESC
    `).all(product.id);

    // 상품 옵션
    const options = db.prepare(`
      SELECT id, name, value, price_adjustment, stock
      FROM product_options
      WHERE product_id = ? AND is_active = 1
    `).all(product.id);

    // 리뷰 통계
    const reviewStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        AVG(rating) as average,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one
      FROM reviews
      WHERE product_id = ? AND is_visible = 1
    `).get(product.id);

    // 위시리스트 체크
    let isWishlisted = false;
    if (req.user) {
      const wishlist = db.prepare('SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?')
        .get(req.user.id, product.id);
      isWishlisted = !!wishlist;
    }

    // 관련 상품 (같은 카테고리)
    const relatedProducts = db.prepare(`
      SELECT p.id, p.name, p.slug, p.price, p.sale_price,
             (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image_url
      FROM products p
      WHERE p.category_id = ? AND p.id != ? AND p.is_active = 1
      ORDER BY RANDOM()
      LIMIT 4
    `).all(product.category_id, product.id);

    res.json({
      product: {
        ...product,
        images,
        options,
        reviewStats,
        isWishlisted,
        relatedProducts
      }
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: '상품 조회 중 오류가 발생했습니다.' });
  }
});

// 상품 리뷰 목록
router.get('/:id/reviews', (req, res) => {
  try {
    const { id } = req.params;
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { rating } = req.query;

    let whereClause = 'WHERE r.product_id = ? AND r.is_visible = 1';
    const params = [id];

    if (rating) {
      whereClause += ' AND r.rating = ?';
      params.push(parseInt(rating));
    }

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM reviews r ${whereClause}
    `).get(...params).count;

    const reviews = db.prepare(`
      SELECT r.id, r.rating, r.title, r.content, r.image_url, r.created_at,
             r.admin_reply, r.admin_reply_at,
             u.name as user_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    // 이름 마스킹 (홍*동)
    reviews.forEach(review => {
      if (review.user_name && review.user_name.length > 2) {
        review.user_name = review.user_name[0] + '*'.repeat(review.user_name.length - 2) + review.user_name.slice(-1);
      } else if (review.user_name) {
        review.user_name = review.user_name[0] + '*';
      }
    });

    res.json(paginatedResponse(reviews, total, page, limit));
  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({ error: '리뷰 조회 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
