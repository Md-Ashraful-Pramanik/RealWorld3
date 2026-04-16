const {
  createArticle,
  createComment,
  favoriteArticle,
  findArticleBySlug,
  findArticleRecordBySlug,
  findCommentById,
  findCommentRecordById,
  generateUniqueSlug,
  listArticles,
  listComments,
  listFeedArticles,
  listTags,
  pool,
  setArticleTags,
  softDeleteArticle,
  softDeleteComment,
  unfavoriteArticle,
  updateArticle
} = require('../models/articleModel');
const { forbidden, notFound } = require('../utils/errors');
const { recordAudit } = require('./auditService');

function toArticleSummary(article) {
  const { body, ...summary } = article;
  return summary;
}

function getPagination(query) {
  const limit = Number.parseInt(query.limit, 10);
  const offset = Number.parseInt(query.offset, 10);

  return {
    limit: Number.isInteger(limit) && limit >= 0 ? limit : 20,
    offset: Number.isInteger(offset) && offset >= 0 ? offset : 0
  };
}

async function listGlobalArticles(currentUser, filters, req) {
  const response = await listArticles(
    {
      tag: filters.tag,
      author: filters.author,
      favorited: filters.favorited,
      ...getPagination(filters)
    },
    currentUser ? currentUser.id : null
  );

  if (currentUser) {
    await recordAudit(currentUser.id, 'article.list', req, {
      result: 'success',
      filters: {
        tag: filters.tag || null,
        author: filters.author || null,
        favorited: filters.favorited || null,
        limit: response.articles.length,
        offset: Number.parseInt(filters.offset, 10) || 0
      }
    });
  }

  return {
    articles: response.articles.map(toArticleSummary),
    articlesCount: response.articlesCount
  };
}

async function listPersonalFeed(currentUser, query, req) {
  const pagination = getPagination(query);
  const response = await listFeedArticles(currentUser.id, pagination.limit, pagination.offset);

  await recordAudit(currentUser.id, 'article.feed', req, {
    result: 'success',
    limit: pagination.limit,
    offset: pagination.offset
  });

  return {
    articles: response.articles.map(toArticleSummary),
    articlesCount: response.articlesCount
  };
}

async function getArticle(slug, currentUser, req) {
  const article = await findArticleBySlug(slug, currentUser ? currentUser.id : null);

  if (!article) {
    if (currentUser) {
      await recordAudit(currentUser.id, 'article.get', req, {
        result: 'not_found',
        slug
      });
    }

    throw notFound('article not found');
  }

  if (currentUser) {
    await recordAudit(currentUser.id, 'article.get', req, {
      result: 'success',
      slug
    });
  }

  return { article };
}

async function createNewArticle(currentUser, payload, req) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const slug = await generateUniqueSlug(payload.title, client);
    const created = await createArticle(client, {
      authorId: currentUser.id,
      slug,
      title: payload.title,
      description: payload.description,
      body: payload.body
    });

    await setArticleTags(client, created.id, payload.tagList || [], currentUser.id);
    await client.query('COMMIT');

    const article = await findArticleBySlug(slug, currentUser.id);

    await recordAudit(currentUser.id, 'article.create', req, {
      result: 'success',
      slug,
      tagCount: article.tagList.length
    });

    return { article };
  } catch (error) {
    await client.query('ROLLBACK');
    await recordAudit(currentUser.id, 'article.create', req, {
      result: 'failed',
      message: error.message
    });
    throw error;
  } finally {
    client.release();
  }
}

async function updateExistingArticle(currentUser, slug, payload, req) {
  const existing = await findArticleRecordBySlug(slug);

  if (!existing) {
    await recordAudit(currentUser.id, 'article.update', req, {
      result: 'not_found',
      slug
    });
    throw notFound('article not found');
  }

  if (existing.author_id !== currentUser.id) {
    await recordAudit(currentUser.id, 'article.update', req, {
      result: 'forbidden',
      slug
    });
    throw forbidden('you are not allowed to update this article');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const updates = {
      title: payload.title,
      description: payload.description,
      body: payload.body
    };

    if (payload.title) {
      updates.slug = await generateUniqueSlug(payload.title, client, existing.id);
    }

    await updateArticle(client, existing.id, updates);
    await client.query('COMMIT');

    const article = await findArticleBySlug(updates.slug || slug, currentUser.id);

    await recordAudit(currentUser.id, 'article.update', req, {
      result: 'success',
      slug,
      updatedSlug: article.slug,
      updatedFields: Object.keys(payload)
    });

    return { article };
  } catch (error) {
    await client.query('ROLLBACK');
    await recordAudit(currentUser.id, 'article.update', req, {
      result: 'failed',
      slug,
      message: error.message
    });
    throw error;
  } finally {
    client.release();
  }
}

async function deleteExistingArticle(currentUser, slug, req) {
  const existing = await findArticleRecordBySlug(slug);

  if (!existing) {
    await recordAudit(currentUser.id, 'article.delete', req, {
      result: 'not_found',
      slug
    });
    throw notFound('article not found');
  }

  if (existing.author_id !== currentUser.id) {
    await recordAudit(currentUser.id, 'article.delete', req, {
      result: 'forbidden',
      slug
    });
    throw forbidden('you are not allowed to delete this article');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await softDeleteArticle(client, existing.id, currentUser.id);
    await client.query('COMMIT');

    await recordAudit(currentUser.id, 'article.delete', req, {
      result: 'success',
      slug
    });
  } catch (error) {
    await client.query('ROLLBACK');
    await recordAudit(currentUser.id, 'article.delete', req, {
      result: 'failed',
      slug,
      message: error.message
    });
    throw error;
  } finally {
    client.release();
  }
}

async function addArticleComment(currentUser, slug, payload, req) {
  const articleRecord = await findArticleRecordBySlug(slug);

  if (!articleRecord) {
    await recordAudit(currentUser.id, 'comment.create', req, {
      result: 'not_found',
      slug
    });
    throw notFound('article not found');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const created = await createComment(client, {
      articleId: articleRecord.id,
      authorId: currentUser.id,
      body: payload.body
    });
    await client.query('COMMIT');

    const comment = await findCommentById(created.id, currentUser.id);

    await recordAudit(currentUser.id, 'comment.create', req, {
      result: 'success',
      slug,
      commentId: comment.id
    });

    return { comment };
  } catch (error) {
    await client.query('ROLLBACK');
    await recordAudit(currentUser.id, 'comment.create', req, {
      result: 'failed',
      slug,
      message: error.message
    });
    throw error;
  } finally {
    client.release();
  }
}

async function getArticleComments(slug, currentUser, req) {
  const articleRecord = await findArticleRecordBySlug(slug);

  if (!articleRecord) {
    if (currentUser) {
      await recordAudit(currentUser.id, 'comment.list', req, {
        result: 'not_found',
        slug
      });
    }

    throw notFound('article not found');
  }

  const comments = await listComments(articleRecord.id, currentUser ? currentUser.id : null);

  if (currentUser) {
    await recordAudit(currentUser.id, 'comment.list', req, {
      result: 'success',
      slug,
      count: comments.length
    });
  }

  return { comments };
}

async function deleteArticleComment(currentUser, slug, commentId, req) {
  const articleRecord = await findArticleRecordBySlug(slug);

  if (!articleRecord) {
    await recordAudit(currentUser.id, 'comment.delete', req, {
      result: 'not_found',
      slug,
      commentId
    });
    throw notFound('article not found');
  }

  const commentRecord = await findCommentRecordById(commentId);

  if (!commentRecord || String(commentRecord.article_id) !== String(articleRecord.id)) {
    await recordAudit(currentUser.id, 'comment.delete', req, {
      result: 'comment_not_found',
      slug,
      commentId
    });
    throw notFound('comment not found');
  }

  if (commentRecord.author_id !== currentUser.id) {
    await recordAudit(currentUser.id, 'comment.delete', req, {
      result: 'forbidden',
      slug,
      commentId
    });
    throw forbidden('you are not allowed to delete this comment');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await softDeleteComment(client, commentRecord.id, currentUser.id);
    await client.query('COMMIT');

    await recordAudit(currentUser.id, 'comment.delete', req, {
      result: 'success',
      slug,
      commentId
    });
  } catch (error) {
    await client.query('ROLLBACK');
    await recordAudit(currentUser.id, 'comment.delete', req, {
      result: 'failed',
      slug,
      commentId,
      message: error.message
    });
    throw error;
  } finally {
    client.release();
  }
}

async function favoriteExistingArticle(currentUser, slug, req) {
  const articleRecord = await findArticleRecordBySlug(slug);

  if (!articleRecord) {
    await recordAudit(currentUser.id, 'article.favorite', req, {
      result: 'not_found',
      slug
    });
    throw notFound('article not found');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await favoriteArticle(client, articleRecord.id, currentUser.id);
    await client.query('COMMIT');

    const article = await findArticleBySlug(slug, currentUser.id);
    await recordAudit(currentUser.id, 'article.favorite', req, {
      result: 'success',
      slug
    });

    return { article };
  } catch (error) {
    await client.query('ROLLBACK');
    await recordAudit(currentUser.id, 'article.favorite', req, {
      result: 'failed',
      slug,
      message: error.message
    });
    throw error;
  } finally {
    client.release();
  }
}

async function unfavoriteExistingArticle(currentUser, slug, req) {
  const articleRecord = await findArticleRecordBySlug(slug);

  if (!articleRecord) {
    await recordAudit(currentUser.id, 'article.unfavorite', req, {
      result: 'not_found',
      slug
    });
    throw notFound('article not found');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await unfavoriteArticle(client, articleRecord.id, currentUser.id);
    await client.query('COMMIT');

    const article = await findArticleBySlug(slug, currentUser.id);
    await recordAudit(currentUser.id, 'article.unfavorite', req, {
      result: 'success',
      slug
    });

    return { article };
  } catch (error) {
    await client.query('ROLLBACK');
    await recordAudit(currentUser.id, 'article.unfavorite', req, {
      result: 'failed',
      slug,
      message: error.message
    });
    throw error;
  } finally {
    client.release();
  }
}

async function getTagList(currentUser, req) {
  const tags = await listTags();

  if (currentUser) {
    await recordAudit(currentUser.id, 'tag.list', req, {
      result: 'success',
      count: tags.length
    });
  }

  return { tags };
}

module.exports = {
  addArticleComment,
  createNewArticle,
  deleteArticleComment,
  deleteExistingArticle,
  favoriteExistingArticle,
  getArticle,
  getArticleComments,
  getTagList,
  listGlobalArticles,
  listPersonalFeed,
  unfavoriteExistingArticle,
  updateExistingArticle
};