const { validationError } = require('./errors');

const UPDATE_USER_ALLOWED_FIELDS = ['password', 'image', 'bio'];

function requireUserFields(body, fields) {
  if (!body || typeof body !== 'object' || !body.user || typeof body.user !== 'object') {
    throw validationError({ user: ['is required'] });
  }

  const errors = {};

  fields.forEach((field) => {
    const value = body.user[field];
    if (typeof value !== 'string' || value.trim() === '') {
      errors[field] = ['is required'];
    }
  });

  if (Object.keys(errors).length > 0) {
    throw validationError(errors);
  }

  return body.user;
}

function getUpdateUserPayload(body) {
  if (!body || typeof body !== 'object' || !body.user || typeof body.user !== 'object') {
    throw validationError({ user: ['is required'] });
  }

  const updates = {};
  const errors = {};
  const providedFields = Object.keys(body.user);
  const disallowedFields = providedFields.filter((field) => !UPDATE_USER_ALLOWED_FIELDS.includes(field));

  if (disallowedFields.length > 0) {
    disallowedFields.forEach((field) => {
      errors[field] = ['is not allowed'];
    });
  }

  UPDATE_USER_ALLOWED_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body.user, field)) {
      updates[field] = body.user[field];
    }
  });

  ['password'].forEach((field) => {
    if (
      Object.prototype.hasOwnProperty.call(updates, field) &&
      (typeof updates[field] !== 'string' || updates[field].trim() === '')
    ) {
      errors[field] = ['must be a non-empty string'];
    }
  });

  ['image', 'bio'].forEach((field) => {
    if (
      Object.prototype.hasOwnProperty.call(updates, field) &&
      updates[field] !== null &&
      typeof updates[field] !== 'string'
    ) {
      errors[field] = ['must be a string or null'];
    }
  });

  if (providedFields.length === 0) {
    errors.user = ['at least one allowed field is required'];
  }

  if (Object.keys(errors).length > 0) {
    throw validationError(errors);
  }

  return updates;
}

module.exports = {
  getUpdateUserPayload,
  requireUserFields
};