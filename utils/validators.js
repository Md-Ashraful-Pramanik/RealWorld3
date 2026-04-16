const { validationError } = require('./errors');

const UPDATE_USER_ALLOWED_FIELDS = ['password', 'image', 'bio'];
const UPDATE_ARTICLE_ALLOWED_FIELDS = ['title', 'description', 'body'];

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

function requireArticlePayload(body) {
  if (!body || typeof body !== 'object' || !body.article || typeof body.article !== 'object') {
    throw validationError({ article: ['is required'] });
  }

  const article = body.article;
  const errors = {};

  ['title', 'description', 'body'].forEach((field) => {
    if (typeof article[field] !== 'string' || article[field].trim() === '') {
      errors[field] = ['is required'];
    }
  });

  if (
    Object.prototype.hasOwnProperty.call(article, 'tagList') &&
    (!Array.isArray(article.tagList) || article.tagList.some((tag) => typeof tag !== 'string'))
  ) {
    errors.tagList = ['must be an array of strings'];
  }

  if (Object.keys(errors).length > 0) {
    throw validationError(errors);
  }

  return {
    title: article.title.trim(),
    description: article.description.trim(),
    body: article.body.trim(),
    tagList: Array.isArray(article.tagList) ? article.tagList : []
  };
}

function getUpdateArticlePayload(body) {
  if (!body || typeof body !== 'object' || !body.article || typeof body.article !== 'object') {
    throw validationError({ article: ['is required'] });
  }

  const providedFields = Object.keys(body.article);
  const updates = {};
  const errors = {};

  if (providedFields.length === 0) {
    throw validationError({ article: ['at least one allowed field is required'] });
  }

  const disallowedFields = providedFields.filter(
    (field) => !UPDATE_ARTICLE_ALLOWED_FIELDS.includes(field)
  );

  disallowedFields.forEach((field) => {
    errors[field] = ['is not allowed'];
  });

  UPDATE_ARTICLE_ALLOWED_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body.article, field)) {
      if (typeof body.article[field] !== 'string' || body.article[field].trim() === '') {
        errors[field] = ['must be a non-empty string'];
      } else {
        updates[field] = body.article[field].trim();
      }
    }
  });

  if (Object.keys(errors).length > 0) {
    throw validationError(errors);
  }

  return updates;
}

function requireCommentPayload(body) {
  if (!body || typeof body !== 'object' || !body.comment || typeof body.comment !== 'object') {
    throw validationError({ comment: ['is required'] });
  }

  if (typeof body.comment.body !== 'string' || body.comment.body.trim() === '') {
    throw validationError({ body: ['is required'] });
  }

  return {
    body: body.comment.body.trim()
  };
}

module.exports = {
  getUpdateArticlePayload,
  getUpdateUserPayload,
  requireArticlePayload,
  requireCommentPayload,
  requireUserFields
};