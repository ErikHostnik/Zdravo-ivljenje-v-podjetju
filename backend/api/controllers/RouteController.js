var RouteModel = require('../models/RouteModel.js');

/**
 * RouteController.js
 *
 * @description :: Server-side logic for managing Routes.
 */
module.exports = {

    /**
     * RouteController.list()
     */
    list: function (req, res) {
        RouteModel.find(function (err, Routes) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting Route.',
                    error: err
                });
            }

            return res.json(Routes);
        });
    },

    /**
     * RouteController.show()
     */
    show: function (req, res) {
        var id = req.params.id;

        RouteModel.findOne({_id: id}, function (err, Route) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting Route.',
                    error: err
                });
            }

            if (!Route) {
                return res.status(404).json({
                    message: 'No such Route'
                });
            }

            return res.json(Route);
        });
    },

    /**
     * RouteController.create()
     */
    create: function (req, res) {
        var Route = new RouteModel({
			startLocation : req.body.startLocation,
			endLocation : req.body.endLocation,
			path : req.body.path,
			weatherData : req.body.weatherData,
			date : req.body.date
        });

        Route.save(function (err, Route) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when creating Route',
                    error: err
                });
            }

            return res.status(201).json(Route);
        });
    },

    /**
     * RouteController.update()
     */
    update: function (req, res) {
        var id = req.params.id;

        RouteModel.findOne({_id: id}, function (err, Route) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting Route',
                    error: err
                });
            }

            if (!Route) {
                return res.status(404).json({
                    message: 'No such Route'
                });
            }

            Route.startLocation = req.body.startLocation ? req.body.startLocation : Route.startLocation;
			Route.endLocation = req.body.endLocation ? req.body.endLocation : Route.endLocation;
			Route.path = req.body.path ? req.body.path : Route.path;
			Route.weatherData = req.body.weatherData ? req.body.weatherData : Route.weatherData;
			Route.date = req.body.date ? req.body.date : Route.date;
			
            Route.save(function (err, Route) {
                if (err) {
                    return res.status(500).json({
                        message: 'Error when updating Route.',
                        error: err
                    });
                }

                return res.json(Route);
            });
        });
    },

    /**
     * RouteController.remove()
     */
    remove: function (req, res) {
        var id = req.params.id;

        RouteModel.findByIdAndRemove(id, function (err, Route) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when deleting the Route.',
                    error: err
                });
            }

            return res.status(204).json();
        });
    }
};
