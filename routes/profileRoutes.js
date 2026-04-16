const express = require('express');

const { follow, profile, unfollow } = require('../controllers/profileController');
const { authOptional, authRequired } = require('../utils/auth');

const router = express.Router();

router.get('/profiles/:username', authOptional, profile);
router.post('/profiles/:username/follow', authRequired, follow);
router.delete('/profiles/:username/follow', authRequired, unfollow);

module.exports = router;