exports.success = (res, data, message = "success") => {
  return res.status(200).json({
    status: "success",
    message,
    data
  });
};