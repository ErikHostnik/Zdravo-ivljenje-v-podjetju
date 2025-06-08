const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/AnalyticsController.js');

router.get('/global-steps', AnalyticsController.globalSteps);

router.get('/active-users-per-day', AnalyticsController.activeUsersPerDay);

module.exports = router;
