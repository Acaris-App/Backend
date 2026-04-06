const redis = require('../config/redis');

exports.checkLoginLimit = async (ip) => {

  const key = `login:${ip}`;

  const attempts = await redis.incr(key);

  if (attempts === 1) {
    await redis.expire(key, 60); // 1 menit
  }

  if (attempts > 5) {
    throw {
      status: 429,
      message: "Terlalu banyak percobaan login, coba lagi nanti"
    };
  }
};