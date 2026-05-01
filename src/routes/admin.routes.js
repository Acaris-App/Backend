const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { uploadPDF, uploadPDFLarge } = require('../config/multer');
const adminController = require('../controllers/admin.controller');

const adminOnly = [authenticate, authorize('admin')];

// ================================================================
// PBI-12: KNOWLEDGE BASE
// ================================================================

// GET /admin/knowledge-base?category=jadwal
router.get('/knowledge-base', ...adminOnly, adminController.getAllKnowledgeBase);

// POST /admin/knowledge-base (multipart: file PDF + category, maks 50MB)
router.post('/knowledge-base', ...adminOnly, uploadPDFLarge.single('file'), adminController.createKnowledgeBase);

// PUT /admin/knowledge-base/:id (file opsional — jika dikirim, timpa file lama)
router.put('/knowledge-base/:id', ...adminOnly, uploadPDFLarge.single('file'), adminController.updateKnowledgeBase);

// DELETE /admin/knowledge-base/:id
router.delete('/knowledge-base/:id', ...adminOnly, adminController.deleteKnowledgeBase);


// ================================================================
// PBI-24: KELOLA AKUN PENGGUNA
// ================================================================

// GET /admin/users?role=mahasiswa&is_verified=false&search=budi
router.get('/users', ...adminOnly, adminController.getAllUsers);

// PATCH /admin/users/:userId/status — aktifkan atau nonaktifkan akun
router.patch('/users/:userId/status', ...adminOnly, adminController.updateUserStatus);

// DELETE /admin/users/:userId
router.delete('/users/:userId', ...adminOnly, adminController.deleteUser);


// ================================================================
// PBI-25: MONITORING DOKUMEN MAHASISWA
// ================================================================

// GET /admin/documents?document_type=krs&semester=1&user_id=5
router.get('/documents', ...adminOnly, adminController.getAllDocuments);

// GET /admin/documents/stats — ringkasan statistik upload dokumen
router.get('/documents/stats', ...adminOnly, adminController.getDocumentStats);


module.exports = router;
