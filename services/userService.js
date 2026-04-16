const bcrypt = require('bcryptjs');

const { findUserByEmail, updateUserById } = require('../models/userModel');
const { serializeUser } = require('../utils/auth');
const { validationError } = require('../utils/errors');
const { recordAudit } = require('./auditService');

async function getCurrentUser(currentUser, req) {
  await recordAudit(currentUser.id, 'user.current', req);

  return {
    user: serializeUser(currentUser)
  };
}

async function updateCurrentUser(currentUser, payload, req) {
  if (payload.email && payload.email !== currentUser.email) {
    const existingEmail = await findUserByEmail(payload.email);
    if (existingEmail && existingEmail.id !== currentUser.id) {
      throw validationError({ email: ['has already been taken'] });
    }
  }

  const updates = { ...payload };
  if (updates.password) {
    updates.passwordHash = await bcrypt.hash(updates.password, 10);
    delete updates.password;
  }

  const user = await updateUserById(currentUser.id, updates);

  await recordAudit(user.id, 'user.update', req, {
    updatedFields: Object.keys(payload)
  });

  return {
    user: serializeUser(user)
  };
}

module.exports = {
  getCurrentUser,
  updateCurrentUser
};