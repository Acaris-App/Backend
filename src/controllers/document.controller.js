const documentService = require('../services/document.service');

exports.upload = async (req, res, next) => {
  try {

    const result = await documentService.uploadDocument({
      user: req.user,
      body: req.body,
      file: req.file
    });

    res.json({
      status: "success",
      data: result
    });

  } catch (err) {
    next(err);
  }
};

exports.checkCompleteness = async (req, res, next) => {
  try {

    const result = await documentService.checkCompleteness(req.user);

    res.json({
      status: "success",
      data: result
    });

  } catch (err) {
    next(err);
  }
};