const db = require('../config/db');

exports.findByEmail = async (email) => {
  const result = await db.query(`
    SELECT id, name, email, password, role, npm_nip, profile_picture, is_verified
    FROM users
    WHERE email = $1
    LIMIT 1
  `, [email]);

  return result.rows[0];
};

exports.findById = async (id) => {
  const result = await db.query(`
    SELECT id, name, email, password, role, npm_nip, profile_picture, is_verified
    FROM users
    WHERE id = $1
    LIMIT 1
  `, [id]);

  return result.rows[0];
};

exports.findByNpm = async (npm_nip) => {
  const result = await db.query(
    'SELECT * FROM users WHERE npm_nip = $1',
    [npm_nip]
  );

  return result.rows[0];
};

exports.createUserTx = async (client, data) => {
  const result = await client.query(
    `INSERT INTO users (name, email, password, role, npm_nip, profile_picture)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [data.name, data.email, data.password, data.role, data.npm_nip, data.profile_picture || null]
  );

  return result.rows[0];
};

exports.verifyUser = async (userId) => {
  await db.query(
    'UPDATE users SET is_verified = TRUE WHERE id = $1',
    [userId]
  );
};

exports.updatePassword = async (userId, hashedPassword) => {
  await db.query(
    'UPDATE users SET password = $1 WHERE id = $2',
    [hashedPassword, userId]
  );
};

exports.updateProfileText = async (userId, data) => {
  const result = await db.query(
    `UPDATE users
     SET name = $1
     WHERE id = $2
     RETURNING id, name, email, npm_nip, profile_picture, role`,
    [data.name, userId]
  );

  return result.rows[0];
};

exports.updateProfilePhoto = async (userId, profilePictureUrl) => {
  const result = await db.query(
    `UPDATE users
     SET profile_picture = $1
     WHERE id = $2
     RETURNING id, name, email, npm_nip, profile_picture, role`,
    [profilePictureUrl, userId]
  );

  return result.rows[0];
};

exports.updateProfile = async (userId, data) => {
  const result = await db.query(
    `UPDATE users
     SET name = $1, profile_picture = $2
     WHERE id = $3
     RETURNING id, name, email, npm_nip, profile_picture, role`,
    [data.name, data.profile_picture, userId]
  );

  return result.rows[0];
};
