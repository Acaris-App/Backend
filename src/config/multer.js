const multer = require('multer');
const fs = require('fs');
const path = require('path');

// ================= PATH =================
const uploadDir = path.join(__dirname, '../../uploads');

// ================= CREATE FOLDER =================
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ================= STORAGE =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + '-' + Math.round(Math.random() * 1e9) + '.pdf';

    cb(null, uniqueName);
  }
});

// ================= FILE FILTER =================
const fileFilter = (req, file, cb) => {

  const ext = path.extname(file.originalname).toLowerCase();

  if (
    file.mimetype !== 'application/pdf' ||
    ext !== '.pdf'
  ) {
    return cb(new Error('Hanya file PDF yang diperbolehkan'), false);
  }

  cb(null, true);
};

// ================= MULTER CONFIG =================
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1
  }
});

module.exports = upload;