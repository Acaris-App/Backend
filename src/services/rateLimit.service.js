// 🔥 In-memory limiter
const loginAttempts = {};

exports.checkLoginLimit = async (ip) => {

  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxAttempts = 5;

  const userIP = ip || 'unknown';

  if (!loginAttempts[userIP]) {
    loginAttempts[userIP] = [];
  }

  // hapus data lama
  loginAttempts[userIP] = loginAttempts[userIP].filter(
    (timestamp) => now - timestamp < windowMs
  );

  // cek limit
  if (loginAttempts[userIP].length >= maxAttempts) {
    throw {
      status: 429,
      message: "Terlalu banyak percobaan login, coba lagi nanti"
    };
  }

  // simpan attempt
  loginAttempts[userIP].push(now);
};


// 🔥 AUTO CLEAN (WAJIB)
setInterval(() => {
  const now = Date.now();

  Object.keys(loginAttempts).forEach(ip => {
    loginAttempts[ip] = loginAttempts[ip].filter(
      t => now - t < 60 * 1000
    );

    if (loginAttempts[ip].length === 0) {
      delete loginAttempts[ip];
    }
  });

}, 60 * 1000);