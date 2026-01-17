const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middlewares/auth');
const { ddcareUpload, handleUploadError } = require('../middlewares/upload');

const router = express.Router();

// 든든케어 인증 유형
const DDCARE_TYPES = {
  BASIC_LIVELIHOOD: '기초생활수급자',
  SECOND_CLASS: '차상위계층',
  SINGLE_PARENT: '한부모가정',
  DISABLED: '장애인',
  NATIONAL_MERIT: '국가유공자',
  MULTICULTURAL: '다문화가정'
};

// 든든케어 할인율 (30%)
const DDCARE_DISCOUNT_RATE = 0.30;

// 내 든든케어 상태 조회
router.get('/status', authenticate, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT ddcare_status, ddcare_type, ddcare_approved_at, ddcare_expires_at
      FROM users WHERE id = ?
    `).get(req.user.id);

    // 만료 여부 확인
    let status = user.ddcare_status;
    if (status === 'approved' && user.ddcare_expires_at) {
      const expiresAt = new Date(user.ddcare_expires_at);
      if (expiresAt < new Date()) {
        // 만료됨 - 상태 업데이트
        db.prepare(`
          UPDATE users SET ddcare_status = 'expired' WHERE id = ?
        `).run(req.user.id);
        status = 'expired';
      }
    }

    // 대기 중인 신청이 있는지 확인
    const pendingApplication = db.prepare(`
      SELECT id, ddcare_type, document_url, status, created_at
      FROM ddcare_applications
      WHERE user_id = ? AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
    `).get(req.user.id);

    res.json({
      status,
      type: user.ddcare_type,
      typeName: DDCARE_TYPES[user.ddcare_type] || user.ddcare_type,
      approvedAt: user.ddcare_approved_at,
      expiresAt: user.ddcare_expires_at,
      discountRate: status === 'approved' ? DDCARE_DISCOUNT_RATE : 0,
      pendingApplication,
      ddcareTypes: DDCARE_TYPES
    });
  } catch (error) {
    console.error('Get ddcare status error:', error);
    res.status(500).json({ error: '든든케어 상태 조회 중 오류가 발생했습니다.' });
  }
});

// 든든케어 신청
router.post('/apply',
  authenticate,
  ddcareUpload.single('document'),
  handleUploadError,
  [
    body('ddcareType').notEmpty().withMessage('인증 유형을 선택해주세요.')
  ],
  (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { ddcareType } = req.body;

      // 유효한 유형인지 확인
      if (!Object.keys(DDCARE_TYPES).includes(ddcareType)) {
        return res.status(400).json({ error: '유효하지 않은 인증 유형입니다.' });
      }

      // 파일 업로드 확인
      if (!req.file) {
        return res.status(400).json({ error: '증빙서류를 첨부해주세요.' });
      }

      // 이미 승인된 회원인지 확인
      const user = db.prepare('SELECT ddcare_status, ddcare_expires_at FROM users WHERE id = ?')
        .get(req.user.id);

      if (user.ddcare_status === 'approved') {
        const expiresAt = new Date(user.ddcare_expires_at);
        if (expiresAt > new Date()) {
          return res.status(400).json({ error: '이미 든든케어 회원입니다.' });
        }
      }

      // 대기 중인 신청이 있는지 확인
      const pendingApplication = db.prepare(`
        SELECT id FROM ddcare_applications WHERE user_id = ? AND status = 'pending'
      `).get(req.user.id);

      if (pendingApplication) {
        return res.status(400).json({ error: '이미 대기 중인 신청이 있습니다.' });
      }

      // 신청 생성
      const documentUrl = `/uploads/ddcare/${req.file.filename}`;
      const result = db.prepare(`
        INSERT INTO ddcare_applications (user_id, ddcare_type, document_url, status)
        VALUES (?, ?, ?, 'pending')
      `).run(req.user.id, ddcareType, documentUrl);

      // 사용자 상태 업데이트
      db.prepare(`
        UPDATE users SET ddcare_status = 'pending' WHERE id = ?
      `).run(req.user.id);

      res.status(201).json({
        message: '든든케어 신청이 완료되었습니다. 검토 후 결과를 알려드리겠습니다.',
        applicationId: result.lastInsertRowid
      });
    } catch (error) {
      console.error('Apply ddcare error:', error);
      res.status(500).json({ error: '든든케어 신청 중 오류가 발생했습니다.' });
    }
  }
);

// 내 신청 내역 조회
router.get('/applications', authenticate, (req, res) => {
  try {
    const applications = db.prepare(`
      SELECT da.*, u.name as reviewed_by_name
      FROM ddcare_applications da
      LEFT JOIN users u ON da.reviewed_by = u.id
      WHERE da.user_id = ?
      ORDER BY da.created_at DESC
    `).all(req.user.id);

    // 타입 이름 추가
    const applicationsWithTypeName = applications.map(app => ({
      ...app,
      ddcare_type_name: DDCARE_TYPES[app.ddcare_type] || app.ddcare_type
    }));

    res.json({ applications: applicationsWithTypeName });
  } catch (error) {
    console.error('Get ddcare applications error:', error);
    res.status(500).json({ error: '신청 내역 조회 중 오류가 발생했습니다.' });
  }
});

// 든든케어 유형 목록
router.get('/types', (req, res) => {
  res.json({ types: DDCARE_TYPES });
});

module.exports = router;
