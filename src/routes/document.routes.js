const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/auth.middleware');
const upload = require('../config/multer');

const documentController = require('../controllers/document.controller');

router.post(
  '/upload',
  authenticate,
  upload.single('file'),
  documentController.upload
);

router.get(
  '/check',
  authenticate,
  documentController.checkCompleteness,
);

module.exports = router;