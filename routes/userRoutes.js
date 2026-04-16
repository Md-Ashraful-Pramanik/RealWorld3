const express = require('express');

const { currentUser, updateUser } = require('../controllers/userController');
const { authRequired } = require('../utils/auth');

const router = express.Router();

router.get('/user', authRequired, currentUser);
router.put('/user', authRequired, updateUser);

module.exports = router;