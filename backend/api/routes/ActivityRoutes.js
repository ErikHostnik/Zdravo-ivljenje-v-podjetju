var express = require('express');
var router = express.Router();
var ActivityController = require('../controllers/ActivityController.js');

/*
 * GET
 */
router.get('/', ActivityController.list);

/*
 * GET
 */
router.get('/:id', ActivityController.show);

/*
 * POST
 */
router.post('/', ActivityController.create);

/*
 * PUT
 */
router.put('/:id', ActivityController.update);

/*
 * DELETE
 */
router.delete('/:id', ActivityController.remove);

module.exports = router;
