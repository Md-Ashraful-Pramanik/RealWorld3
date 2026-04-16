const asyncHandler = require('../utils/asyncHandler');
const { getUpdateUserPayload } = require('../utils/validators');
const { getCurrentUser, updateCurrentUser } = require('../services/userService');

const currentUser = asyncHandler(async (req, res) => {
  const response = await getCurrentUser(req.user, req);

  res.json(response);
});

const updateUser = asyncHandler(async (req, res) => {
  const payload = getUpdateUserPayload(req.body);
  const response = await updateCurrentUser(req.user, payload, req);

  res.json(response);
});

module.exports = {
  currentUser,
  updateUser
};