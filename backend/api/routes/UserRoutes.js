var express = require('express');
var router = express.Router();
var UserController = require('../controllers/UserController.js');

/*
 * GET
 */
router.get('/', UserController.list);
router.get('/logout', UserController.logout);

/*
 * GET
 */
router.get('/:id', UserController.show);

/*
 * POST
 */
router.post('/', UserController.create);
router.post('/login', UserController.login);

/*
 * PUT
 */
router.put('/:id', UserController.update);

/*
 * DELETE
 */
router.delete('/:id', UserController.remove);

module.exports = router;
