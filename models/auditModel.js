const { query } = require('../config/db');

function mapAudit(row) {
  return {
    id: row.id,
    action: row.action,
    method: row.method,
    path: row.path,
    details: row.details,
    createdAt: row.created_at
  };
}

async function createAudit({ userId, action, method, path, details = {} }) {
  const result = await query(
    `
      INSERT INTO audits (user_id, action, method, path, details)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [userId, action, method, path, JSON.stringify(details)]
  );

  return mapAudit(result.rows[0]);
}

async function getAuditsByUserId(userId) {
  const result = await query(
    `
      SELECT id, action, method, path, details, created_at
      FROM audits
      WHERE user_id = $1
      ORDER BY created_at DESC, id DESC
    `,
    [userId]
  );

  return result.rows.map(mapAudit);
}

module.exports = {
  createAudit,
  getAuditsByUserId
};