exports.validateLogin = (email, password) => {
  if (!email || !password) {
    throw { status: 400, message: "Email dan password wajib diisi" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw { status: 400, message: "Format email tidak valid" };
  }
};