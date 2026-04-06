const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL, {
  tls: {},

  // 🔥 WAJIB → biar tidak error max retries
  maxRetriesPerRequest: null,

  // 🔥 timeout koneksi
  connectTimeout: 10000,

  // 🔥 retry strategy (lebih smooth)
  retryStrategy(times) {
    return Math.min(times * 50, 2000);
  }
});

// ✅ log koneksi
redis.on('connect', () => {
  console.log('✅ Redis connected');
});

// ❌ log error
redis.on('error', (err) => {
  console.error('❌ Redis error:', err.message);
});

module.exports = redis;