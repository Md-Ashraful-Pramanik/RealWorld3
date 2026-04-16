const bcrypt = require('bcryptjs');

const { findUserByEmail, findUserByUsername, createUser } = require('../models/userModel');
const { serializeUser } = require('../utils/auth');
const { unauthorized, validationError } = require('../utils/errors');
const { recordAudit } = require('./auditService');

async function registerUser(payload, req) {
  const existingEmail = await findUserByEmail(payload.email);
  if (existingEmail) {
    throw validationError({ email: ['has already been taken'] });
  }

  const existingUsername = await findUserByUsername(payload.username);
  if (existingUsername) {
    throw validationError({ username: ['has already been taken'] });
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);
  const user = await createUser({
    username: payload.username,
    email: payload.email,
    passwordHash
  });

  await recordAudit(user.id, 'user.register', req, {
    email: user.email,
    username: user.username
  });

  return {
    user: serializeUser(user)
  };
}

async function loginUser(payload, req) {
  const user = await findUserByEmail(payload.email);

  if (!user) {
    throw unauthorized('email or password is invalid');
  }

  const passwordMatches = await bcrypt.compare(payload.password, user.passwordHash);
  if (!passwordMatches) {
    throw unauthorized('email or password is invalid');
  }

  await recordAudit(user.id, 'user.login', req, {
    email: user.email
  });

  return {
    user: serializeUser(user)
  };
}

module.exports = {
  loginUser,
  registerUser
};