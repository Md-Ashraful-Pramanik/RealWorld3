const asyncHandler = require('../utils/asyncHandler');
const { listAuditsForUser } = require('../services/auditService');

const listAudits = asyncHandler(async (req, res) => {
  const response = await listAuditsForUser(req.user, req);

  res.json(response);
});

module.exports = {
  listAudits
};