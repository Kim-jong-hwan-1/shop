const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate, isAdmin } = require('../middlewares/auth');
const { upload, handleUploadError } = require('../middlewares/upload');
const { paginate, paginatedResponse, generateSlug } = require('../utils/helpers');

const router = express.Router();

// 모든 관리자 라우트에 인증 적용
router.use(authenticate, isAdmin);

// ==================== 대시보드 ====================
router.get('/dashboard', (req, res) => {
  try {
    // 오늘 주문
    const todayOrders = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as amount
      FROM orders WHERE DATE(created_at) = DATE('now')
    `).get();

    // 이번 달 주문
    const monthOrders = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as amount
      FROM orders WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `).get();

    // 전체 회원 수
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('user').count;

    // 신규 회원 (오늘)
    const todayUsers = db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = DATE('now') AND role = ?
    `).get('user').count;

    // 재고 부족 상품
    const lowStockProducts = db.prepare(`
      SELECT COUNT(*) as count FROM products WHERE stock <= 10 AND is_active = 1
    `).get().count;

    // 미처리 주문
    const pendingOrders = db.prepare(`
      SELECT COUNT(*) as count FROM orders WHERE status = 'paid'
    `).get().count;

    // 미답변 문의
    const pendingInquiries = db.prepare(`
      SELECT COUNT(*) as count FROM inquiries WHERE status = 'pending'
    `).get().count;

    // 최근 주문
    const recentOrders = db.prepare(`
      SELECT o.id, o.order_number, o.status, o.total_amount, o.created_at,
             u.name as user_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `).all();

    // 베스트 상품
    const bestProducts = db.prepare(`
      SELECT id, name, sale_count, stock
      FROM products
      WHERE is_active = 1
      ORDER BY sale_count DESC
      LIMIT 5
    `).all();

    res.json({
      todayOrders,
      monthOrders,
      totalUsers,
      todayUsers,
      lowStockProducts,
      pendingOrders,
      pendingInquiries,
      recentOrders,
      bestProducts
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: '대시보드 데이터 조회 중 오류가 발생했습니다.' });
  }
});

// ==================== 상품 관리 ====================
// 상품 목록
router.get('/products', (req, res) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { category, search, status } = req.query;

    let whereClause = '1=1';
    const params = [];

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
    console.error('Admin get products error:', error);
    res.status(500).json({ error: '상품 목록 조회 중 오류가 발생했습니다.' });
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

    const {
      name, categoryId, description, shortDescription, price, salePrice,
      stock, sku, weight, isFeatured
    } = req.body;

    const slug = generateSlug(name) + '-' + Date.now();

    const result = db.prepare(`
      INSERT INTO products (name, slug, category_id, description, short_description,
                           price, sale_price, stock, sku, weight, is_featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, slug, categoryId, description || null, shortDescription || null,
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
    console.error('Create product error:', error);
    res.status(500).json({ error: '상품 등록 중 오류가 발생했습니다.' });
  }
});

// 상품 수정
router.put('/products/:id', upload.array('images', 10), handleUploadError, (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, categoryId, description, shortDescription, price, salePrice,
      stock, sku, weight, isFeatured, isActive
    } = req.body;

    const product = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
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
      WHERE id = ?
    `).run(
      name || null, categoryId || null, description || null, shortDescription || null,
      price || null, salePrice || null, stock || null, sku || null, weight || null,
      isFeatured !== undefined ? (isFeatured ? 1 : 0) : null,
      isActive !== undefined ? (isActive ? 1 : 0) : null,
      id
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
    console.error('Update product error:', error);
    res.status(500).json({ error: '상품 수정 중 오류가 발생했습니다.' });
  }
});

// 상품 삭제
router.delete('/products/:id', (req, res) => {
  try {
    const { id } = req.params;

    // 주문된 상품인지 확인
    const ordered = db.prepare('SELECT id FROM order_items WHERE product_id = ? LIMIT 1').get(id);
    if (ordered) {
      // 비활성화만 수행
      db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(id);
      return res.json({ message: '주문 내역이 있어 비활성화 처리되었습니다.' });
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ message: '상품이 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: '상품 삭제 중 오류가 발생했습니다.' });
  }
});

// ==================== 주문 관리 ====================
router.get('/orders', (req, res) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { status, search, startDate, endDate } = req.query;

    let whereClause = '1=1';
    const params = [];

    if (status) {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }

    if (search) {
      whereClause += ' AND (o.order_number LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
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
      SELECT COUNT(*) as count FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE ${whereClause}
    `).get(...params).count;

    const orders = db.prepare(`
      SELECT o.*, u.name as user_name, u.email as user_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json(paginatedResponse(orders, total, page, limit));
  } catch (error) {
    console.error('Admin get orders error:', error);
    res.status(500).json({ error: '주문 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 주문 상태 변경
router.put('/orders/:id/status', [
  body('status').isIn(['pending', 'paid', 'preparing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'])
    .withMessage('유효하지 않은 상태입니다.')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status, trackingNumber } = req.body;

    const updateFields = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const params = [status];

    if (status === 'shipped' && trackingNumber) {
      updateFields.push('tracking_number = ?', 'shipped_at = CURRENT_TIMESTAMP');
      params.push(trackingNumber);
    }

    if (status === 'delivered') {
      updateFields.push('delivered_at = CURRENT_TIMESTAMP');
    }

    params.push(id);

    db.prepare(`UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`).run(...params);

    res.json({ message: '주문 상태가 변경되었습니다.' });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: '주문 상태 변경 중 오류가 발생했습니다.' });
  }
});

// ==================== 회원 관리 ====================
router.get('/users', (req, res) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { search, role } = req.query;

    let whereClause = '1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (email LIKE ? OR name LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (role) {
      whereClause += ' AND role = ?';
      params.push(role);
    }

    const total = db.prepare(`SELECT COUNT(*) as count FROM users WHERE ${whereClause}`).get(...params).count;

    const users = db.prepare(`
      SELECT id, email, name, phone, role, point, is_active, created_at, last_login,
             (SELECT COUNT(*) FROM orders WHERE user_id = users.id) as order_count,
             (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE user_id = users.id AND status NOT IN ('cancelled', 'refunded')) as total_spent
      FROM users
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json(paginatedResponse(users, total, page, limit));
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ error: '회원 목록 조회 중 오류가 발생했습니다.' });
  }
});

// ==================== 문의 관리 ====================
router.get('/inquiries', (req, res) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { status } = req.query;

    let whereClause = '1=1';
    const params = [];

    if (status) {
      whereClause += ' AND i.status = ?';
      params.push(status);
    }

    const total = db.prepare(`SELECT COUNT(*) as count FROM inquiries i WHERE ${whereClause}`).get(...params).count;

    const inquiries = db.prepare(`
      SELECT i.*, u.name as user_name, u.email as user_email
      FROM inquiries i
      JOIN users u ON i.user_id = u.id
      WHERE ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json(paginatedResponse(inquiries, total, page, limit));
  } catch (error) {
    console.error('Admin get inquiries error:', error);
    res.status(500).json({ error: '문의 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 문의 답변
router.post('/inquiries/:id/reply', [
  body('reply').notEmpty().withMessage('답변 내용을 입력해주세요.')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { reply } = req.body;

    db.prepare(`
      UPDATE inquiries SET
        admin_reply = ?,
        admin_reply_at = CURRENT_TIMESTAMP,
        status = 'answered',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(reply, id);

    res.json({ message: '답변이 등록되었습니다.' });
  } catch (error) {
    console.error('Reply inquiry error:', error);
    res.status(500).json({ error: '답변 등록 중 오류가 발생했습니다.' });
  }
});

// ==================== 카테고리 관리 ====================
// 카테고리 목록 조회
router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT c.id, c.name, c.slug, c.description, c.parent_id, c.sort_order, c.is_active,
             (SELECT COUNT(*) FROM products WHERE category_id = c.id) as product_count
      FROM categories c
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
    console.error('Admin get categories error:', error);
    res.status(500).json({ error: '카테고리 목록 조회 중 오류가 발생했습니다.' });
  }
});

router.post('/categories', [
  body('name').notEmpty().withMessage('카테고리명을 입력해주세요.')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, parentId, sortOrder } = req.body;
    const slug = generateSlug(name);

    const result = db.prepare(`
      INSERT INTO categories (name, slug, description, parent_id, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, slug, description || null, parentId || null, sortOrder || 0);

    res.status(201).json({
      message: '카테고리가 등록되었습니다.',
      categoryId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: '카테고리 등록 중 오류가 발생했습니다.' });
  }
});

router.put('/categories/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, parentId, sortOrder, isActive } = req.body;

    db.prepare(`
      UPDATE categories SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        parent_id = ?,
        sort_order = COALESCE(?, sort_order),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(
      name || null, description || null, parentId || null,
      sortOrder || null, isActive !== undefined ? (isActive ? 1 : 0) : null, id
    );

    res.json({ message: '카테고리가 수정되었습니다.' });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: '카테고리 수정 중 오류가 발생했습니다.' });
  }
});

// 카테고리 삭제
router.delete('/categories/:id', (req, res) => {
  try {
    const { id } = req.params;

    // 해당 카테고리의 상품 수 확인
    const productCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?').get(id).count;

    if (productCount > 0) {
      // 상품이 있으면 미분류(null)로 변경
      db.prepare('UPDATE products SET category_id = NULL WHERE category_id = ?').run(id);
    }

    // 하위 카테고리가 있으면 상위로 올림
    db.prepare('UPDATE categories SET parent_id = NULL WHERE parent_id = ?').run(id);

    // 카테고리 삭제
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);

    res.json({ message: '카테고리가 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: '카테고리 삭제 중 오류가 발생했습니다.' });
  }
});

// ==================== 쿠폰 관리 ====================
router.get('/coupons', (req, res) => {
  try {
    const coupons = db.prepare(`
      SELECT * FROM coupons ORDER BY created_at DESC
    `).all();

    res.json({ coupons });
  } catch (error) {
    console.error('Admin get coupons error:', error);
    res.status(500).json({ error: '쿠폰 목록 조회 중 오류가 발생했습니다.' });
  }
});

router.post('/coupons', [
  body('code').notEmpty().withMessage('쿠폰 코드를 입력해주세요.'),
  body('name').notEmpty().withMessage('쿠폰명을 입력해주세요.'),
  body('discountType').isIn(['percentage', 'fixed']).withMessage('할인 유형을 선택해주세요.'),
  body('discountValue').isInt({ min: 1 }).withMessage('할인 값을 입력해주세요.'),
  body('startDate').notEmpty().withMessage('시작일을 입력해주세요.'),
  body('endDate').notEmpty().withMessage('종료일을 입력해주세요.')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      code, name, description, discountType, discountValue,
      minOrderAmount, maxDiscountAmount, startDate, endDate, usageLimit
    } = req.body;

    const result = db.prepare(`
      INSERT INTO coupons (code, name, description, discount_type, discount_value,
                          min_order_amount, max_discount_amount, start_date, end_date, usage_limit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      code.toUpperCase(), name, description || null, discountType, discountValue,
      minOrderAmount || 0, maxDiscountAmount || null, startDate, endDate, usageLimit || null
    );

    res.status(201).json({
      message: '쿠폰이 등록되었습니다.',
      couponId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(500).json({ error: '쿠폰 등록 중 오류가 발생했습니다.' });
  }
});

// ==================== 공지사항 관리 ====================
router.post('/notices', [
  body('title').notEmpty().withMessage('제목을 입력해주세요.'),
  body('content').notEmpty().withMessage('내용을 입력해주세요.')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, content, isImportant } = req.body;

    const result = db.prepare(`
      INSERT INTO notices (title, content, is_important)
      VALUES (?, ?, ?)
    `).run(title, content, isImportant ? 1 : 0);

    res.status(201).json({
      message: '공지사항이 등록되었습니다.',
      noticeId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Create notice error:', error);
    res.status(500).json({ error: '공지사항 등록 중 오류가 발생했습니다.' });
  }
});

router.put('/notices/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, isImportant, isActive } = req.body;

    db.prepare(`
      UPDATE notices SET
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        is_important = COALESCE(?, is_important),
        is_active = COALESCE(?, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title || null, content || null,
      isImportant !== undefined ? (isImportant ? 1 : 0) : null,
      isActive !== undefined ? (isActive ? 1 : 0) : null,
      id
    );

    res.json({ message: '공지사항이 수정되었습니다.' });
  } catch (error) {
    console.error('Update notice error:', error);
    res.status(500).json({ error: '공지사항 수정 중 오류가 발생했습니다.' });
  }
});

router.delete('/notices/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM notices WHERE id = ?').run(id);
    res.json({ message: '공지사항이 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete notice error:', error);
    res.status(500).json({ error: '공지사항 삭제 중 오류가 발생했습니다.' });
  }
});

// ==================== 든든케어 관리 ====================
const DDCARE_TYPES = {
  BASIC_LIVELIHOOD: '기초생활수급자',
  SECOND_CLASS: '차상위계층',
  SINGLE_PARENT: '한부모가정',
  DISABLED: '장애인',
  NATIONAL_MERIT: '국가유공자',
  MULTICULTURAL: '다문화가정'
};

// 든든케어 신청 목록 조회
router.get('/ddcare', (req, res) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { status } = req.query;

    let whereClause = '1=1';
    const params = [];

    if (status) {
      whereClause += ' AND da.status = ?';
      params.push(status);
    }

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM ddcare_applications da WHERE ${whereClause}
    `).get(...params).count;

    const applications = db.prepare(`
      SELECT da.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
             r.name as reviewed_by_name
      FROM ddcare_applications da
      JOIN users u ON da.user_id = u.id
      LEFT JOIN users r ON da.reviewed_by = r.id
      WHERE ${whereClause}
      ORDER BY da.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    // 타입 이름 추가
    const applicationsWithTypeName = applications.map(app => ({
      ...app,
      ddcare_type_name: DDCARE_TYPES[app.ddcare_type] || app.ddcare_type
    }));

    res.json(paginatedResponse(applicationsWithTypeName, total, page, limit));
  } catch (error) {
    console.error('Admin get ddcare applications error:', error);
    res.status(500).json({ error: '든든케어 신청 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 든든케어 신청 상세 조회
router.get('/ddcare/:id', (req, res) => {
  try {
    const { id } = req.params;

    const application = db.prepare(`
      SELECT da.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
             u.ddcare_status as user_ddcare_status, u.ddcare_type as user_ddcare_type,
             u.ddcare_expires_at as user_ddcare_expires_at,
             r.name as reviewed_by_name
      FROM ddcare_applications da
      JOIN users u ON da.user_id = u.id
      LEFT JOIN users r ON da.reviewed_by = r.id
      WHERE da.id = ?
    `).get(id);

    if (!application) {
      return res.status(404).json({ error: '신청을 찾을 수 없습니다.' });
    }

    application.ddcare_type_name = DDCARE_TYPES[application.ddcare_type] || application.ddcare_type;

    res.json({ application });
  } catch (error) {
    console.error('Admin get ddcare application error:', error);
    res.status(500).json({ error: '든든케어 신청 조회 중 오류가 발생했습니다.' });
  }
});

// 든든케어 승인
router.put('/ddcare/:id/approve', [
  body('adminMemo').optional()
], (req, res) => {
  try {
    const { id } = req.params;
    const { adminMemo } = req.body;

    const application = db.prepare('SELECT * FROM ddcare_applications WHERE id = ?').get(id);

    if (!application) {
      return res.status(404).json({ error: '신청을 찾을 수 없습니다.' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ error: '대기 중인 신청만 승인할 수 있습니다.' });
    }

    const transaction = db.transaction(() => {
      // 신청 상태 업데이트
      db.prepare(`
        UPDATE ddcare_applications
        SET status = 'approved', admin_memo = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(adminMemo || null, req.user.id, id);

      // 사용자 상태 업데이트 (승인일로부터 1년)
      const approvedAt = new Date();
      const expiresAt = new Date(approvedAt);
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      db.prepare(`
        UPDATE users
        SET ddcare_status = 'approved',
            ddcare_type = ?,
            ddcare_approved_at = ?,
            ddcare_expires_at = ?
        WHERE id = ?
      `).run(
        application.ddcare_type,
        approvedAt.toISOString(),
        expiresAt.toISOString(),
        application.user_id
      );
    });

    transaction();

    res.json({ message: '든든케어 신청이 승인되었습니다.' });
  } catch (error) {
    console.error('Approve ddcare error:', error);
    res.status(500).json({ error: '승인 처리 중 오류가 발생했습니다.' });
  }
});

// 든든케어 거절
router.put('/ddcare/:id/reject', [
  body('adminMemo').notEmpty().withMessage('거절 사유를 입력해주세요.')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { adminMemo } = req.body;

    const application = db.prepare('SELECT * FROM ddcare_applications WHERE id = ?').get(id);

    if (!application) {
      return res.status(404).json({ error: '신청을 찾을 수 없습니다.' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ error: '대기 중인 신청만 거절할 수 있습니다.' });
    }

    const transaction = db.transaction(() => {
      // 신청 상태 업데이트
      db.prepare(`
        UPDATE ddcare_applications
        SET status = 'rejected', admin_memo = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(adminMemo, req.user.id, id);

      // 사용자 상태 업데이트 (기존에 approved가 아니면 rejected로)
      const user = db.prepare('SELECT ddcare_status FROM users WHERE id = ?').get(application.user_id);
      if (user.ddcare_status === 'pending') {
        db.prepare(`
          UPDATE users SET ddcare_status = 'rejected' WHERE id = ?
        `).run(application.user_id);
      }
    });

    transaction();

    res.json({ message: '든든케어 신청이 거절되었습니다.' });
  } catch (error) {
    console.error('Reject ddcare error:', error);
    res.status(500).json({ error: '거절 처리 중 오류가 발생했습니다.' });
  }
});

// 든든케어 통계
router.get('/ddcare-stats', (req, res) => {
  try {
    const pending = db.prepare(`
      SELECT COUNT(*) as count FROM ddcare_applications WHERE status = 'pending'
    `).get().count;

    const approved = db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE ddcare_status = 'approved'
    `).get().count;

    const totalApplications = db.prepare(`
      SELECT COUNT(*) as count FROM ddcare_applications
    `).get().count;

    const byType = db.prepare(`
      SELECT ddcare_type, COUNT(*) as count
      FROM users
      WHERE ddcare_status = 'approved'
      GROUP BY ddcare_type
    `).all();

    res.json({
      pending,
      approved,
      totalApplications,
      byType: byType.map(item => ({
        type: item.ddcare_type,
        typeName: DDCARE_TYPES[item.ddcare_type] || item.ddcare_type,
        count: item.count
      }))
    });
  } catch (error) {
    console.error('Get ddcare stats error:', error);
    res.status(500).json({ error: '통계 조회 중 오류가 발생했습니다.' });
  }
});

// ==================== 판매자 관리 ====================
// 판매자 목록 조회
router.get('/sellers', (req, res) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { status, search } = req.query;

    let whereClause = 'seller_status IS NOT NULL';
    const params = [];

    if (status) {
      whereClause += ' AND seller_status = ?';
      params.push(status);
    }

    if (search) {
      whereClause += ' AND (email LIKE ? OR name LIKE ? OR seller_business_name LIKE ? OR seller_business_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const total = db.prepare(`SELECT COUNT(*) as count FROM users WHERE ${whereClause}`).get(...params).count;

    const sellers = db.prepare(`
      SELECT id, email, name, phone, seller_business_name, seller_business_number,
             seller_status, seller_approved_at, created_at,
             (SELECT COUNT(*) FROM products WHERE seller_id = users.id) as product_count
      FROM users
      WHERE ${whereClause}
      ORDER BY
        CASE seller_status
          WHEN 'pending' THEN 1
          WHEN 'approved' THEN 2
          WHEN 'rejected' THEN 3
        END,
        created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json(paginatedResponse(sellers, total, page, limit));
  } catch (error) {
    console.error('Admin get sellers error:', error);
    res.status(500).json({ error: '판매자 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 판매자 상세 조회
router.get('/sellers/:id', (req, res) => {
  try {
    const { id } = req.params;

    const seller = db.prepare(`
      SELECT id, email, name, phone, seller_business_name, seller_business_number,
             seller_status, seller_approved_at, created_at,
             (SELECT COUNT(*) FROM products WHERE seller_id = users.id) as product_count,
             (SELECT COUNT(*) FROM products WHERE seller_id = users.id AND is_active = 1) as active_product_count
      FROM users
      WHERE id = ? AND seller_status IS NOT NULL
    `).get(id);

    if (!seller) {
      return res.status(404).json({ error: '판매자를 찾을 수 없습니다.' });
    }

    // 최근 상품 목록
    const recentProducts = db.prepare(`
      SELECT id, name, price, sale_price, stock, is_active, created_at
      FROM products
      WHERE seller_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `).all(id);

    res.json({
      seller: {
        ...seller,
        recentProducts
      }
    });
  } catch (error) {
    console.error('Admin get seller detail error:', error);
    res.status(500).json({ error: '판매자 정보 조회 중 오류가 발생했습니다.' });
  }
});

// 판매자 승인
router.put('/sellers/:id/approve', (req, res) => {
  try {
    const { id } = req.params;

    const seller = db.prepare('SELECT id, seller_status FROM users WHERE id = ? AND seller_status IS NOT NULL').get(id);

    if (!seller) {
      return res.status(404).json({ error: '판매자를 찾을 수 없습니다.' });
    }

    if (seller.seller_status === 'approved') {
      return res.status(400).json({ error: '이미 승인된 판매자입니다.' });
    }

    db.prepare(`
      UPDATE users
      SET seller_status = 'approved', seller_approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);

    res.json({ message: '판매자가 승인되었습니다.' });
  } catch (error) {
    console.error('Approve seller error:', error);
    res.status(500).json({ error: '판매자 승인 중 오류가 발생했습니다.' });
  }
});

// 판매자 거절
router.put('/sellers/:id/reject', (req, res) => {
  try {
    const { id } = req.params;

    const seller = db.prepare('SELECT id, seller_status FROM users WHERE id = ? AND seller_status IS NOT NULL').get(id);

    if (!seller) {
      return res.status(404).json({ error: '판매자를 찾을 수 없습니다.' });
    }

    if (seller.seller_status === 'rejected') {
      return res.status(400).json({ error: '이미 거절된 판매자입니다.' });
    }

    db.prepare(`
      UPDATE users
      SET seller_status = 'rejected', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);

    res.json({ message: '판매자가 거절되었습니다.' });
  } catch (error) {
    console.error('Reject seller error:', error);
    res.status(500).json({ error: '판매자 거절 중 오류가 발생했습니다.' });
  }
});

// 판매자 통계
router.get('/seller-stats', (req, res) => {
  try {
    const pending = db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE seller_status = 'pending'
    `).get().count;

    const approved = db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE seller_status = 'approved'
    `).get().count;

    const rejected = db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE seller_status = 'rejected'
    `).get().count;

    const totalSellerProducts = db.prepare(`
      SELECT COUNT(*) as count FROM products WHERE seller_id IS NOT NULL
    `).get().count;

    res.json({
      pending,
      approved,
      rejected,
      totalSellerProducts
    });
  } catch (error) {
    console.error('Get seller stats error:', error);
    res.status(500).json({ error: '통계 조회 중 오류가 발생했습니다.' });
  }
});

// ==================== 정산 관리 ====================
// 전체 정산 목록
router.get('/settlements', (req, res) => {
  try {
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { status, sellerId, year, month } = req.query;

    let whereClause = '1=1';
    const params = [];

    if (status) {
      whereClause += ' AND s.status = ?';
      params.push(status);
    }

    if (sellerId) {
      whereClause += ' AND s.seller_id = ?';
      params.push(sellerId);
    }

    if (year) {
      whereClause += ' AND strftime(\'%Y\', s.settlement_period_start) = ?';
      params.push(year);
    }

    if (month) {
      whereClause += ' AND strftime(\'%m\', s.settlement_period_start) = ?';
      params.push(month.padStart(2, '0'));
    }

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM seller_settlements s WHERE ${whereClause}
    `).get(...params).count;

    const settlements = db.prepare(`
      SELECT s.*, u.name as seller_name, u.email as seller_email, u.seller_business_name
      FROM seller_settlements s
      JOIN users u ON s.seller_id = u.id
      WHERE ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json(paginatedResponse(settlements, total, page, limit));
  } catch (error) {
    console.error('Admin get settlements error:', error);
    res.status(500).json({ error: '정산 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 정산 생성 (월말 자동/수동)
router.post('/settlements/generate', (req, res) => {
  try {
    const { year, month, sellerId } = req.body;

    // 기간 설정 (지정 월 또는 지난달)
    let periodStart, periodEnd;
    if (year && month) {
      periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      periodEnd = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    } else {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      periodStart = lastMonth.toISOString().split('T')[0];
      const lastDay = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).getDate();
      periodEnd = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-${lastDay}`;
    }

    // 정산 예정일 (익월 15일)
    const scheduleDate = new Date(periodEnd);
    scheduleDate.setMonth(scheduleDate.getMonth() + 1);
    scheduleDate.setDate(15);

    // 대상 판매자 목록
    let sellerCondition = "seller_status = 'approved'";
    const sellerParams = [];
    if (sellerId) {
      sellerCondition += ' AND id = ?';
      sellerParams.push(sellerId);
    }

    const sellers = db.prepare(`
      SELECT id FROM users WHERE ${sellerCondition}
    `).all(...sellerParams);

    const results = [];
    const commissionRate = 10.00; // 10% 수수료

    const transaction = db.transaction(() => {
      for (const seller of sellers) {
        // 이미 해당 기간 정산이 있는지 확인
        const existing = db.prepare(`
          SELECT id FROM seller_settlements
          WHERE seller_id = ? AND settlement_period_start = ? AND settlement_period_end = ?
        `).get(seller.id, periodStart, periodEnd);

        if (existing) {
          results.push({ sellerId: seller.id, status: 'skipped', reason: '이미 정산 내역 존재' });
          continue;
        }

        // 해당 기간 판매 데이터 조회
        const salesData = db.prepare(`
          SELECT
            COALESCE(SUM(oi.total_price), 0) as total_sales,
            COUNT(DISTINCT o.id) as order_count
          FROM orders o
          JOIN order_items oi ON o.id = oi.order_id
          JOIN products p ON oi.product_id = p.id
          WHERE p.seller_id = ?
            AND o.status IN ('delivered', 'completed')
            AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?
        `).get(seller.id, periodStart, periodEnd);

        if (salesData.total_sales === 0) {
          results.push({ sellerId: seller.id, status: 'skipped', reason: '판매 내역 없음' });
          continue;
        }

        // 환불 금액 조회
        const refundData = db.prepare(`
          SELECT COALESCE(SUM(r.refund_amount), 0) as refund_amount
          FROM order_returns r
          WHERE r.seller_id = ? AND r.status = 'completed'
            AND DATE(r.completed_at) >= ? AND DATE(r.completed_at) <= ?
        `).get(seller.id, periodStart, periodEnd);

        const totalSales = salesData.total_sales;
        const refundAmount = refundData.refund_amount;
        const netSales = totalSales - refundAmount;
        const commissionAmount = Math.floor(netSales * commissionRate / 100);
        const settlementAmount = netSales - commissionAmount;

        // 정산 번호 생성
        const settlementNumber = `SET-${periodStart.replace(/-/g, '')}-${seller.id}-${Date.now()}`;

        // 판매자 계좌 정보 조회
        const bankAccount = db.prepare(`
          SELECT bank_name, bank_account, account_holder
          FROM seller_bank_accounts WHERE seller_id = ?
        `).get(seller.id);

        // 정산 데이터 삽입
        const result = db.prepare(`
          INSERT INTO seller_settlements (
            seller_id, settlement_number, settlement_period_start, settlement_period_end,
            total_sales_amount, net_sales_amount, commission_rate, commission_amount,
            refund_amount, settlement_amount, status, scheduled_date,
            bank_name, bank_account, account_holder
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
        `).run(
          seller.id, settlementNumber, periodStart, periodEnd,
          totalSales, netSales, commissionRate, commissionAmount,
          refundAmount, settlementAmount, scheduleDate.toISOString().split('T')[0],
          bankAccount?.bank_name || null, bankAccount?.bank_account || null, bankAccount?.account_holder || null
        );

        const settlementId = result.lastInsertRowid;

        // 정산 상세 항목 삽입
        const orderItems = db.prepare(`
          SELECT oi.id as order_item_id, oi.order_id, oi.product_id, oi.product_name,
                 oi.quantity, oi.total_price
          FROM orders o
          JOIN order_items oi ON o.id = oi.order_id
          JOIN products p ON oi.product_id = p.id
          WHERE p.seller_id = ?
            AND o.status IN ('delivered', 'completed')
            AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?
        `).all(seller.id, periodStart, periodEnd);

        const insertItem = db.prepare(`
          INSERT INTO settlement_items (
            settlement_id, order_id, order_item_id, product_id, product_name,
            quantity, item_amount, commission_amount
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const item of orderItems) {
          const itemCommission = Math.floor(item.total_price * commissionRate / 100);
          insertItem.run(
            settlementId, item.order_id, item.order_item_id, item.product_id,
            item.product_name, item.quantity, item.total_price, itemCommission
          );
        }

        results.push({
          sellerId: seller.id,
          status: 'created',
          settlementId,
          settlementAmount
        });
      }
    });

    transaction();

    res.json({
      message: '정산 생성이 완료되었습니다.',
      period: { start: periodStart, end: periodEnd },
      results
    });
  } catch (error) {
    console.error('Generate settlements error:', error);
    res.status(500).json({ error: '정산 생성 중 오류가 발생했습니다.' });
  }
});

// 정산 처리 (지급 완료)
router.put('/settlements/:id/process', (req, res) => {
  try {
    const { id } = req.params;
    const { memo } = req.body;

    const settlement = db.prepare('SELECT * FROM seller_settlements WHERE id = ?').get(id);

    if (!settlement) {
      return res.status(404).json({ error: '정산 내역을 찾을 수 없습니다.' });
    }

    if (settlement.status !== 'pending') {
      return res.status(400).json({ error: '대기 중인 정산만 처리할 수 있습니다.' });
    }

    db.prepare(`
      UPDATE seller_settlements
      SET status = 'completed', paid_at = CURRENT_TIMESTAMP, memo = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(memo || null, id);

    res.json({ message: '정산이 완료 처리되었습니다.' });
  } catch (error) {
    console.error('Process settlement error:', error);
    res.status(500).json({ error: '정산 처리 중 오류가 발생했습니다.' });
  }
});

// 정산 취소
router.put('/settlements/:id/cancel', [
  body('reason').notEmpty().withMessage('취소 사유를 입력해주세요.')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { reason } = req.body;

    const settlement = db.prepare('SELECT * FROM seller_settlements WHERE id = ?').get(id);

    if (!settlement) {
      return res.status(404).json({ error: '정산 내역을 찾을 수 없습니다.' });
    }

    if (settlement.status === 'completed') {
      return res.status(400).json({ error: '이미 완료된 정산은 취소할 수 없습니다.' });
    }

    db.prepare(`
      UPDATE seller_settlements
      SET status = 'cancelled', memo = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(reason, id);

    res.json({ message: '정산이 취소되었습니다.' });
  } catch (error) {
    console.error('Cancel settlement error:', error);
    res.status(500).json({ error: '정산 취소 중 오류가 발생했습니다.' });
  }
});

// 정산 통계
router.get('/settlement-stats', (req, res) => {
  try {
    // 대기 중 정산
    const pending = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(settlement_amount), 0) as amount
      FROM seller_settlements WHERE status = 'pending'
    `).get();

    // 이번 달 완료 정산
    const completedThisMonth = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(settlement_amount), 0) as amount
      FROM seller_settlements
      WHERE status = 'completed'
        AND strftime('%Y-%m', paid_at) = strftime('%Y-%m', 'now')
    `).get();

    // 총 정산 완료
    const totalCompleted = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(settlement_amount), 0) as amount
      FROM seller_settlements WHERE status = 'completed'
    `).get();

    // 월별 정산 현황 (최근 6개월)
    const monthlyStats = db.prepare(`
      SELECT
        strftime('%Y-%m', settlement_period_start) as month,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'completed' THEN settlement_amount ELSE 0 END) as completed_amount,
        SUM(CASE WHEN status = 'pending' THEN settlement_amount ELSE 0 END) as pending_amount
      FROM seller_settlements
      WHERE settlement_period_start >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', settlement_period_start)
      ORDER BY month DESC
    `).all();

    res.json({
      pending,
      completedThisMonth,
      totalCompleted,
      monthlyStats
    });
  } catch (error) {
    console.error('Get settlement stats error:', error);
    res.status(500).json({ error: '정산 통계 조회 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
