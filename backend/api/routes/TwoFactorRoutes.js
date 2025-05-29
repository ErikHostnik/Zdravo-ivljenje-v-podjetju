const express = require('express');
const router = express.Router();
const TwoFactorController = require('../controllers/TwoFactorController');

router.post('/', TwoFactorController.create);
router.post('/2fa/setup', TwoFactorController.setup);

router.post('/:id/approve', TwoFactorController.approve);

router.post('/:id/reject', TwoFactorController.reject);

router.get('/:id/status', TwoFactorController.status);

module.exports = router;
