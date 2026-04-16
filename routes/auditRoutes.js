const express = require('express');

const { listAudits } = require('../controllers/auditController');
const { authRequired } = require('../utils/auth');

const router = express.Router();

router.get('/audits', authRequired, listAudits);

module.exports = router;