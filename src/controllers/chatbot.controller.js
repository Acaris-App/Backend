const chatbotService = require('../services/chatbot.service');

exports.sendMessage = async (req, res, next) => {
  try {
    const result = await chatbotService.sendMessage({
      user: req.user,
      body: req.body
    });

    res.status(200).json({
      status: 'success',
      message: 'Berhasil mendapatkan balasan chatbot',
      data: result
    });
  } catch (err) { next(err); }
};
