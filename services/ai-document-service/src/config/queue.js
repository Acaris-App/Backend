const Queue = require('bull');

if (process.env.DISABLE_QUEUE === 'true') {
  const dummyQueue = {
    add: async (data) => {
      console.log('📭 [QUEUE DISABLED] Job tidak dikirim ke queue:', data);
    },
    process: () => {},
    on: () => {}
  };
  module.exports = dummyQueue;
} else {
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
}
