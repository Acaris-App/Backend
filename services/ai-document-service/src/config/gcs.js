const { Storage } = require('@google-cloud/storage');

const storage = new Storage();

const bucketName = process.env.GCS_BUCKET;

if (!bucketName) {
  throw new Error('GCS_BUCKET belum diset');
}

const bucket = storage.bucket(bucketName);

module.exports = { bucket };
