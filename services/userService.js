const bcrypt = require('bcryptjs');

const { findUserByEmail, updateUserById } = require('../models/userModel');
const { serializeUser } = require('../utils/auth');
const { validationError } = require('../utils/errors');
const { recordAudit } = require('./auditService');

async function recordUpdateFailureAudit(currentUser, req, details) {
  await recordAudit(currentUser.id, 'user.update', req, {
    result: 'failed',
    ...details
  });
}

async function getCurrentUser(currentUser, req) {
  await recordAudit(currentUser.id, 'user.current', req);

  return {
    user: serializeUser(currentUser)
  };
}

async function updateCurrentUser(currentUser, payload, req) {
  try {
    if (payload.email && payload.email !== currentUser.email) {
      const existingEmail = await findUserByEmail(payload.email);
      if (existingEmail && existingEmail.id !== currentUser.id) {
        const error = validationError({ email: ['has already been taken'] });

        await recordUpdateFailureAudit(currentUser, req, {
          reason: 'email_taken',
          updatedFields: Object.keys(payload),
          errors: error.details
        });

        throw error;
      }
    }

    const updates = { ...payload };
    if (updates.password) {
      updates.passwordHash = await bcrypt.hash(updates.password, 10);
      delete updates.password;
    }

    const user = await updateUserById(currentUser.id, updates);

    await recordAudit(user.id, 'user.update', req, {
      result: 'success',
      updatedFields: Object.keys(payload)
    });

    return {
      user: serializeUser(user)
    };
  } catch (error) {
    if (!error.statusCode) {
      await recordUpdateFailureAudit(currentUser, req, {
        reason: 'unexpected_error',
        updatedFields: Object.keys(payload),
        message: error.message
      });
    }

    throw error;
  }
}

module.exports = {
  getCurrentUser,
  updateCurrentUser
};