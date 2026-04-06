const authService = require('../services/auth.service');

exports.login = async (req, res, next) => {
  try {
    const result = await authService.login({
      ...req.body,
      ip: req.ip
    });

    res.status(200).json({
      status: "success",
      message: result.message
    });

  } catch (err) {
    next(err);
  }
};

exports.verifyLoginOTP = async (req, res, next) => {
  try {
    const result = await authService.verifyLoginOTP(req.body);

    res.status(200).json({
      status: "success",
      message: "Login berhasil",
      data: result
    });

  } catch (err) {
    next(err);
  }
};

exports.register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);

    res.status(201).json({
      status: "success",
      message: result.message
    });

  } catch (err) {
    next(err);
  }
};

exports.verifyRegisterOTP = async (req, res, next) => {
  try {
    const result = await authService.verifyRegisterOTP(req.body);

    res.status(200).json({
      status: "success",
      message: result.message
    });

  } catch (err) {
    next(err);
  }
};

exports.resendOTP = async (req, res, next) => {
  try {
    const result = await authService.resendOTP(req.body);

    res.status(200).json({
      status: "success",
      message: result.message
    });

  } catch (err) {
    next(err);
  }
};