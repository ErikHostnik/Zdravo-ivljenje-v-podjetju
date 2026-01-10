const express = require('express');
const router = express.Router();
const SensorDataController = require('../controllers/SensorDataController');
const authJWT = require('../middlewares/auth');

router.get('/', SensorDataController.list);
router.get('/user/:userId', authJWT, SensorDataController.listByUser);
router.get('/:id', authJWT, SensorDataController.getById);
router.post('/', authJWT, SensorDataController.create);
router.put('/:id', authJWT, SensorDataController.update);
router.delete('/:id', authJWT, SensorDataController.remove);

module.exports = router;
