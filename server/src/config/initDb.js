const db = require('./database');

const initDatabase = () => {
  console.log('데이터베이스 초기화 시작...');

  // 사용자 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(20),
      birth_date DATE,
      gender VARCHAR(10),
      zipcode VARCHAR(10),
      address VARCHAR(255),
      address_detail VARCHAR(255),
      role VARCHAR(20) DEFAULT 'user',
      marketing_agree BOOLEAN DEFAULT 0,
      email_agree BOOLEAN DEFAULT 0,
      sms_agree BOOLEAN DEFAULT 0,
      point INTEGER DEFAULT 0,
      ddcare_status VARCHAR(20) DEFAULT NULL,
      ddcare_type VARCHAR(50) DEFAULT NULL,
      ddcare_approved_at DATETIME DEFAULT NULL,
      ddcare_expires_at DATETIME DEFAULT NULL,
      seller_business_name VARCHAR(100) DEFAULT NULL,
      seller_business_number VARCHAR(20) DEFAULT NULL,
      seller_status VARCHAR(20) DEFAULT NULL,
      seller_approved_at DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      is_active BOOLEAN DEFAULT 1
    )
  `);

  // 카테고리 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      parent_id INTEGER,
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES categories(id)
    )
  `);

  // 상품 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      seller_id INTEGER DEFAULT NULL,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      description TEXT,
      short_description VARCHAR(500),
      price INTEGER NOT NULL,
      sale_price INTEGER,
      stock INTEGER DEFAULT 0,
      sku VARCHAR(100) UNIQUE,
      weight INTEGER,
      is_featured BOOLEAN DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      view_count INTEGER DEFAULT 0,
      sale_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (seller_id) REFERENCES users(id)
    )
  `);

  // 상품 이미지 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      image_url VARCHAR(500) NOT NULL,
      alt_text VARCHAR(255),
      sort_order INTEGER DEFAULT 0,
      is_primary BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  // 상품 옵션 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      name VARCHAR(100) NOT NULL,
      value VARCHAR(255) NOT NULL,
      price_adjustment INTEGER DEFAULT 0,
      stock INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  // 장바구니 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_option_id INTEGER,
      quantity INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (product_option_id) REFERENCES product_options(id)
    )
  `);

  // 주문 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_number VARCHAR(50) UNIQUE NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      total_amount INTEGER NOT NULL,
      discount_amount INTEGER DEFAULT 0,
      shipping_fee INTEGER DEFAULT 0,
      used_point INTEGER DEFAULT 0,
      earned_point INTEGER DEFAULT 0,
      payment_method VARCHAR(50),
      payment_status VARCHAR(50) DEFAULT 'pending',
      payment_key VARCHAR(255),
      recipient_name VARCHAR(100) NOT NULL,
      recipient_phone VARCHAR(20) NOT NULL,
      zipcode VARCHAR(10) NOT NULL,
      address VARCHAR(255) NOT NULL,
      address_detail VARCHAR(255),
      delivery_memo VARCHAR(500),
      tracking_number VARCHAR(100),
      shipped_at DATETIME,
      delivered_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 주문 상품 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_option_id INTEGER,
      product_name VARCHAR(255) NOT NULL,
      option_name VARCHAR(255),
      price INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      total_price INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (product_option_id) REFERENCES product_options(id)
    )
  `);

  // 리뷰 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      order_id INTEGER,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      title VARCHAR(255),
      content TEXT,
      image_url VARCHAR(500),
      is_visible BOOLEAN DEFAULT 1,
      admin_reply TEXT,
      admin_reply_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `);

  // 위시리스트 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS wishlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, product_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  // 쿠폰 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      discount_type VARCHAR(20) NOT NULL,
      discount_value INTEGER NOT NULL,
      min_order_amount INTEGER DEFAULT 0,
      max_discount_amount INTEGER,
      start_date DATETIME NOT NULL,
      end_date DATETIME NOT NULL,
      usage_limit INTEGER,
      used_count INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 사용자 쿠폰 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      coupon_id INTEGER NOT NULL,
      is_used BOOLEAN DEFAULT 0,
      used_at DATETIME,
      order_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (coupon_id) REFERENCES coupons(id),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `);

  // 포인트 내역 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS point_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      type VARCHAR(50) NOT NULL,
      description VARCHAR(255),
      order_id INTEGER,
      balance_after INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `);

  // 배너 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title VARCHAR(255) NOT NULL,
      subtitle VARCHAR(500),
      image_url VARCHAR(500) NOT NULL,
      link_url VARCHAR(500),
      position VARCHAR(50) DEFAULT 'main',
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      start_date DATETIME,
      end_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 공지사항 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      is_important BOOLEAN DEFAULT 0,
      view_count INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // FAQ 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category VARCHAR(100) NOT NULL,
      question VARCHAR(500) NOT NULL,
      answer TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 1:1 문의 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_id INTEGER,
      category VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      image_url VARCHAR(500),
      status VARCHAR(50) DEFAULT 'pending',
      admin_reply TEXT,
      admin_reply_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `);

  // 약관 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS terms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      version VARCHAR(20) NOT NULL,
      is_required BOOLEAN DEFAULT 1,
      is_active BOOLEAN DEFAULT 1,
      effective_date DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 결제 내역 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      payment_key VARCHAR(255) UNIQUE,
      order_number VARCHAR(50) NOT NULL,
      amount INTEGER NOT NULL,
      method VARCHAR(50),
      status VARCHAR(50) DEFAULT 'pending',
      approved_at DATETIME,
      receipt_url VARCHAR(500),
      card_company VARCHAR(50),
      card_number VARCHAR(50),
      installment_months INTEGER DEFAULT 0,
      easy_pay_provider VARCHAR(50),
      failed_reason VARCHAR(500),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `);

  // 환불 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS refunds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      payment_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      reason VARCHAR(500),
      status VARCHAR(50) DEFAULT 'pending',
      refund_key VARCHAR(255),
      approved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (payment_id) REFERENCES payments(id)
    )
  `);

  // 든든케어 신청 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS ddcare_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      ddcare_type VARCHAR(50) NOT NULL,
      document_url VARCHAR(500) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      admin_memo TEXT,
      reviewed_by INTEGER,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
    )
  `);

  // 판매자 정산 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS seller_settlements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_id INTEGER NOT NULL,
      settlement_number VARCHAR(50) UNIQUE NOT NULL,
      settlement_period_start DATE NOT NULL,
      settlement_period_end DATE NOT NULL,
      total_sales_amount INTEGER NOT NULL DEFAULT 0,
      discount_amount INTEGER DEFAULT 0,
      net_sales_amount INTEGER NOT NULL DEFAULT 0,
      commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00,
      commission_amount INTEGER NOT NULL DEFAULT 0,
      refund_amount INTEGER DEFAULT 0,
      settlement_amount INTEGER NOT NULL DEFAULT 0,
      status VARCHAR(20) DEFAULT 'pending',
      scheduled_date DATE,
      paid_at DATETIME,
      bank_name VARCHAR(50),
      bank_account VARCHAR(50),
      account_holder VARCHAR(50),
      memo TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (seller_id) REFERENCES users(id)
    )
  `);

  // 정산 상세 항목 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS settlement_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      settlement_id INTEGER NOT NULL,
      order_id INTEGER NOT NULL,
      order_item_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name VARCHAR(255),
      quantity INTEGER NOT NULL,
      item_amount INTEGER NOT NULL,
      commission_amount INTEGER NOT NULL DEFAULT 0,
      is_refunded BOOLEAN DEFAULT 0,
      refund_amount INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (settlement_id) REFERENCES seller_settlements(id),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `);

  // 반품/교환 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      order_item_id INTEGER NOT NULL,
      seller_id INTEGER NOT NULL,
      return_type VARCHAR(20) NOT NULL,
      reason TEXT NOT NULL,
      status VARCHAR(30) DEFAULT 'pending',
      quantity INTEGER NOT NULL,
      refund_amount INTEGER NOT NULL DEFAULT 0,
      return_tracking_number VARCHAR(100),
      return_shipped_at DATETIME,
      approved_at DATETIME,
      rejected_at DATETIME,
      completed_at DATETIME,
      reject_reason TEXT,
      memo TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (seller_id) REFERENCES users(id)
    )
  `);

  // 판매자 정산 계좌 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS seller_bank_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_id INTEGER NOT NULL UNIQUE,
      bank_name VARCHAR(50) NOT NULL,
      bank_account VARCHAR(50) NOT NULL,
      account_holder VARCHAR(50) NOT NULL,
      is_verified BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (seller_id) REFERENCES users(id)
    )
  `);

  console.log('테이블 생성 완료');

  // 기본 데이터 삽입
  insertDefaultData();

  console.log('데이터베이스 초기화 완료!');
};

const insertDefaultData = () => {
  // 관리자 계정 생성 (비밀번호: admin123!)
  const bcrypt = require('bcryptjs');
  const adminPassword = bcrypt.hashSync('admin123!', 10);

  const checkAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@oralcare.com');
  if (!checkAdmin) {
    db.prepare(`
      INSERT INTO users (email, password, name, phone, role)
      VALUES (?, ?, ?, ?, ?)
    `).run('admin@oralcare.com', adminPassword, '관리자', '010-0000-0000', 'admin');
    console.log('관리자 계정 생성됨 (admin@oralcare.com / admin123!)');
  }

  // 기본 카테고리 생성
  const checkCategory = db.prepare('SELECT id FROM categories WHERE slug = ?').get('toothbrush');
  if (!checkCategory) {
    const categories = [
      { name: '칫솔', slug: 'toothbrush', description: '다양한 칫솔 제품' },
      { name: '치약', slug: 'toothpaste', description: '치약 및 구강 세정제' },
      { name: '치실/치간칫솔', slug: 'floss', description: '치실 및 치간칫솔' },
      { name: '구강청결제', slug: 'mouthwash', description: '구강청결제 및 가글' },
      { name: '미백제품', slug: 'whitening', description: '치아 미백 제품' },
      { name: '전동칫솔', slug: 'electric-toothbrush', description: '전동칫솔 및 액세서리' },
      { name: '어린이용', slug: 'kids', description: '어린이 구강용품' },
      { name: '세트상품', slug: 'set', description: '구강용품 세트' }
    ];

    const insertCategory = db.prepare(`
      INSERT INTO categories (name, slug, description, sort_order)
      VALUES (?, ?, ?, ?)
    `);

    categories.forEach((cat, index) => {
      insertCategory.run(cat.name, cat.slug, cat.description, index + 1);
    });
    console.log('기본 카테고리 생성됨');
  }

  // 샘플 상품 생성
  const checkProduct = db.prepare('SELECT id FROM products WHERE slug = ?').get('soft-toothbrush-01');
  if (!checkProduct) {
    const products = [
      // ===== 칫솔 (category_id: 1) =====
      {
        category_id: 1, name: '울트라 소프트 칫솔', slug: 'soft-toothbrush-01',
        description: '0.01mm 초극세모를 사용한 울트라 소프트 칫솔입니다. 민감한 잇몸을 가진 분들께 추천드립니다.\n\n- 초극세모 0.01mm로 잇몸 자극 최소화\n- 인체공학적 손잡이 디자인\n- 컴팩트 헤드로 구석구석 닦기 편리\n- 항균 처리된 모로 위생적 사용',
        short_description: '민감한 잇몸을 위한 초극세모 칫솔', price: 5900, sale_price: 4900, stock: 100, sku: 'TB-001', is_featured: 1,
        image_url: 'https://images.unsplash.com/photo-1559650656-5d1d361ad10e?w=500'
      },
      {
        category_id: 1, name: '클래식 미디엄 칫솔 3개입', slug: 'classic-medium-toothbrush',
        description: '매일 사용하기 좋은 클래식 미디엄 칫솔 3개입 세트입니다.\n\n- 적당한 강도의 미디엄 모\n- 혀 클리너 내장\n- 미끄럼 방지 손잡이\n- 3개월 교체 주기 권장',
        short_description: '가성비 좋은 클래식 칫솔 3개입', price: 8900, sale_price: 6900, stock: 150, sku: 'TB-002', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1609587312208-cea54be969e7?w=500'
      },
      {
        category_id: 1, name: '대나무 친환경 칫솔', slug: 'bamboo-toothbrush',
        description: '100% 생분해 가능한 대나무 손잡이를 사용한 친환경 칫솔입니다.\n\n- 천연 대나무 손잡이\n- BPA FREE 나일론 모\n- 환경을 생각하는 패키지\n- 자연 분해되어 환경 보호',
        short_description: '지구를 생각하는 친환경 대나무 칫솔', price: 4500, sale_price: null, stock: 200, sku: 'TB-003', is_featured: 1,
        image_url: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=500'
      },
      {
        category_id: 1, name: '잇몸케어 마사지 칫솔', slug: 'gum-massage-toothbrush',
        description: '잇몸 마사지 기능이 있는 특수 설계 칫솔입니다.\n\n- 이중 모 구조로 잇몸 마사지\n- 잇몸 건강 개선 효과\n- 탄력있는 넥으로 압력 분산\n- 치주질환 예방에 도움',
        short_description: '잇몸 건강을 위한 마사지 칫솔', price: 7900, sale_price: 6500, stock: 80, sku: 'TB-004', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1572273869481-7c1bb27a0339?w=500'
      },
      {
        category_id: 1, name: '슬림 딥클린 칫솔', slug: 'slim-deep-clean-toothbrush',
        description: '슬림한 헤드로 어금니 안쪽까지 깨끗하게 닦아주는 딥클린 칫솔입니다.\n\n- 슬림 헤드 디자인\n- 다층 모 배열로 치아 사이 청소\n- 45도 각도로 설계된 넥\n- 구석구석 깨끗한 양치',
        short_description: '구석구석 딥클린 슬림 헤드 칫솔', price: 5500, sale_price: null, stock: 120, sku: 'TB-005', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1564277287253-934c868e54ea?w=500'
      },
      {
        category_id: 1, name: '실버 항균 칫솔', slug: 'silver-antibacterial-toothbrush',
        description: '은나노 항균 처리된 칫솔모로 세균 번식을 억제합니다.\n\n- 은나노 항균 코팅\n- 99.9% 세균 억제 효과\n- 건조대 불필요\n- 2개월 사용 가능',
        short_description: '은나노 항균 처리 위생 칫솔', price: 6900, sale_price: 5900, stock: 90, sku: 'TB-006', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=500'
      },
      {
        category_id: 1, name: '프리미엄 칫솔 5종 세트', slug: 'premium-toothbrush-set-5',
        description: '다양한 모 강도를 경험할 수 있는 프리미엄 칫솔 5종 세트입니다.\n\n- 소프트, 미디엄, 하드 포함\n- 가족이 함께 사용\n- 개별 위생 케이스 포함\n- 선물용으로 적합',
        short_description: '5가지 타입 프리미엄 칫솔 세트', price: 19900, sale_price: 14900, stock: 50, sku: 'TB-007', is_featured: 1,
        image_url: 'https://images.unsplash.com/photo-1559650656-5d1d361ad10e?w=500'
      },
      {
        category_id: 1, name: '여행용 휴대 칫솔', slug: 'travel-portable-toothbrush',
        description: '접이식 디자인의 여행용 휴대 칫솔입니다.\n\n- 접이식 손잡이\n- 위생 캡 포함\n- 컴팩트 사이즈\n- 출장, 여행 필수품',
        short_description: '접이식 휴대용 여행 칫솔', price: 3900, sale_price: 2900, stock: 200, sku: 'TB-008', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1571875257727-256c39da42af?w=500'
      },
      {
        category_id: 1, name: '교정용 V컷 칫솔', slug: 'orthodontic-v-cut-toothbrush',
        description: '치아 교정 중인 분들을 위한 V컷 전용 칫솔입니다.\n\n- V자 컷팅 모 배열\n- 교정 브라켓 사이 청소\n- 부드러운 모로 잇몸 보호\n- 교정 환자 필수품',
        short_description: '교정 환자를 위한 V컷 전용 칫솔', price: 4900, sale_price: null, stock: 100, sku: 'TB-009', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1588776814546-daab30f310ce?w=500'
      },
      {
        category_id: 1, name: '숯 함유 블랙 칫솔', slug: 'charcoal-black-toothbrush',
        description: '활성탄 성분이 함유된 블랙 칫솔입니다.\n\n- 활성탄 함유 칫솔모\n- 자연 탈취 효과\n- 치아 미백 도움\n- 스타일리시한 블랙 디자인',
        short_description: '활성탄 함유 미백 블랙 칫솔', price: 5500, sale_price: 4500, stock: 130, sku: 'TB-010', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1564277287253-934c868e54ea?w=500'
      },

      // ===== 치약 (category_id: 2) =====
      {
        category_id: 2, name: '프리미엄 미백 치약 150g', slug: 'whitening-toothpaste-01',
        description: '자연유래 미백 성분으로 치아를 하얗게 만들어주는 프리미엄 미백 치약입니다.\n\n- 과산화수소 프리 미백\n- 불소 1000ppm 함유\n- 시린이 케어 성분 포함\n- 상쾌한 민트향',
        short_description: '미백과 충치예방을 한번에', price: 8900, sale_price: null, stock: 200, sku: 'TP-001', is_featured: 1,
        image_url: 'https://images.unsplash.com/photo-1628359355624-855e90ef3682?w=500'
      },
      {
        category_id: 2, name: '시린이 전용 치약 120g', slug: 'sensitive-toothpaste',
        description: '시린 치아를 위한 전문 케어 치약입니다.\n\n- 칼륨이온 함유로 시림 완화\n- 에나멜 강화 성분\n- 저자극 포뮬러\n- 치과 추천 제품',
        short_description: '시린이 케어 전문 치약', price: 12900, sale_price: 9900, stock: 150, sku: 'TP-002', is_featured: 1,
        image_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500'
      },
      {
        category_id: 2, name: '어린이 딸기향 치약 80g', slug: 'kids-strawberry-toothpaste',
        description: '아이들이 좋아하는 딸기향 어린이 전용 치약입니다.\n\n- 불소 500ppm (어린이 적정량)\n- 삼키기 안전한 성분\n- 달콤한 딸기향\n- 귀여운 패키지 디자인',
        short_description: '아이들이 좋아하는 딸기향', price: 5900, sale_price: 4900, stock: 180, sku: 'TP-003', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1629909615184-74f495363b67?w=500'
      },
      {
        category_id: 2, name: '잇몸케어 치약 150g', slug: 'gum-care-toothpaste',
        description: '잇몸 건강에 집중한 잇몸케어 전문 치약입니다.\n\n- 비타민E 함유\n- 잇몸 염증 예방\n- 치주질환 관리\n- 허브 민트향',
        short_description: '잇몸 건강 전문 케어 치약', price: 9900, sale_price: 7900, stock: 120, sku: 'TP-004', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1628359355624-855e90ef3682?w=500'
      },
      {
        category_id: 2, name: '숯 클렌징 치약 130g', slug: 'charcoal-cleansing-toothpaste',
        description: '활성탄 성분으로 깊은 클렌징을 제공하는 치약입니다.\n\n- 활성탄 미세입자\n- 치석 제거 효과\n- 입냄새 제거\n- 내추럴 민트향',
        short_description: '활성탄 딥클렌징 치약', price: 7900, sale_price: 6500, stock: 140, sku: 'TP-005', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500'
      },
      {
        category_id: 2, name: '천연 프로폴리스 치약 120g', slug: 'propolis-natural-toothpaste',
        description: '천연 프로폴리스 추출물을 함유한 자연주의 치약입니다.\n\n- 프로폴리스 5% 함유\n- 천연 항균 작용\n- 파라벤 프리\n- 자연 유래 성분 95%',
        short_description: '천연 프로폴리스 항균 치약', price: 11900, sale_price: null, stock: 100, sku: 'TP-006', is_featured: 1,
        image_url: 'https://images.unsplash.com/photo-1628359355624-855e90ef3682?w=500'
      },
      {
        category_id: 2, name: '구취제거 프레쉬 치약 150g', slug: 'fresh-breath-toothpaste',
        description: '강력한 구취 제거 효과의 프레쉬 치약입니다.\n\n- 12시간 상쾌함 지속\n- 아연 성분 함유\n- 박테리아 억제\n- 쿨링 스피아민트향',
        short_description: '12시간 상쾌함 구취제거 치약', price: 6900, sale_price: 5500, stock: 160, sku: 'TP-007', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500'
      },
      {
        category_id: 2, name: '치석제거 전문 치약 150g', slug: 'tartar-control-toothpaste',
        description: '치석 형성을 억제하는 전문 치석케어 치약입니다.\n\n- 피로인산염 함유\n- 치석 형성 억제\n- 치태 제거\n- 청량 민트향',
        short_description: '치석 형성 억제 전문 치약', price: 8500, sale_price: null, stock: 130, sku: 'TP-008', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1628359355624-855e90ef3682?w=500'
      },
      {
        category_id: 2, name: '무불소 어린이 치약 60g', slug: 'fluoride-free-kids-toothpaste',
        description: '삼켜도 안전한 무불소 어린이 전용 치약입니다.\n\n- 100% 무불소\n- 자일리톨 함유\n- 삼켜도 안전\n- 포도향',
        short_description: '삼켜도 안전한 무불소 치약', price: 6500, sale_price: 5500, stock: 140, sku: 'TP-009', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1629909615184-74f495363b67?w=500'
      },
      {
        category_id: 2, name: '나이트 케어 치약 100g', slug: 'night-care-toothpaste',
        description: '취침 전 사용하는 나이트 전용 치약입니다.\n\n- 수면 중 충치 예방\n- 불소 1450ppm\n- 잇몸 보호 성분\n- 순한 라벤더향',
        short_description: '취침 전 집중 케어 나이트 치약', price: 9500, sale_price: 7900, stock: 110, sku: 'TP-010', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500'
      },

      // ===== 치실/치간칫솔 (category_id: 3) =====
      {
        category_id: 3, name: '왁스 코팅 치실 50m', slug: 'wax-floss-01',
        description: '부드러운 왁스 코팅으로 치아 사이를 부드럽게 청소하는 치실입니다.\n\n- 왁스 코팅으로 부드러운 사용감\n- 상쾌한 민트향\n- 50m 대용량\n- 치아 사이 이물질 제거',
        short_description: '민트향 왁스 치실 50m', price: 4500, sale_price: 3900, stock: 150, sku: 'FL-001', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=500'
      },
      {
        category_id: 3, name: '치간칫솔 0.6mm 10개입', slug: 'interdental-brush-06mm',
        description: '좁은 치아 사이를 청소하는 0.6mm 치간칫솔입니다.\n\n- SSS 사이즈 0.6mm\n- 스테인리스 와이어\n- 휴대용 케이스 포함\n- 10개입 구성',
        short_description: 'SSS 사이즈 치간칫솔 10개입', price: 5900, sale_price: null, stock: 180, sku: 'FL-002', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=500'
      },
      {
        category_id: 3, name: '치간칫솔 0.8mm 10개입', slug: 'interdental-brush-08mm',
        description: '일반 치아 사이용 0.8mm 치간칫솔입니다.\n\n- SS 사이즈 0.8mm\n- 부드러운 나일론 모\n- 인체공학적 핸들\n- 10개입 구성',
        short_description: 'SS 사이즈 치간칫솔 10개입', price: 5900, sale_price: 4900, stock: 170, sku: 'FL-003', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=500'
      },
      {
        category_id: 3, name: '치간칫솔 1.0mm 10개입', slug: 'interdental-brush-10mm',
        description: '넓은 치아 사이용 1.0mm 치간칫솔입니다.\n\n- S 사이즈 1.0mm\n- 항균 처리 모\n- 미끄럼 방지 손잡이\n- 10개입 구성',
        short_description: 'S 사이즈 치간칫솔 10개입', price: 5900, sale_price: null, stock: 160, sku: 'FL-004', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=500'
      },
      {
        category_id: 3, name: '프리미엄 치실 100m', slug: 'premium-floss-100m',
        description: '대용량 프리미엄 치실 100m입니다.\n\n- PTFE 소재로 부드러움\n- 찢어지지 않는 강도\n- 민트 코팅\n- 경제적인 대용량',
        short_description: '찢어지지 않는 프리미엄 치실', price: 7900, sale_price: 6500, stock: 120, sku: 'FL-005', is_featured: 1,
        image_url: 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=500'
      },
      {
        category_id: 3, name: '치실 픽 60개입', slug: 'floss-pick-60pcs',
        description: '편리한 일회용 치실 픽 60개입입니다.\n\n- 일회용 편리 사용\n- 손잡이 포함 픽 타입\n- 이쑤시개 기능 겸용\n- 휴대 편리',
        short_description: '일회용 편리 치실 픽 60개입', price: 4900, sale_price: 3900, stock: 200, sku: 'FL-006', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=500'
      },
      {
        category_id: 3, name: '어린이 치실 픽 40개입', slug: 'kids-floss-pick-40pcs',
        description: '아이들을 위한 어린이 전용 치실 픽입니다.\n\n- 작은 사이즈 헤드\n- 부드러운 치실\n- 과일향 코팅\n- 귀여운 동물 모양',
        short_description: '아이들을 위한 과일향 치실 픽', price: 5500, sale_price: 4500, stock: 150, sku: 'FL-007', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=500'
      },
      {
        category_id: 3, name: '치간칫솔 믹스 세트 30개입', slug: 'interdental-brush-mix-set',
        description: '다양한 사이즈가 포함된 치간칫솔 믹스 세트입니다.\n\n- SSS, SS, S, M 사이즈 포함\n- 30개입 대용량\n- 보관 케이스 포함\n- 경제적인 구성',
        short_description: '다양한 사이즈 믹스 세트 30개입', price: 12900, sale_price: 9900, stock: 80, sku: 'FL-008', is_featured: 1,
        image_url: 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=500'
      },
      {
        category_id: 3, name: '교정용 치실 50개입', slug: 'orthodontic-floss-50pcs',
        description: '치아 교정 중에도 사용 가능한 교정용 치실입니다.\n\n- 와이어 통과 가능한 디자인\n- 뻣뻣한 끝부분\n- 스폰지 타입 치실\n- 교정 환자 필수품',
        short_description: '교정 환자용 특수 치실 50개입', price: 8900, sale_price: null, stock: 100, sku: 'FL-009', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=500'
      },
      {
        category_id: 3, name: '워터 플로서 휴대용', slug: 'portable-water-flosser',
        description: '휴대 가능한 충전식 워터 플로서입니다.\n\n- USB 충전식\n- 3단계 수압 조절\n- 200ml 물탱크\n- IPX7 방수',
        short_description: '휴대용 충전식 구강 세정기', price: 39900, sale_price: 29900, stock: 50, sku: 'FL-010', is_featured: 1,
        image_url: 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=500'
      },

      // ===== 구강청결제 (category_id: 4) =====
      {
        category_id: 4, name: '무알콜 구강청결제 500ml', slug: 'alcohol-free-mouthwash-01',
        description: '무알콜 포뮬러로 자극 없이 구강 전체를 청결하게 하는 구강청결제입니다.\n\n- 무알콜 순한 처방\n- 12시간 상쾌함 지속\n- 충치 예방 불소 함유\n- 민트향',
        short_description: '자극 없는 무알콜 가글 500ml', price: 12900, sale_price: 9900, stock: 80, sku: 'MW-001', is_featured: 1,
        image_url: 'https://images.unsplash.com/photo-1612888484170-63e0e5f2d2b2?w=500'
      },
      {
        category_id: 4, name: '토탈케어 구강청결제 750ml', slug: 'total-care-mouthwash',
        description: '10가지 효능을 한 번에, 토탈케어 구강청결제입니다.\n\n- 충치, 치석, 구취 예방\n- 잇몸 건강 케어\n- 미백 효과\n- 대용량 750ml',
        short_description: '10가지 효능 토탈케어 가글', price: 15900, sale_price: 12900, stock: 100, sku: 'MW-002', is_featured: 1,
        image_url: 'https://images.unsplash.com/photo-1612888484170-63e0e5f2d2b2?w=500'
      },
      {
        category_id: 4, name: '어린이 구강청결제 250ml', slug: 'kids-mouthwash-250ml',
        description: '아이들을 위한 무알콜, 무불소 구강청결제입니다.\n\n- 무알콜 무불소\n- 삼켜도 안전한 성분\n- 포도향\n- 6세 이상 사용',
        short_description: '아이들을 위한 순한 가글 250ml', price: 8900, sale_price: 6900, stock: 120, sku: 'MW-003', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1612888484170-63e0e5f2d2b2?w=500'
      },
      {
        category_id: 4, name: '잇몸케어 구강청결제 500ml', slug: 'gum-care-mouthwash',
        description: '잇몸 건강에 집중한 전문 구강청결제입니다.\n\n- 잇몸 염증 예방\n- CPC 성분 함유\n- 출혈 완화\n- 허브 민트향',
        short_description: '잇몸 건강 전문 가글 500ml', price: 13900, sale_price: null, stock: 90, sku: 'MW-004', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1612888484170-63e0e5f2d2b2?w=500'
      },
      {
        category_id: 4, name: '미백 구강청결제 500ml', slug: 'whitening-mouthwash',
        description: '치아 미백 효과가 있는 구강청결제입니다.\n\n- 미백 성분 함유\n- 착색 방지\n- 24시간 상쾌함\n- 스피아민트향',
        short_description: '치아 미백 효과 가글 500ml', price: 14900, sale_price: 11900, stock: 85, sku: 'MW-005', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1612888484170-63e0e5f2d2b2?w=500'
      },
      {
        category_id: 4, name: '휴대용 구강청결제 80ml 3개입', slug: 'portable-mouthwash-3pack',
        description: '휴대하기 편한 미니 사이즈 구강청결제 3개입입니다.\n\n- 80ml 휴대 사이즈\n- 무알콜\n- 여행, 외출용\n- 3개입 세트',
        short_description: '휴대용 미니 가글 80ml 3개입', price: 9900, sale_price: 7900, stock: 150, sku: 'MW-006', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1612888484170-63e0e5f2d2b2?w=500'
      },
      {
        category_id: 4, name: '프로폴리스 구강청결제 500ml', slug: 'propolis-mouthwash',
        description: '천연 프로폴리스 성분의 자연주의 구강청결제입니다.\n\n- 프로폴리스 추출물\n- 천연 항균 작용\n- 저자극 처방\n- 허브향',
        short_description: '천연 프로폴리스 가글 500ml', price: 16900, sale_price: null, stock: 70, sku: 'MW-007', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1612888484170-63e0e5f2d2b2?w=500'
      },
      {
        category_id: 4, name: '시린이케어 구강청결제 500ml', slug: 'sensitive-care-mouthwash',
        description: '시린 치아를 위한 전문 케어 구강청결제입니다.\n\n- 시린이 완화 성분\n- 에나멜 보호\n- 무알콜 처방\n- 순한 민트향',
        short_description: '시린이 전용 가글 500ml', price: 14900, sale_price: 12900, stock: 80, sku: 'MW-008', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1612888484170-63e0e5f2d2b2?w=500'
      },
      {
        category_id: 4, name: '인텐시브 구강청결제 1000ml', slug: 'intensive-mouthwash-1000ml',
        description: '대용량 가성비 구강청결제 1000ml입니다.\n\n- 경제적인 대용량\n- 4가지 효능\n- 충치 예방\n- 페퍼민트향',
        short_description: '대용량 가성비 가글 1000ml', price: 16900, sale_price: 12900, stock: 60, sku: 'MW-009', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1612888484170-63e0e5f2d2b2?w=500'
      },
      {
        category_id: 4, name: '나이트케어 구강청결제 500ml', slug: 'night-care-mouthwash',
        description: '취침 전 사용하는 나이트 전용 구강청결제입니다.\n\n- 수면 중 세균 억제\n- 아침 입냄새 예방\n- 고농축 불소\n- 순한 라벤더향',
        short_description: '취침 전 나이트 가글 500ml', price: 13900, sale_price: 10900, stock: 90, sku: 'MW-010', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1612888484170-63e0e5f2d2b2?w=500'
      },

      // ===== 미백제품 (category_id: 5) =====
      {
        category_id: 5, name: '홈 미백 키트 2주용', slug: 'home-whitening-kit-2weeks',
        description: '집에서 간편하게 사용하는 2주 분량 치아 미백 키트입니다.\n\n- 전문가급 미백 효과\n- 14일 프로그램\n- LED 라이트 포함\n- 미백젤 3개 구성',
        short_description: '전문가급 홈 미백 키트 2주용', price: 49900, sale_price: 39900, stock: 40, sku: 'WH-001', is_featured: 1,
        image_url: 'https://images.unsplash.com/photo-1606819717115-9159c900370b?w=500'
      },
      {
        category_id: 5, name: '미백 치아 패치 14매', slug: 'whitening-strips-14pcs',
        description: '붙이기만 하면 되는 간편 미백 패치입니다.\n\n- 30분 사용\n- 7일 프로그램\n- 과산화수소 함유\n- 상하 14매 구성',
        short_description: '간편 부착형 미백 패치 14매', price: 29900, sale_price: 24900, stock: 60, sku: 'WH-002', is_featured: 1,
        image_url: 'https://images.unsplash.com/photo-1606819717115-9159c900370b?w=500'
      },
      {
        category_id: 5, name: '미백 치약 젤 100g', slug: 'whitening-gel-toothpaste',
        description: '일반 치약 대용으로 사용하는 미백 젤 치약입니다.\n\n- 매일 사용 가능\n- 점진적 미백 효과\n- 충치 예방 기능\n- 민트향',
        short_description: '매일 쓰는 미백 젤 치약 100g', price: 15900, sale_price: null, stock: 100, sku: 'WH-003', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1606819717115-9159c900370b?w=500'
      },
      {
        category_id: 5, name: '미백 펜 2개입', slug: 'whitening-pen-2pcs',
        description: '휴대하며 사용하는 미백 펜 2개입입니다.\n\n- 펜 타입 휴대 편리\n- 터치업 미백\n- 젤 타입\n- 2개입 구성',
        short_description: '휴대용 미백 펜 2개입', price: 19900, sale_price: 15900, stock: 80, sku: 'WH-004', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1606819717115-9159c900370b?w=500'
      },
      {
        category_id: 5, name: '미백 LED 마우스피스', slug: 'whitening-led-mouthpiece',
        description: 'LED 블루라이트로 미백 효과를 높이는 마우스피스입니다.\n\n- 블루 LED 16구\n- USB 충전식\n- 미백젤 별도 구매\n- 10분 사용',
        short_description: 'LED 블루라이트 미백 기기', price: 35000, sale_price: 27900, stock: 45, sku: 'WH-005', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1606819717115-9159c900370b?w=500'
      },
      {
        category_id: 5, name: '미백 파우더 50g', slug: 'whitening-powder-50g',
        description: '활성탄 성분의 치아 미백 파우더입니다.\n\n- 천연 활성탄\n- 착색 제거\n- 치약과 함께 사용\n- 50g 대용량',
        short_description: '활성탄 치아 미백 파우더 50g', price: 12900, sale_price: 9900, stock: 90, sku: 'WH-006', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1606819717115-9159c900370b?w=500'
      },
      {
        category_id: 5, name: '미백 젤 리필 3개입', slug: 'whitening-gel-refill-3pcs',
        description: '미백 키트용 리필 젤 3개입입니다.\n\n- 미백 키트 전용\n- 3ml x 3개\n- 고농축 포뮬러\n- 약 6주 사용 가능',
        short_description: '미백 키트 리필 젤 3개입', price: 24900, sale_price: null, stock: 70, sku: 'WH-007', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1606819717115-9159c900370b?w=500'
      },
      {
        category_id: 5, name: '미백 치아 마스크 5매', slug: 'whitening-tooth-mask-5pcs',
        description: '치아에 밀착되는 마스크 타입 미백 제품입니다.\n\n- 치아 밀착 마스크\n- 20분 사용\n- 히알루론산 함유\n- 5회분 구성',
        short_description: '밀착형 치아 미백 마스크 5매', price: 22900, sale_price: 18900, stock: 55, sku: 'WH-008', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1606819717115-9159c900370b?w=500'
      },
      {
        category_id: 5, name: '코코넛 오일 풀링 250ml', slug: 'coconut-oil-pulling-250ml',
        description: '전통 오일 풀링 방식의 자연 미백 오일입니다.\n\n- 100% 코코넛 오일\n- 자연 미백 효과\n- 구취 제거\n- 20분 가글',
        short_description: '자연 미백 코코넛 오일 풀링', price: 18900, sale_price: null, stock: 65, sku: 'WH-009', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1606819717115-9159c900370b?w=500'
      },
      {
        category_id: 5, name: '프로 미백 키트 4주용', slug: 'pro-whitening-kit-4weeks',
        description: '전문가급 4주 프로그램 미백 키트입니다.\n\n- 4주 집중 프로그램\n- 미백젤 6개 포함\n- LED 기기 포함\n- 트레이 포함',
        short_description: '4주 집중 프로 미백 키트', price: 79900, sale_price: 59900, stock: 30, sku: 'WH-010', is_featured: 1,
        image_url: 'https://images.unsplash.com/photo-1606819717115-9159c900370b?w=500'
      },

      // ===== 전동칫솔 (category_id: 6) =====
      {
        category_id: 6, name: '음파 전동칫솔 프로', slug: 'sonic-electric-toothbrush-01',
        description: '분당 31,000회 진동의 고성능 음파 전동칫솔입니다.\n\n- 31,000회/분 진동\n- 5가지 모드\n- 2분 타이머\n- 30초 구역 알림',
        short_description: '고성능 음파 전동칫솔', price: 89000, sale_price: 69000, stock: 30, sku: 'ET-001', is_featured: 1,
        image_url: 'https://images.unsplash.com/photo-1559650656-5d1d361ad10e?w=500'
      },
      {
        category_id: 6, name: '스마트 전동칫솔 AI', slug: 'smart-ai-electric-toothbrush',
        description: 'AI 센서가 양치 상태를 분석하는 스마트 전동칫솔입니다.\n\n- 앱 연동 AI 분석\n- 압력 센서\n- 브러싱 가이드\n- 충전 스탠드 포함',
        short_description: 'AI 양치 분석 스마트 전동칫솔', price: 129000, sale_price: 99000, stock: 25, sku: 'ET-002', is_featured: 1,
        image_url: 'https://images.unsplash.com/photo-1559650656-5d1d361ad10e?w=500'
      },
      {
        category_id: 6, name: '베이직 전동칫솔', slug: 'basic-electric-toothbrush',
        description: '입문자를 위한 기본형 전동칫솔입니다.\n\n- 회전 진동 방식\n- 2분 타이머\n- AAA 건전지 사용\n- 교체 헤드 1개 포함',
        short_description: '입문자용 기본 전동칫솔', price: 19900, sale_price: 14900, stock: 80, sku: 'ET-003', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1559650656-5d1d361ad10e?w=500'
      },
      {
        category_id: 6, name: '어린이 전동칫솔', slug: 'kids-electric-toothbrush',
        description: '어린이를 위한 캐릭터 전동칫솔입니다.\n\n- 부드러운 진동\n- 귀여운 캐릭터 디자인\n- 2분 뮤직 타이머\n- 충전식',
        short_description: '아이들을 위한 캐릭터 전동칫솔', price: 35000, sale_price: 27900, stock: 50, sku: 'ET-004', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1559650656-5d1d361ad10e?w=500'
      },
      {
        category_id: 6, name: '전동칫솔 교체 헤드 4개입', slug: 'electric-toothbrush-head-4pcs',
        description: '전동칫솔 교체용 브러시 헤드 4개입입니다.\n\n- 호환 모델 다수\n- 듀폰 나일론 모\n- 3개월 교체 권장\n- 4개입 구성',
        short_description: '전동칫솔 교체 헤드 4개입', price: 15900, sale_price: 12900, stock: 100, sku: 'ET-005', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1559650656-5d1d361ad10e?w=500'
      },
      {
        category_id: 6, name: '프리미엄 음파 전동칫솔', slug: 'premium-sonic-toothbrush',
        description: '프리미엄 디자인의 고급 음파 전동칫솔입니다.\n\n- 40,000회/분 진동\n- 무선 충전\n- UV 살균 케이스\n- 여행용 케이스 포함',
        short_description: '무선 충전 프리미엄 전동칫솔', price: 159000, sale_price: 129000, stock: 20, sku: 'ET-006', is_featured: 1,
        image_url: 'https://images.unsplash.com/photo-1559650656-5d1d361ad10e?w=500'
      },
      {
        category_id: 6, name: '휴대용 전동칫솔', slug: 'portable-electric-toothbrush',
        description: '여행에 편리한 휴대용 전동칫솔입니다.\n\n- 컴팩트 사이즈\n- USB 충전\n- 방수 IPX7\n- 캡 겸용 케이스',
        short_description: '여행용 휴대 전동칫솔', price: 29900, sale_price: null, stock: 60, sku: 'ET-007', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1559650656-5d1d361ad10e?w=500'
      },
      {
        category_id: 6, name: '전동칫솔 UV 살균기', slug: 'electric-toothbrush-uv-sanitizer',
        description: '전동칫솔 헤드를 살균하는 UV 살균기입니다.\n\n- UV-C LED 살균\n- 99.9% 세균 제거\n- 10분 자동 종료\n- 벽걸이/거치 가능',
        short_description: '전동칫솔 UV 살균 거치대', price: 24900, sale_price: 19900, stock: 45, sku: 'ET-008', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1559650656-5d1d361ad10e?w=500'
      },
      {
        category_id: 6, name: '잇몸케어 전동칫솔', slug: 'gum-care-electric-toothbrush',
        description: '잇몸 마사지 기능이 있는 전동칫솔입니다.\n\n- 잇몸 마사지 모드\n- 부드러운 진동\n- 민감 모드 포함\n- 충전 스탠드 포함',
        short_description: '잇몸 마사지 전동칫솔', price: 79000, sale_price: 59000, stock: 35, sku: 'ET-009', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1559650656-5d1d361ad10e?w=500'
      },
      {
        category_id: 6, name: '전동칫솔 패밀리 세트', slug: 'electric-toothbrush-family-set',
        description: '온 가족이 사용하는 전동칫솔 패밀리 세트입니다.\n\n- 본체 1개\n- 성인용 헤드 2개\n- 어린이용 헤드 2개\n- 충전 스탠드 포함',
        short_description: '온 가족 전동칫솔 패밀리 세트', price: 99000, sale_price: 79000, stock: 25, sku: 'ET-010', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1559650656-5d1d361ad10e?w=500'
      },

      // ===== 어린이용 (category_id: 7) =====
      {
        category_id: 7, name: '어린이 캐릭터 칫솔 세트', slug: 'kids-toothbrush-set-01',
        description: '아이들이 좋아하는 캐릭터 칫솔 3종 세트입니다.\n\n- 귀여운 동물 캐릭터 3종\n- 부드러운 미세모\n- 작은 헤드 사이즈\n- 미끄럼 방지 손잡이',
        short_description: '아이들을 위한 캐릭터 칫솔 3종', price: 9900, sale_price: 7900, stock: 50, sku: 'KD-001', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1587049016823-69ef9d68bd44?w=500'
      },
      {
        category_id: 7, name: '유아용 실리콘 칫솔', slug: 'baby-silicone-toothbrush',
        description: '0-2세 유아를 위한 부드러운 실리콘 칫솔입니다.\n\n- 100% 실리콘 소재\n- 잇몸 마사지 효과\n- BPA FREE\n- 안전한 라운드 디자인',
        short_description: '0-2세 유아용 실리콘 칫솔', price: 6900, sale_price: 5500, stock: 80, sku: 'KD-002', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1587049016823-69ef9d68bd44?w=500'
      },
      {
        category_id: 7, name: '어린이 불소 치약 75g', slug: 'kids-fluoride-toothpaste-75g',
        description: '어린이에게 적합한 불소 함량의 치약입니다.\n\n- 불소 500ppm\n- 달콤한 사과향\n- 6세 이상 사용\n- 충치 예방',
        short_description: '사과향 어린이 불소 치약', price: 5900, sale_price: null, stock: 120, sku: 'KD-003', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1587049016823-69ef9d68bd44?w=500'
      },
      {
        category_id: 7, name: '어린이 구강 세트', slug: 'kids-oral-care-set',
        description: '칫솔, 치약, 컵이 포함된 어린이 구강 세트입니다.\n\n- 캐릭터 칫솔 1개\n- 어린이 치약 1개\n- 양치 컵 1개\n- 선물 패키지',
        short_description: '어린이 구강 케어 3종 세트', price: 15900, sale_price: 12900, stock: 60, sku: 'KD-004', is_featured: 1,
        image_url: 'https://images.unsplash.com/photo-1587049016823-69ef9d68bd44?w=500'
      },
      {
        category_id: 7, name: '유아 손가락 칫솔', slug: 'baby-finger-toothbrush',
        description: '엄마 손가락에 끼워 사용하는 유아용 칫솔입니다.\n\n- 손가락 끼움 타입\n- 실리콘 돌기\n- 2개입 구성\n- 0-12개월용',
        short_description: '손가락 끼움식 유아 칫솔', price: 7900, sale_price: 5900, stock: 90, sku: 'KD-005', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1587049016823-69ef9d68bd44?w=500'
      },
      {
        category_id: 7, name: '어린이 무불소 치약 60g', slug: 'kids-fluoride-free-toothpaste',
        description: '삼켜도 안전한 무불소 어린이 치약입니다.\n\n- 100% 무불소\n- 딸기향\n- 삼켜도 안전\n- 2세 이상 사용',
        short_description: '삼켜도 안전한 딸기향 치약', price: 6500, sale_price: null, stock: 100, sku: 'KD-006', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1587049016823-69ef9d68bd44?w=500'
      },
      {
        category_id: 7, name: '어린이 타이머 칫솔', slug: 'kids-timer-toothbrush',
        description: '2분 양치 습관을 기르는 타이머 칫솔입니다.\n\n- LED 타이머 내장\n- 2분 자동 꺼짐\n- 30초 알림\n- 건전지 포함',
        short_description: '2분 타이머 어린이 칫솔', price: 8900, sale_price: 6900, stock: 70, sku: 'KD-007', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1587049016823-69ef9d68bd44?w=500'
      },
      {
        category_id: 7, name: '어린이 치실 픽 30개입', slug: 'kids-floss-pick-30pcs',
        description: '작은 손에 맞는 어린이 전용 치실 픽입니다.\n\n- 작은 손잡이\n- 부드러운 치실\n- 포도향\n- 30개입',
        short_description: '어린이 전용 치실 픽 30개입', price: 4900, sale_price: 3900, stock: 110, sku: 'KD-008', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1587049016823-69ef9d68bd44?w=500'
      },
      {
        category_id: 7, name: '어린이 구강 스프레이', slug: 'kids-oral-spray',
        description: '아이들을 위한 구강 청결 스프레이입니다.\n\n- 무알콜\n- 자일리톨 함유\n- 복숭아향\n- 30ml 휴대용',
        short_description: '복숭아향 어린이 구강 스프레이', price: 7900, sale_price: 5900, stock: 85, sku: 'KD-009', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1587049016823-69ef9d68bd44?w=500'
      },
      {
        category_id: 7, name: '어린이 양치 트레이닝 세트', slug: 'kids-brushing-training-set',
        description: '올바른 양치 습관을 기르는 트레이닝 세트입니다.\n\n- 단계별 칫솔 3종\n- 모래시계 타이머\n- 양치 가이드북\n- 스티커 포함',
        short_description: '양치 습관 트레이닝 세트', price: 19900, sale_price: 15900, stock: 40, sku: 'KD-010', is_featured: 1,
        image_url: 'https://images.unsplash.com/photo-1587049016823-69ef9d68bd44?w=500'
      },

      // ===== 세트상품 (category_id: 8) =====
      {
        category_id: 8, name: '데일리 케어 3종 세트', slug: 'daily-care-3set',
        description: '매일 사용하는 필수 구강 케어 3종 세트입니다.\n\n- 칫솔 1개\n- 치약 150g 1개\n- 구강청결제 250ml 1개\n- 약 15% 할인',
        short_description: '칫솔+치약+가글 3종 세트', price: 18900, sale_price: 14900, stock: 60, sku: 'ST-001', is_featured: 1,
        image_url: 'https://images.unsplash.com/photo-1571875257727-256c39da42af?w=500'
      },
      {
        category_id: 8, name: '프리미엄 토탈 케어 세트', slug: 'premium-total-care-set',
        description: '프리미엄 구강 케어 풀 세트입니다.\n\n- 전동칫솔 1개\n- 미백 치약 1개\n- 치실 1개\n- 구강청결제 1개',
        short_description: '전동칫솔 포함 프리미엄 세트', price: 89000, sale_price: 69000, stock: 30, sku: 'ST-002', is_featured: 1,
        image_url: 'https://images.unsplash.com/photo-1571875257727-256c39da42af?w=500'
      },
      {
        category_id: 8, name: '여행용 구강 세트', slug: 'travel-oral-care-set',
        description: '여행에 필요한 구강 케어 세트입니다.\n\n- 여행용 칫솔 1개\n- 미니 치약 30g\n- 휴대용 가글 80ml\n- 파우치 포함',
        short_description: '휴대 파우치 포함 여행 세트', price: 12900, sale_price: 9900, stock: 80, sku: 'ST-003', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1571875257727-256c39da42af?w=500'
      },
      {
        category_id: 8, name: '패밀리 대용량 세트', slug: 'family-bulk-set',
        description: '온 가족이 사용하는 대용량 세트입니다.\n\n- 칫솔 5개\n- 치약 2개\n- 구강청결제 1L\n- 치실 2개',
        short_description: '온 가족 대용량 구강 세트', price: 45900, sale_price: 35900, stock: 40, sku: 'ST-004', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1571875257727-256c39da42af?w=500'
      },
      {
        category_id: 8, name: '미백 스페셜 세트', slug: 'whitening-special-set',
        description: '치아 미백에 집중한 스페셜 세트입니다.\n\n- 미백 치약 1개\n- 미백 패치 7일분\n- 미백 가글 1개\n- 미백 펜 1개',
        short_description: '미백 전문 스페셜 세트', price: 49900, sale_price: 39900, stock: 35, sku: 'ST-005', is_featured: 1,
        image_url: 'https://images.unsplash.com/photo-1571875257727-256c39da42af?w=500'
      },
      {
        category_id: 8, name: '잇몸케어 세트', slug: 'gum-care-set',
        description: '잇몸 건강에 집중한 케어 세트입니다.\n\n- 잇몸케어 칫솔 2개\n- 잇몸케어 치약 1개\n- 잇몸케어 가글 1개\n- 치간칫솔 10개',
        short_description: '잇몸 건강 전문 케어 세트', price: 35900, sale_price: 27900, stock: 45, sku: 'ST-006', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1571875257727-256c39da42af?w=500'
      },
      {
        category_id: 8, name: '어린이 종합 세트', slug: 'kids-complete-set',
        description: '아이를 위한 종합 구강 케어 세트입니다.\n\n- 캐릭터 칫솔 2개\n- 어린이 치약 2개\n- 양치 컵 1개\n- 치실 픽 30개',
        short_description: '어린이 종합 구강 세트', price: 25900, sale_price: 19900, stock: 50, sku: 'ST-007', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1571875257727-256c39da42af?w=500'
      },
      {
        category_id: 8, name: '커플 세트', slug: 'couple-set',
        description: '커플을 위한 구강 케어 세트입니다.\n\n- 핑크 칫솔 1개\n- 블루 칫솔 1개\n- 치약 2개\n- 칫솔 홀더',
        short_description: '커플 맞춤 구강 세트', price: 22900, sale_price: 17900, stock: 55, sku: 'ST-008', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1571875257727-256c39da42af?w=500'
      },
      {
        category_id: 8, name: '신혼부부 선물 세트', slug: 'newlywed-gift-set',
        description: '신혼부부를 위한 프리미엄 선물 세트입니다.\n\n- 전동칫솔 2개\n- 치약 세트\n- 칫솔 스탠드\n- 고급 선물 박스',
        short_description: '신혼 선물 프리미엄 세트', price: 129000, sale_price: 99000, stock: 20, sku: 'ST-009', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1571875257727-256c39da42af?w=500'
      },
      {
        category_id: 8, name: '시린이 케어 세트', slug: 'sensitive-care-set',
        description: '시린 치아를 위한 전문 케어 세트입니다.\n\n- 시린이 칫솔 2개\n- 시린이 치약 1개\n- 시린이 가글 1개\n- 사용 가이드',
        short_description: '시린이 전문 케어 세트', price: 32900, sale_price: 25900, stock: 40, sku: 'ST-010', is_featured: 0,
        image_url: 'https://images.unsplash.com/photo-1571875257727-256c39da42af?w=500'
      }
    ];

    const insertProduct = db.prepare(`
      INSERT INTO products (category_id, name, slug, description, short_description, price, sale_price, stock, sku, is_featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertProductImage = db.prepare(`
      INSERT INTO product_images (product_id, image_url, alt_text, is_primary)
      VALUES (?, ?, ?, 1)
    `);

    products.forEach(product => {
      const result = insertProduct.run(
        product.category_id,
        product.name,
        product.slug,
        product.description,
        product.short_description,
        product.price,
        product.sale_price,
        product.stock,
        product.sku,
        product.is_featured
      );

      // 상품 이미지 추가
      if (product.image_url) {
        insertProductImage.run(result.lastInsertRowid, product.image_url, product.name);
      }
    });
    console.log('샘플 상품 80개 생성됨 (카테고리당 10개)');
  }

  // 이용약관 생성
  const checkTerms = db.prepare('SELECT id FROM terms WHERE type = ?').get('service');
  if (!checkTerms) {
    const terms = [
      {
        type: 'service',
        title: '서비스 이용약관',
        content: getServiceTerms(),
        version: '1.0',
        is_required: 1
      },
      {
        type: 'privacy',
        title: '개인정보 처리방침',
        content: getPrivacyPolicy(),
        version: '1.0',
        is_required: 1
      },
      {
        type: 'marketing',
        title: '마케팅 정보 수신 동의',
        content: getMarketingTerms(),
        version: '1.0',
        is_required: 0
      },
      {
        type: 'refund',
        title: '교환/반품 안내',
        content: getRefundPolicy(),
        version: '1.0',
        is_required: 0
      }
    ];

    const insertTerms = db.prepare(`
      INSERT INTO terms (type, title, content, version, is_required, effective_date)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);

    terms.forEach(term => {
      insertTerms.run(term.type, term.title, term.content, term.version, term.is_required);
    });
    console.log('약관 생성됨');
  }

  // 기본 FAQ 생성
  const checkFaq = db.prepare('SELECT id FROM faqs').get();
  if (!checkFaq) {
    const faqs = [
      { category: '배송', question: '배송은 얼마나 걸리나요?', answer: '결제 완료 후 1-2일 이내 발송되며, 발송 후 1-2일 내 수령 가능합니다. (주말/공휴일 제외)' },
      { category: '배송', question: '배송비는 얼마인가요?', answer: '3만원 이상 구매 시 무료배송이며, 그 미만은 2,500원의 배송비가 부과됩니다.' },
      { category: '교환/반품', question: '교환/반품은 어떻게 하나요?', answer: '상품 수령 후 7일 이내 1:1 문의를 통해 신청해주세요. 단순 변심의 경우 반송비는 고객 부담입니다.' },
      { category: '교환/반품', question: '반품 불가 상품이 있나요?', answer: '개봉 후 사용한 상품, 고객 부주의로 손상된 상품은 반품이 불가합니다.' },
      { category: '결제', question: '어떤 결제 수단을 사용할 수 있나요?', answer: '신용카드, 체크카드, 계좌이체, 가상계좌, 카카오페이, 네이버페이, 토스페이 등을 지원합니다.' },
      { category: '회원', question: '비밀번호를 잊어버렸어요.', answer: '로그인 페이지에서 "비밀번호 찾기"를 클릭하여 이메일 인증 후 재설정 가능합니다.' },
      { category: '적립금', question: '적립금은 어떻게 사용하나요?', answer: '결제 시 적립금 사용 금액을 입력하시면 됩니다. 최소 1,000원 이상부터 사용 가능합니다.' }
    ];

    const insertFaq = db.prepare(`
      INSERT INTO faqs (category, question, answer, sort_order)
      VALUES (?, ?, ?, ?)
    `);

    faqs.forEach((faq, index) => {
      insertFaq.run(faq.category, faq.question, faq.answer, index + 1);
    });
    console.log('FAQ 생성됨');
  }
};

function getServiceTerms() {
  return `제1조 (목적)
이 약관은 DLAS care shop(이하 "회사")이 운영하는 인터넷 쇼핑몰(이하 "몰")에서 제공하는 인터넷 관련 서비스(이하 "서비스")를 이용함에 있어 회사와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (정의)
1. "몰"이란 회사가 재화 또는 용역을 이용자에게 제공하기 위하여 컴퓨터 등 정보통신설비를 이용하여 재화 또는 용역을 거래할 수 있도록 설정한 가상의 영업장을 말합니다.
2. "이용자"란 "몰"에 접속하여 이 약관에 따라 "몰"이 제공하는 서비스를 받는 회원 및 비회원을 말합니다.
3. "회원"이라 함은 "몰"에 개인정보를 제공하여 회원등록을 한 자로서, "몰"의 정보를 지속적으로 제공받으며, "몰"이 제공하는 서비스를 계속적으로 이용할 수 있는 자를 말합니다.
4. "비회원"이라 함은 회원에 가입하지 않고 "몰"이 제공하는 서비스를 이용하는 자를 말합니다.

제3조 (약관의 명시와 개정)
1. 회사는 이 약관의 내용과 상호, 영업소 소재지, 대표자의 성명, 사업자등록번호, 연락처(전화, 전자우편 주소 등) 등을 이용자가 쉽게 알 수 있도록 몰의 초기 서비스화면에 게시합니다.
2. 회사는 약관의 규제에 관한 법률, 전자거래기본법, 전자서명법, 정보통신망 이용촉진 등에 관한 법률, 소비자보호법 등 관련법을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.
3. 회사가 약관을 개정할 경우에는 적용일자 및 개정사유를 명시하여 현행약관과 함께 몰의 초기화면에 그 적용일자 7일 이전부터 적용일자 전일까지 공지합니다.

제4조 (서비스의 제공 및 변경)
1. 회사는 다음과 같은 업무를 수행합니다.
   - 재화 또는 용역에 대한 정보 제공 및 구매계약의 체결
   - 구매계약이 체결된 재화 또는 용역의 배송
   - 기타 회사가 정하는 업무
2. 회사는 재화의 품절 또는 기술적 사양의 변경 등의 경우에는 장차 체결되는 계약에 의해 제공할 재화의 내용을 변경할 수 있습니다.

제5조 (서비스의 중단)
1. 회사는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신의 두절 등의 사유가 발생한 경우에는 서비스의 제공을 일시적으로 중단할 수 있습니다.
2. 사업종목의 전환, 사업의 포기, 업체간의 통합 등의 이유로 서비스를 제공할 수 없게 되는 경우에는 회사는 제8조에 정한 방법으로 이용자에게 통지합니다.

제6조 (회원가입)
1. 이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 이 약관에 동의한다는 의사표시를 함으로서 회원가입을 신청합니다.
2. 회사는 전항과 같이 회원으로 가입할 것을 신청한 이용자 중 다음 각호에 해당하지 않는 한 회원으로 등록합니다.
   - 가입신청자가 이 약관에 의하여 이전에 회원자격을 상실한 적이 있는 경우
   - 등록 내용에 허위, 기재누락, 오기가 있는 경우
   - 기타 회원으로 등록하는 것이 몰의 기술상 현저히 지장이 있다고 판단되는 경우

제7조 (회원 탈퇴 및 자격 상실 등)
1. 회원은 회사에 언제든지 탈퇴를 요청할 수 있으며 회사는 즉시 회원탈퇴를 처리합니다.
2. 회원이 다음 각호의 사유에 해당하는 경우, 회사는 회원자격을 제한 및 정지시킬 수 있습니다.
   - 가입 신청 시에 허위 내용을 등록한 경우
   - 다른 사람의 몰 이용을 방해하거나 그 정보를 도용하는 등 전자거래질서를 위협하는 경우
   - 몰을 이용하여 법령과 이 약관이 금지하거나 공서양속에 반하는 행위를 하는 경우

제8조 (회원에 대한 통지)
1. 회사가 회원에 대한 통지를 하는 경우, 회원이 회사에 제출한 전자우편 주소로 할 수 있습니다.
2. 회사는 불특정다수 회원에 대한 통지의 경우 1주일이상 몰 게시판에 게시함으로서 개별 통지에 갈음할 수 있습니다.

제9조 (구매신청)
몰 이용자는 몰 상에서 이하의 방법에 의하여 구매를 신청합니다.
1. 성명, 주소, 전화번호, 전자우편주소(또는 이동전화번호) 입력
2. 재화 또는 용역의 선택
3. 결제방법의 선택
4. 이 약관에 동의한다는 표시(예: 마우스 클릭)

제10조 (계약의 성립)
1. 회사는 제9조와 같은 구매신청에 대하여 다음 각호에 해당하지 않는 한 승낙합니다.
   - 신청 내용에 허위, 기재누락, 오기가 있는 경우
   - 기타 구매신청에 승낙하는 것이 회사의 기술상 현저히 지장이 있다고 판단하는 경우
2. 회사의 승낙이 제12조 제1항의 수신확인통지형태로 이용자에게 도달한 시점에 계약이 성립한 것으로 봅니다.

제11조 (지급방법)
몰에서 구매한 재화 또는 용역에 대한 대금지급방법은 다음 각호의 하나로 할 수 있습니다.
1. 신용카드결제
2. 실시간 계좌이체
3. 가상계좌 입금
4. 간편결제(카카오페이, 네이버페이, 토스페이 등)

제12조 (수신확인통지, 구매신청 변경 및 취소)
1. 회사는 이용자의 구매신청이 있는 경우 이용자에게 수신확인통지를 합니다.
2. 수신확인통지를 받은 이용자는 의사표시의 불일치 등이 있는 경우에는 수신확인통지를 받은 후 즉시 구매신청 변경 및 취소를 요청할 수 있습니다.

제13조 (배송)
1. 회사는 이용자가 구매한 재화에 대해 배송수단, 수단별 배송비용 부담자, 수단별 배송기간 등을 명시합니다.
2. 회사는 이용자와 재화의 공급시기에 관하여 별도의 약정이 없는 이상, 이용자가 대금을 결제한 날부터 7일 이내에 재화 등을 배송할 수 있도록 주문제작, 포장 등 기타의 필요한 조치를 취합니다.

제14조 (환급, 반품 및 교환)
1. 회사는 이용자가 구매 신청한 재화 등이 품절 등의 사유로 재화 등의 공급을 할 수 없을 때에는 지체없이 그 사유를 이용자에게 통지하고, 사전에 재화 등의 대금을 받은 경우에는 대금을 받은 날부터 3영업일 이내에 환급하거나 환급에 필요한 조치를 취합니다.
2. 이용자는 배송받은 재화가 주문 내용과 다르거나 회사가 광고 등에서 표시한 배송조건과 다르게 배송된 경우에는 배송받은 날로부터 3개월 이내, 그 사실을 안 날 또는 알 수 있었던 날부터 30일 이내에 청약철회 등을 할 수 있습니다.

제15조 (개인정보보호)
1. 회사는 이용자의 정보수집시 서비스 제공에 필요한 최소한의 정보를 수집합니다.
2. 회사는 회원가입시 구매계약이행에 필요한 정보를 미리 수집하지 않습니다.
3. 회사는 수집된 개인정보를 목적외의 용도로 이용할 수 없으며, 새로운 이용목적이 발생한 경우 또는 제3자에게 제공하는 경우에는 이용, 제공단계에서 당해 이용자에게 그 목적을 고지하고 동의를 받습니다.

제16조 (회사의 의무)
1. 회사는 법령과 이 약관이 금지하거나 공서양속에 반하는 행위를 하지 않으며 이 약관이 정하는 바에 따라 지속적이고, 안정적으로 재화, 용역을 제공하는데 최선을 다하여야 합니다.
2. 회사는 이용자가 안전하게 인터넷 서비스를 이용할 수 있도록 이용자의 개인정보(신용정보 포함)보호를 위한 보안 시스템을 갖추어야 합니다.

제17조 (회원의 의무)
1. 이용자는 다음 행위를 하여서는 안됩니다.
   - 신청 또는 변경시 허위 내용의 등록
   - 타인의 정보 도용
   - 회사에 게시된 정보의 변경
   - 회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등)의 송신 또는 게시
   - 회사 기타 제3자의 저작권 등 지적재산권에 대한 침해
   - 회사 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위

제18조 (저작권의 귀속 및 이용제한)
1. 회사가 작성한 저작물에 대한 저작권 기타 지적재산권은 회사에 귀속합니다.
2. 이용자는 몰을 이용함으로써 얻은 정보를 회사의 사전 승낙없이 복제, 송신, 출판, 배포, 방송 기타 방법에 의하여 영리목적으로 이용하거나 제3자에게 이용하게 하여서는 안됩니다.

제19조 (분쟁해결)
1. 회사는 이용자가 제기하는 정당한 의견이나 불만을 반영하고 그 피해를 보상처리하기 위하여 피해보상처리기구를 설치, 운영합니다.
2. 회사는 이용자로부터 제출되는 불만사항 및 의견은 우선적으로 그 사항을 처리합니다. 다만, 신속한 처리가 곤란한 경우에는 이용자에게 그 사유와 처리일정을 즉시 통보해 드립니다.

제20조 (재판권 및 준거법)
이 약관의 해석 및 회사와 이용자간의 분쟁에 대하여는 대한민국 법을 적용합니다.

부칙
이 약관은 2026년 1월 17일부터 시행합니다.`;
}

function getPrivacyPolicy() {
  return `개인정보 처리방침

DLAS care shop(이하 "회사")은 고객님의 개인정보를 중요시하며, "정보통신망 이용촉진 및 정보보호에 관한 법률", "개인정보보호법" 등 관련 법령을 준수하고 있습니다.

1. 수집하는 개인정보의 항목 및 수집방법

가. 수집하는 개인정보의 항목
[필수항목]
- 회원가입 시: 이메일, 비밀번호, 이름, 휴대폰번호
- 상품 구매 시: 배송지 주소, 수령인 정보
- 결제 시: 결제 정보(신용카드 정보, 계좌번호 등은 PG사에서 직접 수집)

[선택항목]
- 성별, 생년월일
- 마케팅 수신 동의 여부

나. 개인정보 수집방법
- 홈페이지 회원가입, 상품 구매, 고객센터 문의
- 생성정보 수집 툴을 통한 수집

2. 개인정보의 수집 및 이용목적

회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다.

가. 서비스 제공에 관한 계약 이행 및 서비스 제공에 따른 요금정산
- 컨텐츠 제공, 구매 및 요금 결제, 물품배송 또는 청구지 등 발송, 본인인증

나. 회원 관리
- 회원제 서비스 이용에 따른 본인확인, 개인 식별, 불량회원의 부정 이용 방지와 비인가 사용 방지, 가입 의사 확인, 연령확인, 불만처리 등 민원처리, 고지사항 전달

다. 마케팅 및 광고에 활용 (동의자에 한함)
- 신규 서비스 개발 및 맞춤 서비스 제공, 이벤트 및 광고성 정보 제공 및 참여기회 제공, 인구통계학적 특성에 따른 서비스 제공 및 광고 게재, 접속 빈도 파악 또는 회원의 서비스 이용에 대한 통계

3. 개인정보의 보유 및 이용기간

회사는 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 다음의 정보에 대해서는 아래의 이유로 명시한 기간 동안 보존합니다.

가. 회사 내부 방침에 의한 정보보유 사유
- 부정이용기록: 1년 (부정 이용 방지)

나. 관련법령에 의한 정보보유 사유
- 계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래등에서의 소비자보호에 관한 법률)
- 대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래등에서의 소비자보호에 관한 법률)
- 소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래등에서의 소비자보호에 관한 법률)
- 표시/광고에 관한 기록: 6개월 (전자상거래등에서의 소비자보호에 관한 법률)
- 웹사이트 방문기록: 3개월 (통신비밀보호법)

4. 개인정보의 파기절차 및 방법

가. 파기절차
회원님이 회원가입 등을 위해 입력한 정보는 목적이 달성된 후 별도의 DB로 옮겨져 내부 방침 및 기타 관련 법령에 의한 정보보호 사유에 따라 일정 기간 저장된 후 파기됩니다.

나. 파기방법
- 전자적 파일형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다.
- 종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각을 통하여 파기합니다.

5. 개인정보 제공

회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다.
- 이용자들이 사전에 동의한 경우
- 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우

6. 수집한 개인정보의 위탁

회사는 서비스 이행을 위해 아래와 같이 개인정보 처리 업무를 위탁하고 있습니다.

[물류/배송]
- 수탁업체: CJ대한통운, 한진택배, 롯데택배 등
- 위탁업무: 상품 배송

[결제]
- 수탁업체: 토스페이먼츠
- 위탁업무: 결제 처리

7. 이용자 및 법정대리인의 권리와 그 행사방법

가. 이용자 및 법정대리인은 언제든지 등록되어 있는 자신 혹은 당해 만 14세 미만 아동의 개인정보를 조회하거나 수정할 수 있으며 가입해지를 요청할 수도 있습니다.

나. 이용자 혹은 만 14세 미만 아동의 개인정보 조회, 수정을 위해서는 '회원정보수정'을, 가입해지(동의철회)를 위해서는 "회원탈퇴"를 클릭하여 본인 확인 절차를 거치신 후 직접 열람, 정정 또는 탈퇴가 가능합니다.

다. 혹은 개인정보관리책임자에게 서면, 전화 또는 이메일로 연락하시면 지체없이 조치하겠습니다.

8. 개인정보 자동 수집 장치의 설치/운영 및 거부에 관한 사항

가. 쿠키란?
회사는 개인화되고 맞춤화된 서비스를 제공하기 위해서 이용자의 정보를 저장하고 수시로 불러오는 '쿠키(cookie)'를 사용합니다.

나. 쿠키의 사용 목적
이용자들이 방문한 각 서비스와 웹 사이트들에 대한 방문 및 이용형태, 인기 검색어, 보안접속 여부 등을 파악하여 이용자에게 최적화된 정보 제공을 위해 사용됩니다.

다. 쿠키의 설치/운영 및 거부
이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다. 따라서, 이용자는 웹브라우저에서 옵션을 설정함으로써 모든 쿠키를 허용하거나, 쿠키가 저장될 때마다 확인을 거치거나, 아니면 모든 쿠키의 저장을 거부할 수도 있습니다.

9. 개인정보의 기술적/관리적 보호 대책

회사는 이용자들의 개인정보를 취급함에 있어 개인정보가 분실, 도난, 누출, 변조 또는 훼손되지 않도록 안전성 확보를 위하여 다음과 같은 기술적/관리적 대책을 강구하고 있습니다.

가. 비밀번호 암호화
회원 비밀번호는 암호화되어 저장 및 관리되고 있어, 본인만이 알 수 있으며 중요한 데이터는 파일 및 전송 데이터를 암호화하는 등의 별도 보안기능을 사용하고 있습니다.

나. 해킹 등에 대비한 기술적 대책
회사는 해킹이나 컴퓨터 바이러스 등에 의해 회원의 개인정보가 유출되거나 훼손되는 것을 막기 위해 최선을 다하고 있습니다.

다. 취급 직원의 최소화 및 교육
회사의 개인정보관련 취급 직원은 담당자에 한정시키고 있고 이를 위한 별도의 비밀번호를 부여하여 정기적으로 갱신하고 있으며, 담당자에 대한 수시 교육을 통하여 개인정보 처리방침의 준수를 항상 강조하고 있습니다.

10. 개인정보 보호책임자 및 담당자 안내

가. 회사는 고객의 개인정보를 보호하고 개인정보와 관련한 불만을 처리하기 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.

[개인정보 보호책임자]
- 성명: 김종환
- 직책: 대표
- 이메일: support@dlas.io
- 전화번호: 032-212-2882

나. 기타 개인정보침해에 대한 신고나 상담이 필요하신 경우에는 아래 기관에 문의하시기 바랍니다.
- 개인정보침해신고센터 (privacy.kisa.or.kr / 국번없이 118)
- 대검찰청 사이버수사과 (www.spo.go.kr / 국번없이 1301)
- 경찰청 사이버안전국 (cyberbureau.police.go.kr / 국번없이 182)

11. 고지의 의무

현 개인정보 처리방침 내용 추가, 삭제 및 수정이 있을 시에는 개정 최소 7일전부터 홈페이지의 '공지사항'을 통해 고지할 것입니다.

- 공고일자: 2026년 1월 17일
- 시행일자: 2026년 1월 17일`;
}

function getMarketingTerms() {
  return `마케팅 정보 수신 동의

DLAS care shop에서 제공하는 이벤트/혜택 등 다양한 정보를 휴대전화 문자메시지(SMS), 이메일로 받아보실 수 있습니다.

1. 마케팅 정보 수신 동의 시 수집 및 이용 목적
- 신상품이나 이벤트 정보 등의 안내
- 회원 맞춤형 서비스 제공
- 할인쿠폰 및 적립금 등 혜택 정보 제공

2. 수집 항목
- 이메일 주소, 휴대폰 번호

3. 보유 및 이용기간
- 회원 탈퇴 시 또는 마케팅 정보 수신 동의 철회 시까지

4. 동의 거부권 및 불이익
- 마케팅 정보 수신에 대한 동의는 거부하실 수 있으며, 동의하지 않아도 회원가입은 가능합니다.
- 다만, 동의를 거부하신 경우 각종 소식 및 이벤트 참여에 제한이 있을 수 있습니다.

5. 수신 동의 변경 방법
- 마이페이지 > 회원정보수정에서 언제든지 수신 동의를 변경하실 수 있습니다.
- 또는 고객센터를 통해 변경 요청하실 수 있습니다.`;
}

function getRefundPolicy() {
  return `교환/반품 안내

DLAS care shop의 교환/반품 정책을 안내해 드립니다.

1. 교환/반품 신청 기간

가. 단순 변심에 의한 교환/반품
- 상품 수령일로부터 7일 이내 신청 가능

나. 상품 하자에 의한 교환/반품
- 상품 수령일로부터 30일 이내 신청 가능
- 단, 상품 하자 발견 즉시 고객센터로 연락 부탁드립니다.

2. 교환/반품 신청 방법

가. 마이페이지 > 주문내역에서 해당 주문의 "교환/반품 신청" 버튼 클릭
나. 1:1 문의 게시판을 통한 신청
다. 고객센터 전화 문의 (032-212-2882, 2885, 2887)

3. 교환/반품 배송비

가. 단순 변심에 의한 교환/반품
- 왕복 배송비 5,000원 고객 부담
- 반품 시 편도 배송비 2,500원 고객 부담

나. 상품 하자/오배송에 의한 교환/반품
- 배송비 무료 (회사 부담)

4. 교환/반품이 불가능한 경우

가. 고객님의 책임 있는 사유로 상품이 멸실 또는 훼손된 경우
나. 포장을 개봉하여 사용 또는 일부 소비한 경우
다. 시간의 경과에 의해 재판매가 곤란할 정도로 가치가 현저히 감소한 경우
라. 복제가 가능한 상품의 포장을 훼손한 경우
마. 고객님의 주문에 따라 개별적으로 생산되는 상품
바. 세트 상품의 일부만 반품하는 경우

5. 환불 안내

가. 환불 처리 기간
- 반품 상품 입고 확인 후 3영업일 이내 환불 처리
- 카드 결제: 카드사 처리 일정에 따라 3~7영업일 소요
- 계좌이체/가상계좌: 환불 계좌로 3영업일 이내 입금

나. 부분 환불
- 여러 상품 중 일부만 반품하는 경우, 해당 상품 금액에서 배송비를 차감하여 환불
- 무료배송 기준 금액(3만원) 미만이 되는 경우, 기존 배송비 차감 후 환불

6. 문의처

- 고객센터: 032-212-2882, 2885, 2887
- 운영시간: 평일 09:00~18:00 (점심시간 12:00~13:00)
- 이메일: support@dlas.io

시행일자: 2026년 1월 17일`;
}

// 기존 테이블에 컬럼 추가 (마이그레이션)
const runMigrations = () => {
  console.log('마이그레이션 실행...');

  // users 테이블에 판매자 관련 컬럼 추가
  const userColumns = db.prepare("PRAGMA table_info(users)").all();
  const userColumnNames = userColumns.map(col => col.name);

  if (!userColumnNames.includes('seller_business_name')) {
    db.exec(`ALTER TABLE users ADD COLUMN seller_business_name VARCHAR(100) DEFAULT NULL`);
    console.log('users 테이블에 seller_business_name 컬럼 추가됨');
  }
  if (!userColumnNames.includes('seller_business_number')) {
    db.exec(`ALTER TABLE users ADD COLUMN seller_business_number VARCHAR(20) DEFAULT NULL`);
    console.log('users 테이블에 seller_business_number 컬럼 추가됨');
  }
  if (!userColumnNames.includes('seller_status')) {
    db.exec(`ALTER TABLE users ADD COLUMN seller_status VARCHAR(20) DEFAULT NULL`);
    console.log('users 테이블에 seller_status 컬럼 추가됨');
  }
  if (!userColumnNames.includes('seller_approved_at')) {
    db.exec(`ALTER TABLE users ADD COLUMN seller_approved_at DATETIME DEFAULT NULL`);
    console.log('users 테이블에 seller_approved_at 컬럼 추가됨');
  }

  // products 테이블에 seller_id 컬럼 추가
  const productColumns = db.prepare("PRAGMA table_info(products)").all();
  const productColumnNames = productColumns.map(col => col.name);

  if (!productColumnNames.includes('seller_id')) {
    db.exec(`ALTER TABLE products ADD COLUMN seller_id INTEGER DEFAULT NULL`);
    console.log('products 테이블에 seller_id 컬럼 추가됨');
  }

  console.log('마이그레이션 완료!');
};

// 실행
initDatabase();
runMigrations();
