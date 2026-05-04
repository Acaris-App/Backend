const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { uploadPDF, uploadPDFLarge } = require('../config/multer');
const adminController = require('../controllers/admin.controller');

const adminOnly = [authenticate, authorize('admin')];

router.get('/knowledge-base', ...adminOnly, adminController.getAllKnowledgeBase);

router.post('/knowledge-base', ...adminOnly, uploadPDFLarge.single('file'), adminController.createKnowledgeBase);

router.put('/knowledge-base/:id', ...adminOnly, uploadPDFLarge.single('file'), adminController.updateKnowledgeBase);

router.delete('/knowledge-base/:id', ...adminOnly, adminController.deleteKnowledgeBase);

router.get('/users', ...adminOnly, adminController.getAllUsers);

router.post('/users/admin', ...adminOnly, adminController.createAdmin);

router.put('/users/:id', ...adminOnly, adminController.updateUser);

router.patch('/users/:id/status', ...adminOnly, adminController.updateUserStatus);

router.delete('/users/:id', ...adminOnly, adminController.deleteUser);

router.get('/documents', ...adminOnly, adminController.getAllDocuments);

router.get('/documents/stats', ...adminOnly, adminController.getDocumentStats);

module.exports = router;
