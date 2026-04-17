const { validationError } = require('./errors');

const UPDATE_USER_ALLOWED_FIELDS = ['password', 'image', 'bio'];
const UPDATE_ARTICLE_ALLOWED_FIELDS = ['title', 'description', 'body'];

function decodeMarkupTokens(value) {
  return value
    .replace(/&lt;|&#60;|&#x3c;/gi, '<')
    .replace(/&gt;|&#62;|&#x3e;/gi, '>')
    .replace(/&quot;|&#34;|&#x22;/gi, '"')
    .replace(/&#39;|&#x27;|&apos;/gi, "'");
}

function hasPotentialXss(value) {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = decodeMarkupTokens(value).trim();

  if (normalized === '') {
    return false;
  }

  return (
    /<\s*(?:\/\s*)?[a-z!][^>]*>/i.test(normalized) ||
    /javascript\s*:/i.test(normalized) ||
    /data\s*:\s*text\/html/i.test(normalized) ||
    /on[a-z]+\s*=/i.test(normalized)
  );
}

function addXssValidationError(errors, field, value) {
  if (hasPotentialXss(value)) {
    errors[field] = ['contains disallowed HTML or script content'];
  }
}

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
      return;
    }

    addXssValidationError(errors, field, article[field]);
  });

  if (
    Object.prototype.hasOwnProperty.call(article, 'tagList') &&
    (!Array.isArray(article.tagList) || article.tagList.some((tag) => typeof tag !== 'string'))
  ) {
    errors.tagList = ['must be an array of strings'];
  } else if (Array.isArray(article.tagList) && article.tagList.some((tag) => hasPotentialXss(tag))) {
    errors.tagList = ['contains disallowed HTML or script content'];
  }

  if (Object.keys(errors).length > 0) {
    throw validationError(errors);
  }

  return {
    title: article.title.trim(),
    description: article.description.trim(),
    body: article.body.trim(),
    tagList: Array.isArray(article.tagList) ? article.tagList.map((tag) => tag.trim()) : []
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
      } else if (hasPotentialXss(body.article[field])) {
        errors[field] = ['contains disallowed HTML or script content'];
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

  if (hasPotentialXss(body.comment.body)) {
    throw validationError({ body: ['contains disallowed HTML or script content'] });
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