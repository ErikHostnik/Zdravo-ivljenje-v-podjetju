var ChallengeModel = require('../models/ChallengeModel.js');

/**
 * ChallengeController.js
 *
 * @description :: Server-side logic for managing Challenges.
 */
module.exports = {

    /**
     * ChallengeController.list()
     */
    list: function (req, res) {
        ChallengeModel.find(function (err, Challenges) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting Challenge.',
                    error: err
                });
            }

            return res.json(Challenges);
        });
    },

    /**
     * ChallengeController.show()
     */
    show: function (req, res) {
        var id = req.params.id;

        ChallengeModel.findOne({_id: id}, function (err, Challenge) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting Challenge.',
                    error: err
                });
            }

            if (!Challenge) {
                return res.status(404).json({
                    message: 'No such Challenge'
                });
            }

            return res.json(Challenge);
        });
    },

    /**
     * ChallengeController.create()
     */
    create: function (req, res) {
        var Challenge = new ChallengeModel({
			name : req.body.name,
			description : req.body.description,
			startDate : req.body.startDate,
			endDate : req.body.endDate,
			rewards : req.body.rewards,
			participants : req.body.participants,
			progress : req.body.progress
        });

        Challenge.save(function (err, Challenge) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when creating Challenge',
                    error: err
                });
            }

            return res.status(201).json(Challenge);
        });
    },

    /**
     * ChallengeController.update()
     */
    update: function (req, res) {
        var id = req.params.id;

        ChallengeModel.findOne({_id: id}, function (err, Challenge) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting Challenge',
                    error: err
                });
            }

            if (!Challenge) {
                return res.status(404).json({
                    message: 'No such Challenge'
                });
            }

            Challenge.name = req.body.name ? req.body.name : Challenge.name;
			Challenge.description = req.body.description ? req.body.description : Challenge.description;
			Challenge.startDate = req.body.startDate ? req.body.startDate : Challenge.startDate;
			Challenge.endDate = req.body.endDate ? req.body.endDate : Challenge.endDate;
			Challenge.rewards = req.body.rewards ? req.body.rewards : Challenge.rewards;
			Challenge.participants = req.body.participants ? req.body.participants : Challenge.participants;
			Challenge.progress = req.body.progress ? req.body.progress : Challenge.progress;
			
            Challenge.save(function (err, Challenge) {
                if (err) {
                    return res.status(500).json({
                        message: 'Error when updating Challenge.',
                        error: err
                    });
                }

                return res.json(Challenge);
            });
        });
    },

    /**
     * ChallengeController.remove()
     */
    remove: function (req, res) {
        var id = req.params.id;

        ChallengeModel.findByIdAndRemove(id, function (err, Challenge) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when deleting the Challenge.',
                    error: err
                });
            }

            return res.status(204).json();
        });
    }
};
