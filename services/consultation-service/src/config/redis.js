const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL, {
  tls: {},
  maxRetriesPerRequest: null,
  connectTimeout: 10000,
  retryStrategy(times) {
    return Math.min(times * 50, 2000);
  }
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err.message);
});

module.exports = redis;
