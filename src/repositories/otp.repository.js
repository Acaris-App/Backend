const db = require('../config/db');
const bcrypt = require('bcrypt');

exports.createOTP = async (userId, code, type, expiresAt) => {

  const hashedCode = await bcrypt.hash(code, 10);

  // 🔥 invalidate OTP lama
  await db.query(
    `UPDATE otp_codes 
     SET is_used = true 
     WHERE user_id = $1 AND type = $2`,
    [userId, type]
  );

  const result = await db.query(
    `INSERT INTO otp_codes (user_id, code, type, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, hashedCode, type, expiresAt]
  );

  return result.rows[0];
};

exports.createOTPTx = async (client, userId, code, type, expiresAt) => {

  const hashedCode = await bcrypt.hash(code, 10);

  await client.query(
    `UPDATE otp_codes 
     SET is_used = true 
     WHERE user_id = $1 AND type = $2`,
    [userId, type]
  );

  await client.query(
    `INSERT INTO otp_codes (user_id, code, type, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, hashedCode, type, expiresAt]
  );
};

exports.findOTPByUser = async (userId, type) => {
  const result = await db.query(
    `SELECT * FROM otp_codes
     WHERE user_id = $1
     AND type = $2
     AND is_used = false
     AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, type]
  );

  return result.rows[0];
};

exports.markAsUsed = async (id) => {
  await db.query(
    'UPDATE otp_codes SET is_used = TRUE WHERE id = $1',
    [id]
  );
};

// ✅ FIX: Fungsi ini dipanggil di resendOTP tapi tidak ada di repository
exports.invalidateOTP = async (userId, type) => {
  await db.query(
    `UPDATE otp_codes SET is_used = true WHERE user_id = $1 AND type = $2`,
    [userId, type]
  );
};