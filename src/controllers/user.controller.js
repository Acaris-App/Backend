const profileRepository = require('../repositories/profile.repository');

exports.getMe = async (req, res, next) => {
  try {

    const user = req.user;

    let profile = null;

    if (user.role === 'mahasiswa') {
      profile = await profileRepository.getMahasiswaProfile(user.id);
    }

    if (user.role === 'dosen') {
      profile = await profileRepository.getDosenProfile(user.id);
    }

    res.json({
      status: "success",
      data: {
        user,
        profile
      }
    });

  } catch (err) {
    next(err);
  }
};