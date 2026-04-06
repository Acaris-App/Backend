const multer = require('multer');

// 🔥 MEMORY STORAGE (WAJIB untuk GCS)
const storage = multer.memoryStorage();

// 🔥 VALIDASI FILE
const fileFilter = (req, file, cb) => {
  if (!file) {
    return cb(new Error('File wajib diupload'), false);
  }

  if (file.mimetype !== 'application/pdf') {
    return cb(new Error('Hanya file PDF'), false);
  }

  cb(null, true);
};

// 🔥 CONFIG MULTER
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  }
});

module.exports = { upload };