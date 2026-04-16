const asyncHandler = require('../utils/asyncHandler');
const { getUpdateUserPayload } = require('../utils/validators');
const { recordAudit } = require('../services/auditService');
const { getCurrentUser, updateCurrentUser } = require('../services/userService');

const currentUser = asyncHandler(async (req, res) => {
  const response = await getCurrentUser(req.user, req);

  res.json(response);
});

const updateUser = asyncHandler(async (req, res) => {
  let payload;

  try {
    payload = getUpdateUserPayload(req.body);
  } catch (error) {
    await recordAudit(req.user.id, 'user.update', req, {
      result: 'failed',
      reason: 'validation_error',
      errors: error.details || null
    });

    throw error;
  }

  const response = await updateCurrentUser(req.user, payload, req);

  res.json(response);
});

module.exports = {
  currentUser,
  updateUser
};