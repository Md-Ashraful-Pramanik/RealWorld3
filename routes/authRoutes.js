const express = require('express');

const { login, register } = require('../controllers/authController');

const router = express.Router();

router.post('/users/login', login);
router.post('/users', register);

module.exports = router;