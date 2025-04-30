var WeatherdataModel = require('../models/WeatherDataModel.js');

/**
 * WeatherDataController.js
 *
 * @description :: Server-side logic for managing WeatherDatas.
 */
module.exports = {

    /**
     * WeatherDataController.list()
     */
    list: function (req, res) {
        WeatherdataModel.find(function (err, WeatherDatas) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting WeatherData.',
                    error: err
                });
            }

            return res.json(WeatherDatas);
        });
    },

    /**
     * WeatherDataController.show()
     */
    show: function (req, res) {
        var id = req.params.id;

        WeatherdataModel.findOne({_id: id}, function (err, WeatherData) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting WeatherData.',
                    error: err
                });
            }

            if (!WeatherData) {
                return res.status(404).json({
                    message: 'No such WeatherData'
                });
            }

            return res.json(WeatherData);
        });
    },

    /**
     * WeatherDataController.create()
     */
    create: function (req, res) {
        var WeatherData = new WeatherdataModel({
			date : req.body.date,
			location : req.body.location,
			temperature : req.body.temperature,
			humidity : req.body.humidity,
			weatherConditions : req.body.weatherConditions
        });

        WeatherData.save(function (err, WeatherData) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when creating WeatherData',
                    error: err
                });
            }

            return res.status(201).json(WeatherData);
        });
    },

    /**
     * WeatherDataController.update()
     */
    update: function (req, res) {
        var id = req.params.id;

        WeatherdataModel.findOne({_id: id}, function (err, WeatherData) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting WeatherData',
                    error: err
                });
            }

            if (!WeatherData) {
                return res.status(404).json({
                    message: 'No such WeatherData'
                });
            }

            WeatherData.date = req.body.date ? req.body.date : WeatherData.date;
			WeatherData.location = req.body.location ? req.body.location : WeatherData.location;
			WeatherData.temperature = req.body.temperature ? req.body.temperature : WeatherData.temperature;
			WeatherData.humidity = req.body.humidity ? req.body.humidity : WeatherData.humidity;
			WeatherData.weatherConditions = req.body.weatherConditions ? req.body.weatherConditions : WeatherData.weatherConditions;
			
            WeatherData.save(function (err, WeatherData) {
                if (err) {
                    return res.status(500).json({
                        message: 'Error when updating WeatherData.',
                        error: err
                    });
                }

                return res.json(WeatherData);
            });
        });
    },

    /**
     * WeatherDataController.remove()
     */
    remove: function (req, res) {
        var id = req.params.id;

        WeatherdataModel.findByIdAndRemove(id, function (err, WeatherData) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when deleting the WeatherData.',
                    error: err
                });
            }

            return res.status(204).json();
        });
    }
};
