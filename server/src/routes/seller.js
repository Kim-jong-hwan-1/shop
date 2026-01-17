const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, isSeller } = require('../middlewares/auth');
const { upload, handleUploadError } = require('../middlewares/upload');
const { paginate, paginatedResponse, generateSlug } = require('../utils/helpers');

const router = express.Router();

// 모든 판매자 라우트에 인증 및 판매자 권한 체크 적용
router.use(authenticate, isSeller);

// ==================== 대시보드 ====================
router.get('/dashboard', (req, res) => {
  try {
    const sellerId = req.user.id;

    // 오늘 주문 (내 상품만)
    const todayOrders = db.prepare(`
      SELECT COUNT(DISTINCT o.id) as count, COALESCE(SUM(oi.total_price), 0) as amount
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE p.seller_id = ? AND DATE(o.created_at) = DATE('now')
    `).get(sellerId);

    // 이번 달 주문 (내 상품만)
    const monthOrders = db.prepare(`
      SELECT COUNT(DISTINCT o.id) as count, COALESCE(SUM(oi.total_price), 0) as amount
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE p.seller_id = ? AND strftime('%Y-%m', o.created_at) = strftime('%Y-%m', 'now')
    `).get(sellerId);

    // 내 상품 수
    const totalProducts = db.prepare(`
      SELECT COUNT(*) as count FROM products WHERE seller_id = ? AND is_active = 1
    `).get(sellerId).count;

    // 재고 부족 상품
    const lowStockProducts = db.prepare(`
      SELECT COUNT(*) as count FROM products WHERE seller_id = ? AND stock <= 10 AND is_active = 1
    `).get(sellerId).count;

    // 최근 주문 (내 상품 관련)
    const recentOrders = db.prepare(`
      SELECT DISTINCT o.id, o.order_number, o.status, o.created_at,
             u.name as user_name,
             (SELECT SUM(oi2.total_price) FROM order_items oi2
              JOIN products p2 ON oi2.product_id = p2.id
              WHERE oi2.order_id = o.id AND p2.seller_id = ?) as seller_amount
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      JOIN users u ON o.user_id = u.id
      WHERE p.seller_id = ?
      ORDER BY o.created_at DESC
      LIMIT 5
    `).all(sellerId, sellerId);

    // 베스트 상품 (내 상품 중)
    const bestProducts = db.prepare(`
      SELECT id, name, sale_count, stock
      FROM products
      WHERE seller_id = ? AND is_active = 1
      ORDER BY sale_count DESC
      LIMIT 5
    `).all(sellerId);

    res.json({
      todayOrders,
      monthOrders,
      totalProducts,
      lowStockProducts,
      recentOrders,
      bestProducts
    });
  } catch (error) {
    console.error('Seller dashboard error:', error);
    res.status(500).json({ error: '대시보드 데이터 조회 중 오류가 발생했습니다.' });
  }
});

// ==================== 상품 관리 ====================
// 내 상품 목록
router.get('/products', (req, res) => {
  try {
    const sellerId = req.user.id;
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { category, search, status } = req.query;

    let whereClause = 'p.seller_id = ?';
    const params = [sellerId];

    if (category) {
      whereClause += ' AND p.category_id = ?';
      params.push(category);
    }

    if (search) {
      whereClause += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status === 'active') {
      whereClause += ' AND p.is_active = 1';
    } else if (status === 'inactive') {
      whereClause += ' AND p.is_active = 0';
    }

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM products p WHERE ${whereClause}
    `).get(...params).count;

    const products = db.prepare(`
      SELECT p.*, c.name as category_name,
             (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image_url
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json(paginatedResponse(products, total, page, limit));
  } catch (error) {
    console.error('Seller get products error:', error);
    res.status(500).json({ error: '상품 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 상품 상세 조회
router.get('/products/:id', (req, res) => {
  try {
    const sellerId = req.user.id;
    const { id } = req.params;

    const product = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ? AND p.seller_id = ?
    `).get(id, sellerId);

    if (!product) {
      return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
    }

    // 상품 이미지
    const images = db.prepare(`
      SELECT id, image_url, alt_text, is_primary, sort_order
      FROM product_images
      WHERE product_id = ?
      ORDER BY sort_order ASC, is_primary DESC
    `).all(id);

    // 상품 옵션
    const options = db.prepare(`
      SELECT id, name, value, price_adjustment, stock, is_active
      FROM product_options
      WHERE product_id = ?
    `).all(id);

    res.json({
      product: {
        ...product,
        images,
        options
      }
    });
  } catch (error) {
    console.error('Seller get product error:', error);
    res.status(500).json({ error: '상품 조회 중 오류가 발생했습니다.' });
  }
});

// 상품 등록
router.post('/products', upload.array('images', 10), handleUploadError, [
  body('name').notEmpty().withMessage('상품명을 입력해주세요.'),
  body('price').isInt({ min: 0 }).withMessage('가격을 입력해주세요.'),
  body('categoryId').isInt({ min: 1 }).withMessage('카테고리를 선택해주세요.')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const sellerId = req.user.id;
    const {
      name, categoryId, description, shortDescription, price, salePrice,
      stock, sku, weight, isFeatured
    } = req.body;

    const slug = generateSlug(name) + '-' + Date.now();

    const result = db.prepare(`
      INSERT INTO products (name, slug, category_id, seller_id, description, short_description,
                           price, sale_price, stock, sku, weight, is_featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, slug, categoryId, sellerId, description || null, shortDescription || null,
      price, salePrice || null, stock || 0, sku || null, weight || null,
      isFeatured ? 1 : 0
    );

    const productId = result.lastInsertRowid;

    // 이미지 저장
    if (req.files && req.files.length > 0) {
      const insertImage = db.prepare(`
        INSERT INTO product_images (product_id, image_url, sort_order, is_primary)
        VALUES (?, ?, ?, ?)
      `);

      req.files.forEach((file, index) => {
        insertImage.run(productId, `/uploads/${file.filename}`, index, index === 0 ? 1 : 0);
      });
    }

    res.status(201).json({
      message: '상품이 등록되었습니다.',
      productId
    });
  } catch (error) {
    console.error('Seller create product error:', error);
    res.status(500).json({ error: '상품 등록 중 오류가 발생했습니다.' });
  }
});

// 상품 수정
router.put('/products/:id', upload.array('images', 10), handleUploadError, (req, res) => {
  try {
    const sellerId = req.user.id;
    const { id } = req.params;
    const {
      name, categoryId, description, shortDescription, price, salePrice,
      stock, sku, weight, isFeatured, isActive
    } = req.body;

    // 본인 상품인지 확인
    const product = db.prepare('SELECT id FROM products WHERE id = ? AND seller_id = ?').get(id, sellerId);
    if (!product) {
      return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
    }

    db.prepare(`
      UPDATE products SET
        name = COALESCE(?, name),
        category_id = COALESCE(?, category_id),
        description = COALESCE(?, description),
        short_description = COALESCE(?, short_description),
        price = COALESCE(?, price),
        sale_price = ?,
        stock = COALESCE(?, stock),
        sku = COALESCE(?, sku),
        weight = COALESCE(?, weight),
        is_featured = COALESCE(?, is_featured),
        is_active = COALESCE(?, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND seller_id = ?
    `).run(
      name || null, categoryId || null, description || null, shortDescription || null,
      price || null, salePrice || null, stock || null, sku || null, weight || null,
      isFeatured !== undefined ? (isFeatured ? 1 : 0) : null,
      isActive !== undefined ? (isActive ? 1 : 0) : null,
      id, sellerId
    );

    // 새 이미지 추가
    if (req.files && req.files.length > 0) {
      const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM product_images WHERE product_id = ?')
        .get(id).max || 0;

      const insertImage = db.prepare(`
        INSERT INTO product_images (product_id, image_url, sort_order, is_primary)
        VALUES (?, ?, ?, 0)
      `);

      req.files.forEach((file, index) => {
        insertImage.run(id, `/uploads/${file.filename}`, maxOrder + index + 1);
      });
    }

    res.json({ message: '상품이 수정되었습니다.' });
  } catch (error) {
    console.error('Seller update product error:', error);
    res.status(500).json({ error: '상품 수정 중 오류가 발생했습니다.' });
  }
});

// 상품 삭제
router.delete('/products/:id', (req, res) => {
  try {
    const sellerId = req.user.id;
    const { id } = req.params;

    // 본인 상품인지 확인
    const product = db.prepare('SELECT id FROM products WHERE id = ? AND seller_id = ?').get(id, sellerId);
    if (!product) {
      return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
    }

    // 주문된 상품인지 확인
    const ordered = db.prepare('SELECT id FROM order_items WHERE product_id = ? LIMIT 1').get(id);
    if (ordered) {
      // 비활성화만 수행
      db.prepare('UPDATE products SET is_active = 0 WHERE id = ? AND seller_id = ?').run(id, sellerId);
      return res.json({ message: '주문 내역이 있어 비활성화 처리되었습니다.' });
    }

    db.prepare('DELETE FROM products WHERE id = ? AND seller_id = ?').run(id, sellerId);
    res.json({ message: '상품이 삭제되었습니다.' });
  } catch (error) {
    console.error('Seller delete product error:', error);
    res.status(500).json({ error: '상품 삭제 중 오류가 발생했습니다.' });
  }
});

// 상품 이미지 삭제
router.delete('/products/:productId/images/:imageId', (req, res) => {
  try {
    const sellerId = req.user.id;
    const { productId, imageId } = req.params;

    // 본인 상품인지 확인
    const product = db.prepare('SELECT id FROM products WHERE id = ? AND seller_id = ?').get(productId, sellerId);
    if (!product) {
      return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
    }

    db.prepare('DELETE FROM product_images WHERE id = ? AND product_id = ?').run(imageId, productId);
    res.json({ message: '이미지가 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete product image error:', error);
    res.status(500).json({ error: '이미지 삭제 중 오류가 발생했습니다.' });
  }
});

// 대표 이미지 설정
router.put('/products/:productId/images/:imageId/primary', (req, res) => {
  try {
    const sellerId = req.user.id;
    const { productId, imageId } = req.params;

    // 본인 상품인지 확인
    const product = db.prepare('SELECT id FROM products WHERE id = ? AND seller_id = ?').get(productId, sellerId);
    if (!product) {
      return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
    }

    // 기존 대표 이미지 해제
    db.prepare('UPDATE product_images SET is_primary = 0 WHERE product_id = ?').run(productId);
    // 새 대표 이미지 설정
    db.prepare('UPDATE product_images SET is_primary = 1 WHERE id = ? AND product_id = ?').run(imageId, productId);

    res.json({ message: '대표 이미지가 설정되었습니다.' });
  } catch (error) {
    console.error('Set primary image error:', error);
    res.status(500).json({ error: '대표 이미지 설정 중 오류가 발생했습니다.' });
  }
});

// ==================== 주문 관리 ====================
// 내 상품 관련 주문 목록
router.get('/orders', (req, res) => {
  try {
    const sellerId = req.user.id;
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { status, search, startDate, endDate } = req.query;

    let whereClause = 'p.seller_id = ?';
    const params = [sellerId];

    if (status) {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }

    if (search) {
      whereClause += ' AND (o.order_number LIKE ? OR u.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (startDate) {
      whereClause += ' AND o.created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND o.created_at <= ?';
      params.push(endDate + ' 23:59:59');
    }

    const total = db.prepare(`
      SELECT COUNT(DISTINCT o.id) as count
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      JOIN users u ON o.user_id = u.id
      WHERE ${whereClause}
    `).get(...params).count;

    const orders = db.prepare(`
      SELECT DISTINCT o.id, o.order_number, o.status, o.created_at, o.tracking_number,
             o.recipient_name, o.recipient_phone, o.zipcode, o.address, o.address_detail, o.delivery_memo,
             u.name as user_name, u.email as user_email,
             (SELECT SUM(oi2.total_price) FROM order_items oi2
              JOIN products p2 ON oi2.product_id = p2.id
              WHERE oi2.order_id = o.id AND p2.seller_id = ?) as seller_total_amount
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      JOIN users u ON o.user_id = u.id
      WHERE ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `).all(sellerId, ...params, limit, offset);

    // 각 주문에 대해 내 상품 목록 조회
    const ordersWithItems = orders.map(order => {
      const items = db.prepare(`
        SELECT oi.*, p.name as product_name,
               (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image_url
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ? AND p.seller_id = ?
      `).all(order.id, sellerId);

      return { ...order, items };
    });

    res.json(paginatedResponse(ordersWithItems, total, page, limit));
  } catch (error) {
    console.error('Seller get orders error:', error);
    res.status(500).json({ error: '주문 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 주문 상세 조회
router.get('/orders/:orderNumber', (req, res) => {
  try {
    const sellerId = req.user.id;
    const { orderNumber } = req.params;

    // 내 상품이 포함된 주문인지 확인
    const order = db.prepare(`
      SELECT DISTINCT o.*,
             u.name as user_name, u.email as user_email, u.phone as user_phone
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      JOIN users u ON o.user_id = u.id
      WHERE o.order_number = ? AND p.seller_id = ?
    `).get(orderNumber, sellerId);

    if (!order) {
      return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
    }

    // 내 상품만 조회
    const items = db.prepare(`
      SELECT oi.*, p.name as product_name,
             (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image_url
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ? AND p.seller_id = ?
    `).all(order.id, sellerId);

    // 내 상품 합계
    const sellerTotalAmount = items.reduce((sum, item) => sum + item.total_price, 0);

    res.json({
      order: {
        ...order,
        items,
        seller_total_amount: sellerTotalAmount
      }
    });
  } catch (error) {
    console.error('Seller get order detail error:', error);
    res.status(500).json({ error: '주문 상세 조회 중 오류가 발생했습니다.' });
  }
});

// ==================== 판매 통계 ====================
// 판매 통계 (일별/월별/기간별)
router.get('/stats/sales', (req, res) => {
  try {
    const sellerId = req.user.id;
    const { period, startDate, endDate } = req.query;

    let dateFormat, groupBy;
    let whereClause = 'p.seller_id = ? AND o.status NOT IN (\'cancelled\', \'refunded\')';
    const params = [sellerId];

    if (startDate) {
      whereClause += ' AND DATE(o.created_at) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND DATE(o.created_at) <= ?';
      params.push(endDate);
    }

    if (period === 'monthly') {
      dateFormat = '%Y-%m';
      groupBy = "strftime('%Y-%m', o.created_at)";
    } else {
      dateFormat = '%Y-%m-%d';
      groupBy = "DATE(o.created_at)";
    }

    // 기간별 매출 데이터
    const salesData = db.prepare(`
      SELECT
        ${groupBy} as date,
        COUNT(DISTINCT o.id) as order_count,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total_price) as total_amount
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE ${whereClause}
      GROUP BY ${groupBy}
      ORDER BY date DESC
      LIMIT 30
    `).all(...params);

    // 전체 요약
    const summary = db.prepare(`
      SELECT
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(oi.quantity), 0) as total_quantity,
        COALESCE(SUM(oi.total_price), 0) as total_amount
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE ${whereClause}
    `).get(...params);

    res.json({ salesData, summary });
  } catch (error) {
    console.error('Get sales stats error:', error);
    res.status(500).json({ error: '판매 통계 조회 중 오류가 발생했습니다.' });
  }
});

// 상품별 판매 통계
router.get('/stats/products', (req, res) => {
  try {
    const sellerId = req.user.id;
    const { startDate, endDate, limit = 10 } = req.query;

    let whereClause = 'p.seller_id = ? AND o.status NOT IN (\'cancelled\', \'refunded\')';
    const params = [sellerId];

    if (startDate) {
      whereClause += ' AND DATE(o.created_at) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND DATE(o.created_at) <= ?';
      params.push(endDate);
    }

    const productStats = db.prepare(`
      SELECT
        p.id,
        p.name,
        p.price,
        p.sale_price,
        p.stock,
        COUNT(DISTINCT o.id) as order_count,
        COALESCE(SUM(oi.quantity), 0) as total_quantity,
        COALESCE(SUM(oi.total_price), 0) as total_amount,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image_url
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status NOT IN ('cancelled', 'refunded')
        ${startDate ? "AND DATE(o.created_at) >= '" + startDate + "'" : ''}
        ${endDate ? "AND DATE(o.created_at) <= '" + endDate + "'" : ''}
      WHERE p.seller_id = ?
      GROUP BY p.id
      ORDER BY total_amount DESC
      LIMIT ?
    `).all(sellerId, parseInt(limit));

    res.json({ products: productStats });
  } catch (error) {
    console.error('Get product stats error:', error);
    res.status(500).json({ error: '상품별 통계 조회 중 오류가 발생했습니다.' });
  }
});

// ==================== 정산 관리 ====================
// 정산 목록
router.get('/settlements', (req, res) => {
  try {
    const sellerId = req.user.id;
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { status, year, month } = req.query;

    let whereClause = 'seller_id = ?';
    const params = [sellerId];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (year) {
      whereClause += ' AND strftime(\'%Y\', settlement_period_start) = ?';
      params.push(year);
    }

    if (month) {
      whereClause += ' AND strftime(\'%m\', settlement_period_start) = ?';
      params.push(month.padStart(2, '0'));
    }

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM seller_settlements WHERE ${whereClause}
    `).get(...params).count;

    const settlements = db.prepare(`
      SELECT * FROM seller_settlements
      WHERE ${whereClause}
      ORDER BY settlement_period_end DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json(paginatedResponse(settlements, total, page, limit));
  } catch (error) {
    console.error('Get settlements error:', error);
    res.status(500).json({ error: '정산 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 정산 상세
router.get('/settlements/:id', (req, res) => {
  try {
    const sellerId = req.user.id;
    const { id } = req.params;

    const settlement = db.prepare(`
      SELECT * FROM seller_settlements WHERE id = ? AND seller_id = ?
    `).get(id, sellerId);

    if (!settlement) {
      return res.status(404).json({ error: '정산 내역을 찾을 수 없습니다.' });
    }

    // 정산 상세 항목
    const items = db.prepare(`
      SELECT si.*, o.order_number
      FROM settlement_items si
      JOIN orders o ON si.order_id = o.id
      WHERE si.settlement_id = ?
      ORDER BY si.created_at DESC
    `).all(id);

    res.json({ settlement, items });
  } catch (error) {
    console.error('Get settlement detail error:', error);
    res.status(500).json({ error: '정산 상세 조회 중 오류가 발생했습니다.' });
  }
});

// 정산 요약
router.get('/settlement-summary', (req, res) => {
  try {
    const sellerId = req.user.id;

    // 정산 예정 금액 (pending)
    const pendingAmount = db.prepare(`
      SELECT COALESCE(SUM(settlement_amount), 0) as amount
      FROM seller_settlements
      WHERE seller_id = ? AND status = 'pending'
    `).get(sellerId).amount;

    // 정산 완료 금액 (이번 달)
    const completedThisMonth = db.prepare(`
      SELECT COALESCE(SUM(settlement_amount), 0) as amount
      FROM seller_settlements
      WHERE seller_id = ? AND status = 'completed'
        AND strftime('%Y-%m', paid_at) = strftime('%Y-%m', 'now')
    `).get(sellerId).amount;

    // 총 정산 완료 금액
    const totalCompleted = db.prepare(`
      SELECT COALESCE(SUM(settlement_amount), 0) as amount
      FROM seller_settlements
      WHERE seller_id = ? AND status = 'completed'
    `).get(sellerId).amount;

    // 다음 정산 예정일 (익월 15일)
    const nextSettlementDate = new Date();
    nextSettlementDate.setMonth(nextSettlementDate.getMonth() + 1);
    nextSettlementDate.setDate(15);

    res.json({
      pendingAmount,
      completedThisMonth,
      totalCompleted,
      nextSettlementDate: nextSettlementDate.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Get settlement summary error:', error);
    res.status(500).json({ error: '정산 요약 조회 중 오류가 발생했습니다.' });
  }
});

// ==================== 배송 관리 ====================
// 배송 처리 (운송장 입력)
router.put('/orders/:orderNumber/ship', [
  body('trackingNumber').notEmpty().withMessage('운송장 번호를 입력해주세요.')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const sellerId = req.user.id;
    const { orderNumber } = req.params;
    const { trackingNumber, carrier } = req.body;

    // 내 상품이 포함된 주문인지 확인
    const order = db.prepare(`
      SELECT DISTINCT o.id, o.status
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.order_number = ? AND p.seller_id = ?
    `).get(orderNumber, sellerId);

    if (!order) {
      return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
    }

    if (!['paid', 'preparing'].includes(order.status)) {
      return res.status(400).json({ error: '배송 처리할 수 없는 주문 상태입니다.' });
    }

    db.prepare(`
      UPDATE orders
      SET status = 'shipped', tracking_number = ?, shipped_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE order_number = ?
    `).run(trackingNumber, orderNumber);

    res.json({ message: '배송 처리가 완료되었습니다.' });
  } catch (error) {
    console.error('Ship order error:', error);
    res.status(500).json({ error: '배송 처리 중 오류가 발생했습니다.' });
  }
});

// 주문 상태 변경
router.put('/orders/:orderNumber/status', [
  body('status').isIn(['preparing', 'shipped', 'delivered']).withMessage('유효하지 않은 상태입니다.')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const sellerId = req.user.id;
    const { orderNumber } = req.params;
    const { status, trackingNumber } = req.body;

    // 내 상품이 포함된 주문인지 확인
    const order = db.prepare(`
      SELECT DISTINCT o.id, o.status
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.order_number = ? AND p.seller_id = ?
    `).get(orderNumber, sellerId);

    if (!order) {
      return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
    }

    const updateFields = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const params = [status];

    if (status === 'shipped' && trackingNumber) {
      updateFields.push('tracking_number = ?', 'shipped_at = CURRENT_TIMESTAMP');
      params.push(trackingNumber);
    }

    if (status === 'delivered') {
      updateFields.push('delivered_at = CURRENT_TIMESTAMP');
    }

    params.push(orderNumber);

    db.prepare(`UPDATE orders SET ${updateFields.join(', ')} WHERE order_number = ?`).run(...params);

    res.json({ message: '주문 상태가 변경되었습니다.' });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: '주문 상태 변경 중 오류가 발생했습니다.' });
  }
});

// ==================== 반품/교환 관리 ====================
// 반품/교환 목록
router.get('/returns', (req, res) => {
  try {
    const sellerId = req.user.id;
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { status, type } = req.query;

    let whereClause = 'r.seller_id = ?';
    const params = [sellerId];

    if (status) {
      whereClause += ' AND r.status = ?';
      params.push(status);
    }

    if (type) {
      whereClause += ' AND r.return_type = ?';
      params.push(type);
    }

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM order_returns r WHERE ${whereClause}
    `).get(...params).count;

    const returns = db.prepare(`
      SELECT r.*, o.order_number, oi.product_name, oi.price, oi.option_name,
             u.name as user_name, u.phone as user_phone,
             (SELECT image_url FROM product_images WHERE product_id = oi.product_id AND is_primary = 1 LIMIT 1) as image_url
      FROM order_returns r
      JOIN orders o ON r.order_id = o.id
      JOIN order_items oi ON r.order_item_id = oi.id
      JOIN users u ON o.user_id = u.id
      WHERE ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json(paginatedResponse(returns, total, page, limit));
  } catch (error) {
    console.error('Get returns error:', error);
    res.status(500).json({ error: '반품/교환 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 반품/교환 상세
router.get('/returns/:id', (req, res) => {
  try {
    const sellerId = req.user.id;
    const { id } = req.params;

    const returnRequest = db.prepare(`
      SELECT r.*, o.order_number, o.recipient_name, o.recipient_phone,
             o.zipcode, o.address, o.address_detail,
             oi.product_name, oi.price, oi.quantity as order_quantity, oi.option_name,
             u.name as user_name, u.email as user_email, u.phone as user_phone,
             (SELECT image_url FROM product_images WHERE product_id = oi.product_id AND is_primary = 1 LIMIT 1) as image_url
      FROM order_returns r
      JOIN orders o ON r.order_id = o.id
      JOIN order_items oi ON r.order_item_id = oi.id
      JOIN users u ON o.user_id = u.id
      WHERE r.id = ? AND r.seller_id = ?
    `).get(id, sellerId);

    if (!returnRequest) {
      return res.status(404).json({ error: '반품/교환 요청을 찾을 수 없습니다.' });
    }

    res.json({ return: returnRequest });
  } catch (error) {
    console.error('Get return detail error:', error);
    res.status(500).json({ error: '반품/교환 상세 조회 중 오류가 발생했습니다.' });
  }
});

// 반품/교환 승인
router.put('/returns/:id/approve', (req, res) => {
  try {
    const sellerId = req.user.id;
    const { id } = req.params;
    const { memo } = req.body;

    const returnRequest = db.prepare(`
      SELECT * FROM order_returns WHERE id = ? AND seller_id = ?
    `).get(id, sellerId);

    if (!returnRequest) {
      return res.status(404).json({ error: '반품/교환 요청을 찾을 수 없습니다.' });
    }

    if (returnRequest.status !== 'pending') {
      return res.status(400).json({ error: '대기 중인 요청만 승인할 수 있습니다.' });
    }

    db.prepare(`
      UPDATE order_returns
      SET status = 'approved', approved_at = CURRENT_TIMESTAMP, memo = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(memo || null, id);

    res.json({ message: '반품/교환 요청이 승인되었습니다.' });
  } catch (error) {
    console.error('Approve return error:', error);
    res.status(500).json({ error: '승인 처리 중 오류가 발생했습니다.' });
  }
});

// 반품/교환 거절
router.put('/returns/:id/reject', [
  body('rejectReason').notEmpty().withMessage('거절 사유를 입력해주세요.')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const sellerId = req.user.id;
    const { id } = req.params;
    const { rejectReason } = req.body;

    const returnRequest = db.prepare(`
      SELECT * FROM order_returns WHERE id = ? AND seller_id = ?
    `).get(id, sellerId);

    if (!returnRequest) {
      return res.status(404).json({ error: '반품/교환 요청을 찾을 수 없습니다.' });
    }

    if (returnRequest.status !== 'pending') {
      return res.status(400).json({ error: '대기 중인 요청만 거절할 수 있습니다.' });
    }

    db.prepare(`
      UPDATE order_returns
      SET status = 'rejected', rejected_at = CURRENT_TIMESTAMP, reject_reason = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(rejectReason, id);

    res.json({ message: '반품/교환 요청이 거절되었습니다.' });
  } catch (error) {
    console.error('Reject return error:', error);
    res.status(500).json({ error: '거절 처리 중 오류가 발생했습니다.' });
  }
});

// 반품/교환 완료
router.put('/returns/:id/complete', (req, res) => {
  try {
    const sellerId = req.user.id;
    const { id } = req.params;

    const returnRequest = db.prepare(`
      SELECT * FROM order_returns WHERE id = ? AND seller_id = ?
    `).get(id, sellerId);

    if (!returnRequest) {
      return res.status(404).json({ error: '반품/교환 요청을 찾을 수 없습니다.' });
    }

    if (returnRequest.status !== 'approved') {
      return res.status(400).json({ error: '승인된 요청만 완료 처리할 수 있습니다.' });
    }

    const transaction = db.transaction(() => {
      // 반품/교환 완료 처리
      db.prepare(`
        UPDATE order_returns
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(id);

      // 반품인 경우 주문 상태 변경
      if (returnRequest.return_type === 'refund') {
        db.prepare(`
          UPDATE orders SET status = 'refunded', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(returnRequest.order_id);
      }
    });

    transaction();

    res.json({ message: '반품/교환이 완료 처리되었습니다.' });
  } catch (error) {
    console.error('Complete return error:', error);
    res.status(500).json({ error: '완료 처리 중 오류가 발생했습니다.' });
  }
});

// ==================== 정산 계좌 관리 ====================
// 정산 계좌 조회
router.get('/bank-account', (req, res) => {
  try {
    const sellerId = req.user.id;

    const account = db.prepare(`
      SELECT * FROM seller_bank_accounts WHERE seller_id = ?
    `).get(sellerId);

    res.json({ account: account || null });
  } catch (error) {
    console.error('Get bank account error:', error);
    res.status(500).json({ error: '정산 계좌 조회 중 오류가 발생했습니다.' });
  }
});

// 정산 계좌 등록/수정
router.put('/bank-account', [
  body('bankName').notEmpty().withMessage('은행명을 입력해주세요.'),
  body('bankAccount').notEmpty().withMessage('계좌번호를 입력해주세요.'),
  body('accountHolder').notEmpty().withMessage('예금주를 입력해주세요.')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const sellerId = req.user.id;
    const { bankName, bankAccount, accountHolder } = req.body;

    const existing = db.prepare('SELECT id FROM seller_bank_accounts WHERE seller_id = ?').get(sellerId);

    if (existing) {
      db.prepare(`
        UPDATE seller_bank_accounts
        SET bank_name = ?, bank_account = ?, account_holder = ?, is_verified = 0, updated_at = CURRENT_TIMESTAMP
        WHERE seller_id = ?
      `).run(bankName, bankAccount, accountHolder, sellerId);
    } else {
      db.prepare(`
        INSERT INTO seller_bank_accounts (seller_id, bank_name, bank_account, account_holder)
        VALUES (?, ?, ?, ?)
      `).run(sellerId, bankName, bankAccount, accountHolder);
    }

    res.json({ message: '정산 계좌가 등록되었습니다.' });
  } catch (error) {
    console.error('Update bank account error:', error);
    res.status(500).json({ error: '정산 계좌 등록 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
