const db = require('../config/db');

exports.findByEmail = async (email) => {
  const result = await db.query(`
    SELECT id, name, email, password, role, npm_nip, profile_picture
    FROM users
    WHERE email = $1
    LIMIT 1
  `, [email]);

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
    `INSERT INTO users (name, email, password, role, npm_nip)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.name, data.email, data.password, data.role, data.npm_nip]
  );

  return result.rows[0];
};

exports.verifyUser = async (userId) => {
  await db.query(
    'UPDATE users SET is_verified = TRUE WHERE id = $1',
    [userId]
  );
};