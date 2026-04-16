const asyncHandler = require('../utils/asyncHandler');
const {
  getUpdateArticlePayload,
  requireArticlePayload,
  requireCommentPayload
} = require('../utils/validators');
const { recordAudit } = require('../services/auditService');
const {
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
} = require('../services/articleService');

const listArticles = asyncHandler(async (req, res) => {
  const response = await listGlobalArticles(req.user, req.query, req);
  res.json(response);
});

const feedArticles = asyncHandler(async (req, res) => {
  const response = await listPersonalFeed(req.user, req.query, req);
  res.json(response);
});

const getSingleArticle = asyncHandler(async (req, res) => {
  const response = await getArticle(req.params.slug, req.user, req);
  res.json(response);
});

const createSingleArticle = asyncHandler(async (req, res) => {
  let payload;

  try {
    payload = requireArticlePayload(req.body);
  } catch (error) {
    await recordAudit(req.user.id, 'article.create', req, {
      result: 'failed',
      reason: 'validation_error',
      errors: error.details || null
    });
    throw error;
  }

  const response = await createNewArticle(req.user, payload, req);
  res.status(201).json(response);
});

const updateSingleArticle = asyncHandler(async (req, res) => {
  let payload;

  try {
    payload = getUpdateArticlePayload(req.body);
  } catch (error) {
    await recordAudit(req.user.id, 'article.update', req, {
      result: 'failed',
      reason: 'validation_error',
      slug: req.params.slug,
      errors: error.details || null
    });
    throw error;
  }

  const response = await updateExistingArticle(req.user, req.params.slug, payload, req);
  res.json(response);
});

const deleteSingleArticle = asyncHandler(async (req, res) => {
  await deleteExistingArticle(req.user, req.params.slug, req);
  res.status(204).send();
});

const createCommentForArticle = asyncHandler(async (req, res) => {
  let payload;

  try {
    payload = requireCommentPayload(req.body);
  } catch (error) {
    await recordAudit(req.user.id, 'comment.create', req, {
      result: 'failed',
      reason: 'validation_error',
      slug: req.params.slug,
      errors: error.details || null
    });
    throw error;
  }

  const response = await addArticleComment(req.user, req.params.slug, payload, req);
  res.status(201).json(response);
});

const listCommentsForArticle = asyncHandler(async (req, res) => {
  const response = await getArticleComments(req.params.slug, req.user, req);
  res.json(response);
});

const deleteSingleComment = asyncHandler(async (req, res) => {
  await deleteArticleComment(req.user, req.params.slug, req.params.id, req);
  res.status(204).send();
});

const favoriteSingleArticle = asyncHandler(async (req, res) => {
  const response = await favoriteExistingArticle(req.user, req.params.slug, req);
  res.json(response);
});

const unfavoriteSingleArticle = asyncHandler(async (req, res) => {
  const response = await unfavoriteExistingArticle(req.user, req.params.slug, req);
  res.json(response);
});

const listAllTags = asyncHandler(async (req, res) => {
  const response = await getTagList(req.user, req);
  res.json(response);
});

module.exports = {
  createCommentForArticle,
  createSingleArticle,
  deleteSingleComment,
  deleteSingleArticle,
  favoriteSingleArticle,
  feedArticles,
  getSingleArticle,
  listAllTags,
  listArticles,
  listCommentsForArticle,
  unfavoriteSingleArticle,
  updateSingleArticle
};