const bcrypt = require('bcryptjs');

const { updateUserById } = require('../models/userModel');
const { serializeUser } = require('../utils/auth');
const { validationError } = require('../utils/errors');
const { recordAudit } = require('./auditService');

const UPDATE_USER_ALLOWED_FIELDS = new Set(['password', 'image', 'bio']);

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
    const invalidFields = Object.keys(payload).filter((field) => !UPDATE_USER_ALLOWED_FIELDS.has(field));

    if (invalidFields.length > 0) {
      const error = validationError(
        invalidFields.reduce((accumulator, field) => {
          accumulator[field] = ['is not allowed'];
          return accumulator;
        }, {})
      );

      await recordUpdateFailureAudit(currentUser, req, {
        reason: 'validation_error',
        updatedFields: Object.keys(payload),
        errors: error.details
      });

      throw error;
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