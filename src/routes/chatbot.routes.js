const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const chatbotController = require('../controllers/chatbot.controller');

router.post('/', authenticate, authorize('mahasiswa'), chatbotController.sendMessage);

module.exports = router;
