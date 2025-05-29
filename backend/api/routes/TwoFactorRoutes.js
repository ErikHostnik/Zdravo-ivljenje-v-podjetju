const express = require('express');
const router = express.Router();
const TwoFactorController = require('../controllers/TwoFactorController');
const authJWT = require('../../middlewares/auth.js');

router.post('/', TwoFactorController.create);
router.post('/setup',authJWT, TwoFactorController.setup);

router.post('/:id/approve', TwoFactorController.approve);

router.post('/:id/reject', TwoFactorController.reject);

router.get('/:id/status', TwoFactorController.status);

module.exports = router;
