const { query } = require('../config/db');

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    bio: row.bio,
    image: row.image,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function findUserById(id) {
  const result = await query('SELECT * FROM users WHERE id = $1', [id]);
  return mapUser(result.rows[0]);
}

async function findUserByEmail(email) {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return mapUser(result.rows[0]);
}

async function findUserByUsername(username) {
  const result = await query('SELECT * FROM users WHERE username = $1', [username]);
  return mapUser(result.rows[0]);
}

async function createUser({ username, email, passwordHash, bio = null, image = null }) {
  const result = await query(
    `
      INSERT INTO users (username, email, password_hash, bio, image)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [username, email, passwordHash, bio, image]
  );

  return mapUser(result.rows[0]);
}

async function updateUserById(id, fields) {
  const fieldMap = {
    email: 'email',
    username: 'username',
    passwordHash: 'password_hash',
    image: 'image',
    bio: 'bio'
  };

  const entries = Object.entries(fields).filter(([key, value]) => {
    return fieldMap[key] && value !== undefined;
  });

  if (entries.length === 0) {
    return findUserById(id);
  }

  const values = [];
  const assignments = entries.map(([key, value], index) => {
    values.push(value);
    return `${fieldMap[key]} = $${index + 1}`;
  });

  assignments.push('updated_at = NOW()');
  values.push(id);

  const result = await query(
    `
      UPDATE users
      SET ${assignments.join(', ')}
      WHERE id = $${values.length}
      RETURNING *
    `,
    values
  );

  return mapUser(result.rows[0]);
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByUsername,
  updateUserById
};