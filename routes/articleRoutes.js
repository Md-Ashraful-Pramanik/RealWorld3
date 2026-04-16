const express = require('express');

const {
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
} = require('../controllers/articleController');
const { authOptional, authRequired } = require('../utils/auth');

const router = express.Router();

router.get('/articles', authOptional, listArticles);
router.get('/articles/feed', authRequired, feedArticles);
router.get('/articles/:slug', authOptional, getSingleArticle);
router.post('/articles', authRequired, createSingleArticle);
router.put('/articles/:slug', authRequired, updateSingleArticle);
router.delete('/articles/:slug', authRequired, deleteSingleArticle);

router.post('/articles/:slug/comments', authRequired, createCommentForArticle);
router.get('/articles/:slug/comments', authOptional, listCommentsForArticle);
router.delete('/articles/:slug/comments/:id', authRequired, deleteSingleComment);

router.post('/articles/:slug/favorite', authRequired, favoriteSingleArticle);
router.delete('/articles/:slug/favorite', authRequired, unfavoriteSingleArticle);

router.get('/tags', authOptional, listAllTags);

module.exports = router;