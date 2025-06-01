const express = require('express');
const router = express.Router();
const TwoFactorController = require('../controllers/TwoFactorController');
const multer = require('multer');
const verifyUpload = multer({ dest: 'uploads/verify_temp/' });

const authJWT = require('../middlewares/auth.js');

router.post('/', TwoFactorController.create);

router.post('/setup/:userId', authJWT, TwoFactorController.uploadImages);
router.post('/recognize/:userId', authJWT, TwoFactorController.recognize);
router.post('/verify/:userId', verifyUpload.single('image'), TwoFactorController.verifyFace);

router.post('/:id/approve', TwoFactorController.approve);

router.post('/:id/reject', TwoFactorController.reject);

router.get('/:id/status', TwoFactorController.status);

module.exports = router;
