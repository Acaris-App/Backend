const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/auth.middleware');
const { uploadPDF } = require('../config/multer');

const documentController = require('../controllers/document.controller');

// 📋 Ambil semua dokumen milik user (dengan filter opsional)
router.get(
  '/list',
  authenticate,
  documentController.getDocuments
);

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

// 🗑️ Hapus dokumen
router.delete(
  '/delete/:document_id',
  authenticate,
  documentController.deleteDocument
);

// ✅ Cek kelengkapan dokumen
router.get(
  '/check',
  authenticate,
  documentController.checkCompleteness
);

module.exports = router;
