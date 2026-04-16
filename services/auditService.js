const { createAudit, getAuditsByUserId } = require('../models/auditModel');

async function recordAudit(userId, action, req, details = {}) {
  if (!userId) {
    return null;
  }

  return createAudit({
    userId,
    action,
    method: req.method,
    path: req.originalUrl,
    details
  });
}

async function listAuditsForUser(user, req) {
  const audits = await getAuditsByUserId(user.id);

  await recordAudit(user.id, 'audit.list', req);

  return {
    audits
  };
}

module.exports = {
  listAuditsForUser,
  recordAudit
};