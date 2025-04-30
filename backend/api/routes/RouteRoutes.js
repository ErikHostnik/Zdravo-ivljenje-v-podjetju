var express = require('express');
var router = express.Router();
var RouteController = require('../controllers/RouteController.js');

/*
 * GET
 */
router.get('/', RouteController.list);

/*
 * GET
 */
router.get('/:id', RouteController.show);

/*
 * POST
 */
router.post('/', RouteController.create);

/*
 * PUT
 */
router.put('/:id', RouteController.update);

/*
 * DELETE
 */
router.delete('/:id', RouteController.remove);

module.exports = router;
