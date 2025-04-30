var ActivityModel = require('../models/ActivityModel.js');

/**
 * ActivityController.js
 *
 * @description :: Server-side logic for managing Activitys.
 */
module.exports = {

    /**
     * ActivityController.list()
     */
    list: function (req, res) {
        ActivityModel.find(function (err, Activitys) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting Activity.',
                    error: err
                });
            }

            return res.json(Activitys);
        });
    },

    /**
     * ActivityController.show()
     */
    show: function (req, res) {
        var id = req.params.id;

        ActivityModel.findOne({_id: id}, function (err, Activity) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting Activity.',
                    error: err
                });
            }

            if (!Activity) {
                return res.status(404).json({
                    message: 'No such Activity'
                });
            }

            return res.json(Activity);
        });
    },

    /**
     * ActivityController.create()
     */
    create: function (req, res) {
        var Activity = new ActivityModel({
			user : req.body.user,
			date : req.body.date,
			steps : req.body.steps,
			distance : req.body.distance,
			speed : req.body.speed,
			temperature : req.body.temperature,
			route : req.body.route
        });

        Activity.save(function (err, Activity) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when creating Activity',
                    error: err
                });
            }

            return res.status(201).json(Activity);
        });
    },

    /**
     * ActivityController.update()
     */
    update: function (req, res) {
        var id = req.params.id;

        ActivityModel.findOne({_id: id}, function (err, Activity) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting Activity',
                    error: err
                });
            }

            if (!Activity) {
                return res.status(404).json({
                    message: 'No such Activity'
                });
            }

            Activity.user = req.body.user ? req.body.user : Activity.user;
			Activity.date = req.body.date ? req.body.date : Activity.date;
			Activity.steps = req.body.steps ? req.body.steps : Activity.steps;
			Activity.distance = req.body.distance ? req.body.distance : Activity.distance;
			Activity.speed = req.body.speed ? req.body.speed : Activity.speed;
			Activity.temperature = req.body.temperature ? req.body.temperature : Activity.temperature;
			Activity.route = req.body.route ? req.body.route : Activity.route;
			
            Activity.save(function (err, Activity) {
                if (err) {
                    return res.status(500).json({
                        message: 'Error when updating Activity.',
                        error: err
                    });
                }

                return res.json(Activity);
            });
        });
    },

    /**
     * ActivityController.remove()
     */
    remove: function (req, res) {
        var id = req.params.id;

        ActivityModel.findByIdAndRemove(id, function (err, Activity) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when deleting the Activity.',
                    error: err
                });
            }

            return res.status(204).json();
        });
    }
};
