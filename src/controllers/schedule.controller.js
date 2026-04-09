const scheduleService = require('../services/schedule.service');

// ================= GET JADWAL DOSEN (kalender kelola) =================
exports.getMySchedules = async (req, res, next) => {
  try {
    const result = await scheduleService.getMySchedules({
      user: req.user,
      query: req.query
    });

    res.json({ status: "success", data: result });
  } catch (err) { next(err); }
};

// ================= GET JADWAL TERSEDIA (kalender booking mahasiswa) =================
exports.getAvailableSchedules = async (req, res, next) => {
  try {
    const result = await scheduleService.getAvailableSchedules({
      user: req.user,
      query: req.query
    });

    res.json({ status: "success", data: result });
  } catch (err) { next(err); }
};

// ================= GET DETAIL JADWAL =================
exports.getScheduleDetail = async (req, res, next) => {
  try {
    const result = await scheduleService.getScheduleDetail({
      user: req.user,
      scheduleId: req.params.schedule_id
    });

    res.json({ status: "success", data: result });
  } catch (err) { next(err); }
};

// ================= TAMBAH JADWAL =================
exports.createSchedule = async (req, res, next) => {
  try {
    const result = await scheduleService.createSchedule({
      user: req.user,
      body: req.body
    });

    res.status(201).json({
      status: "success",
      message: "Jadwal berhasil ditambahkan",
      data: result
    });
  } catch (err) { next(err); }
};

// ================= EDIT JADWAL =================
exports.updateSchedule = async (req, res, next) => {
  try {
    const result = await scheduleService.updateSchedule({
      user: req.user,
      scheduleId: req.params.schedule_id,
      body: req.body
    });

    res.json({
      status: "success",
      message: "Jadwal berhasil diperbarui",
      data: result
    });
  } catch (err) { next(err); }
};

// ================= HAPUS JADWAL =================
exports.deleteSchedule = async (req, res, next) => {
  try {
    const result = await scheduleService.deleteSchedule({
      user: req.user,
      scheduleId: req.params.schedule_id
    });

    res.json({ status: "success", message: result.message });
  } catch (err) { next(err); }
};

// ================= BOOKING JADWAL =================
exports.bookSchedule = async (req, res, next) => {
  try {
    const result = await scheduleService.bookSchedule({
      user: req.user,
      body: req.body
    });

    res.status(201).json({
      status: "success",
      message: "Booking berhasil",
      data: result
    });
  } catch (err) { next(err); }
};

// ================= GET DAFTAR BOOKING (Dosen) =================
exports.getBookings = async (req, res, next) => {
  try {
    const result = await scheduleService.getBookings({
      user: req.user,
      query: req.query
    });

    res.json({ status: "success", data: result });
  } catch (err) { next(err); }
};
