const authService = require('../services/auth.service');

exports.login = async (req, res, next) => {
  try {
    const result = await authService.login({
      ...req.body,
      ip: req.ip
    });

    res.json({
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
      data: {
        token: result.token,
        role: result.role,
        user: result.user
      }
    });

  } catch (err) {
    next(err);
  }
};

exports.registerMahasiswa = async (req, res, next) => {
  try {
    const result = await authService.registerMahasiswa(req.body);

    res.status(201).json({
      status: "success",
      message: result.message
    });

  } catch (err) {
    next(err);
  }
};

exports.registerDosen = async (req, res, next) => {
  try {
    const result = await authService.registerDosen(req.body, req.file);

    res.status(201).json({
      status: "success",
      message: result.message,
      data: {
        kode_kelas: result.kode_kelas
      }
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