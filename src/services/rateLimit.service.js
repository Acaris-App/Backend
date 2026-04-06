// ✅ FIX: Pakai Redis bukan in-memory
// In-memory tidak aman di Cloud Run karena bisa jalan multi-instance —
// setiap instance punya memory sendiri → rate limit tidak konsisten antar instance
const redis = require('../config/redis');

exports.checkLoginLimit = async (ip) => {

  const userIP = ip || 'unknown';
  const key = `login_attempts:${userIP}`;
  const windowSec = 60;
  const maxAttempts = 5;

  const now = Date.now();
  const windowStart = now - windowSec * 1000;

  // Hapus attempt yang sudah di luar window
  await redis.zremrangebyscore(key, '-inf', windowStart);

  // Hitung attempt yang masih dalam window
  const attempts = await redis.zcard(key);

  if (attempts >= maxAttempts) {
    throw {
      status: 429,
      message: "Terlalu banyak percobaan login, coba lagi nanti"
    };
  }

  // Simpan attempt baru (score = timestamp, member = timestamp unik)
  await redis.zadd(key, now, `${now}-${Math.random()}`);
  await redis.expire(key, windowSec);
};