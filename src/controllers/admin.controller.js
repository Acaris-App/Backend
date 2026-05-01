const adminService = require('../services/admin.service');

// ================================================================
// PBI-12: KNOWLEDGE BASE
// ================================================================

exports.getAllKnowledgeBase = async (req, res, next) => {
  try {
    const result = await adminService.getAllKnowledgeBase({ user: req.user, query: req.query });
    res.json({ status: "success", message: "Data knowledge base berhasil diambil", data: result });
  } catch (err) { next(err); }
};

exports.createKnowledgeBase = async (req, res, next) => {
  try {
    const result = await adminService.createKnowledgeBase({ user: req.user, body: req.body, file: req.file });
    res.status(201).json({ status: "success", message: "Knowledge base berhasil ditambahkan", data: result });
  } catch (err) { next(err); }
};

exports.updateKnowledgeBase = async (req, res, next) => {
  try {
    const result = await adminService.updateKnowledgeBase({ user: req.user, id: req.params.id, body: req.body, file: req.file });
    res.json({ status: "success", message: "Knowledge base berhasil diperbarui", data: result });
  } catch (err) { next(err); }
};

exports.deleteKnowledgeBase = async (req, res, next) => {
  try {
    const result = await adminService.deleteKnowledgeBase({ user: req.user, id: req.params.id });
    res.json({ status: "success", message: result.message, data: null });
  } catch (err) { next(err); }
};


// ================================================================
// PBI-24: KELOLA AKUN PENGGUNA
// ================================================================

exports.getAllUsers = async (req, res, next) => {
  try {
    const result = await adminService.getAllUsers({ user: req.user, query: req.query });
    res.json({ status: "success", message: "Data pengguna berhasil diambil", data: result });
  } catch (err) { next(err); }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const result = await adminService.updateUserStatus({ user: req.user, userId: req.params.userId, body: req.body });
    res.json({ status: "success", message: "Status akun berhasil diperbarui", data: result });
  } catch (err) { next(err); }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const result = await adminService.deleteUser({ user: req.user, userId: req.params.userId });
    res.json({ status: "success", message: result.message, data: null });
  } catch (err) { next(err); }
};


// ================================================================
// PBI-25: MONITORING DOKUMEN MAHASISWA
// ================================================================

exports.getAllDocuments = async (req, res, next) => {
  try {
    const result = await adminService.getAllDocuments({ user: req.user, query: req.query });
    res.json({ status: "success", message: "Data dokumen berhasil diambil", data: result });
  } catch (err) { next(err); }
};

exports.getDocumentStats = async (req, res, next) => {
  try {
    const result = await adminService.getDocumentStats({ user: req.user });
    res.json({ status: "success", message: "Statistik dokumen berhasil diambil", data: result });
  } catch (err) { next(err); }
};
