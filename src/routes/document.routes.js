const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/auth.middleware');
const { uploadPDF } = require('../config/multer');

const documentController = require('../controllers/document.controller');

// 📤 Upload dokumen baru
router.post(
  '/upload',
  authenticate,
  uploadPDF.single('file'),
  documentController.upload
);

// 🔄 Update/Replace dokumen yang sudah ada
router.put(
  '/update/:document_id',
  authenticate,
  uploadPDF.single('file'),
  documentController.updateDocument
);

// ✅ Cek kelengkapan dokumen
router.get(
  '/check',
  authenticate,
  documentController.checkCompleteness
);

module.exports = router;
