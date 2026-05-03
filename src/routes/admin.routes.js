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

// GET /admin/users?role=mahasiswa&search=budi&sort_by=name_asc&page=1&limit=20
router.get('/users', ...adminOnly, adminController.getAllUsers);

// POST /admin/users/admin — tambah akun admin baru
router.post('/users/admin', ...adminOnly, adminController.createAdmin);

// PUT /admin/users/:id — edit nama, email, identifier
router.put('/users/:id', ...adminOnly, adminController.updateUser);

// PATCH /admin/users/:id/status — aktifkan (true) atau nonaktifkan (false)
router.patch('/users/:id/status', ...adminOnly, adminController.updateUserStatus);

// DELETE /admin/users/:id
router.delete('/users/:id', ...adminOnly, adminController.deleteUser);


// ================================================================
// PBI-25: MONITORING DOKUMEN MAHASISWA
// ================================================================

// GET /admin/documents?document_type=krs&semester=1&user_id=5
router.get('/documents', ...adminOnly, adminController.getAllDocuments);

// GET /admin/documents/stats — ringkasan statistik upload dokumen
router.get('/documents/stats', ...adminOnly, adminController.getDocumentStats);


module.exports = router;
