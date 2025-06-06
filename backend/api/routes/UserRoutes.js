var express = require('express');
var router = express.Router();
var UserController = require('../controllers/UserController.js');
var authJWT = require('../middlewares/auth.js')

/*
 * GET
 */
router.get('/', UserController.list);
router.get('/logout', UserController.logout);


/*
 * GET
 */
router.get('/:id',authJWT, UserController.show);
router.get('/:id/activities', authJWT, UserController.activities);


/*
 * POST
 */
router.post('/', UserController.create);
router.post('/login', UserController.login);
router.post('/verify2fa', UserController.verify2fa);
router.post('/update_model', UserController.updateFaceModel)


/*
 * PUT
 */
router.put('/:id', UserController.update);

/*
 * DELETE
 */
router.delete('/:id', authJWT, UserController.remove);

module.exports = router;
