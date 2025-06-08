const express = require('express');
const router = express.Router();
const MetricsController = require('../controllers/MetricsController');

router.get('/active-devices', MetricsController.activeDevices);

module.exports = router;
