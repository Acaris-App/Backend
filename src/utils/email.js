const emailQueue = require('../config/queue');

exports.sendOTPEmail = async (email, code, type = 'login') => {
  await emailQueue.add({
    to: email,
    code,
    type
  });
};