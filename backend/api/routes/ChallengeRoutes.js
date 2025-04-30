var express = require('express');
var router = express.Router();
var ChallengeController = require('../controllers/ChallengeController.js');

/*
 * GET
 */
router.get('/', ChallengeController.list);

/*
 * GET
 */
router.get('/:id', ChallengeController.show);

/*
 * POST
 */
router.post('/', ChallengeController.create);

/*
 * PUT
 */
router.put('/:id', ChallengeController.update);

/*
 * DELETE
 */
router.delete('/:id', ChallengeController.remove);

module.exports = router;
