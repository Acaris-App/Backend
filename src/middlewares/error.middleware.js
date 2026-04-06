const multer = require('multer');

exports.errorHandler = (err, req, res, next) => {

  console.error(err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: "error",
        message: "Ukuran file maksimal 2MB"
      });
    }
  }

  if (err.message === 'Hanya file PDF yang diperbolehkan') {
    return res.status(400).json({
      status: "error",
      message: err.message
    });
  }

  return res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Internal Server Error"
  });
};