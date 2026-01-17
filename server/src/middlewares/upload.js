const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// 저장소 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// 든든케어 문서용 저장소 설정
const ddcareStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const ddcareDir = path.join(__dirname, '../../uploads/ddcare');
    // 폴더가 없으면 생성
    if (!fs.existsSync(ddcareDir)) {
      fs.mkdirSync(ddcareDir, { recursive: true });
    }
    cb(null, ddcareDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// 파일 필터
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('지원하지 않는 파일 형식입니다. (jpg, jpeg, png, gif, webp만 허용)'), false);
  }
};

// 든든케어 문서 필터 (이미지 + PDF)
const ddcareFileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('지원하지 않는 파일 형식입니다. (jpg, jpeg, png, gif, webp, pdf만 허용)'), false);
  }
};

// 파일 크기 제한 (5MB)
const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024;

// 든든케어 파일 크기 제한 (10MB)
const ddcareMaxSize = 10 * 1024 * 1024;

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxSize
  }
});

// 든든케어 문서 업로드 설정
const ddcareUpload = multer({
  storage: ddcareStorage,
  fileFilter: ddcareFileFilter,
  limits: {
    fileSize: ddcareMaxSize
  }
});

// 에러 핸들링 미들웨어
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '파일 크기는 5MB를 초과할 수 없습니다.' });
    }
    return res.status(400).json({ error: err.message });
  }

  if (err) {
    return res.status(400).json({ error: err.message });
  }

  next();
};

module.exports = { upload, ddcareUpload, handleUploadError };
