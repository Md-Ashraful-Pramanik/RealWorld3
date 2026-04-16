const asyncHandler = require('../utils/asyncHandler');
const { requireUserFields } = require('../utils/validators');
const { loginUser, registerUser } = require('../services/authService');

const login = asyncHandler(async (req, res) => {
  const payload = requireUserFields(req.body, ['email', 'password']);
  const response = await loginUser(payload, req);

  res.json(response);
});

const register = asyncHandler(async (req, res) => {
  const payload = requireUserFields(req.body, ['username', 'email', 'password']);
  const response = await registerUser(payload, req);

  res.status(201).json(response);
});

module.exports = {
  login,
  register
};