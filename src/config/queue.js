const Queue = require('bull');

// ✅ FIX: Pakai REDIS_URL dari env (Upstash), bukan hardcode localhost
// Bull dengan Upstash (TLS) butuh createClient custom pakai ioredis
const emailQueue = new Queue('email-queue', {
  createClient: () => {
    const Redis = require('ioredis');
    return new Redis(process.env.REDIS_URL, {
      tls: {},
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: 10000,
      retryStrategy(times) {
        return Math.min(times * 50, 2000);
      }
    });
  }
});

module.exports = emailQueue;