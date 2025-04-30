var express = require('express');
var router = express.Router();
var WeatherDataController = require('../controllers/WeatherDataController.js');

/*
 * GET
 */
router.get('/', WeatherDataController.list);

/*
 * GET
 */
router.get('/:id', WeatherDataController.show);

/*
 * POST
 */
router.post('/', WeatherDataController.create);

/*
 * PUT
 */
router.put('/:id', WeatherDataController.update);

/*
 * DELETE
 */
router.delete('/:id', WeatherDataController.remove);

module.exports = router;
