const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/academic.controller');

router.get('/summary', authenticate, controller.summary);
router.get('/courses', authenticate, controller.courses);

router.post('/internal/import-khs', (req, res, next) => {
  const expected = process.env.N8N_ACADEMIC_CALLBACK_SECRET;
  if (!expected || req.get('x-academic-callback-secret') !== expected) {
    return res.status(401).json({ status: 'error', message: 'Callback tidak terautentikasi' });
  }
  return next();
}, controller.importKhs);

router.post('/internal/import-curriculum', (req, res, next) => {
  const expected = process.env.N8N_ACADEMIC_CALLBACK_SECRET;
  if (!expected || req.get('x-academic-callback-secret') !== expected) {
    return res.status(401).json({ status: 'error', message: 'Callback tidak terautentikasi' });
  }
  return next();
}, controller.importCurriculum);

module.exports = router;
