var express = require('express');
var router = express.Router();
var SensorDataController = require('../controllers/SensorDataController.js');
var authJWT = require('../middlewares/auth.js')

/*
 * GET
 */
router.get('/', SensorDataController.list);
router.get('/user/:userId',authJWT,SensorDataController.listByUser);

/*
 * GET
 */
router.get('/:id', SensorDataController.show);

/*
 * POST
 */
router.post('/', SensorDataController.create);

/*
 * PUT
 */
router.put('/:id', SensorDataController.update);

/*
 * DELETE
 */
router.delete('/:id', SensorDataController.remove);

module.exports = router;
