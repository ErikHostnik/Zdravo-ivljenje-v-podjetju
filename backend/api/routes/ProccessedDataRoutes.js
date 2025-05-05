var express = require('express');
var router = express.Router();
var ProccessedDataController = require('../controllers/ProccessedDataController.js');

/*
 * GET
 */
router.get('/', ProccessedDataController.list);

/*
 * GET
 */
router.get('/:id', ProccessedDataController.show);

/*
 * POST
 */
router.post('/', ProccessedDataController.create);

/*
 * PUT
 */
router.put('/:id', ProccessedDataController.update);

/*
 * DELETE
 */
router.delete('/:id', ProccessedDataController.remove);

module.exports = router;
