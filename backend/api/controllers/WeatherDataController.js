const WeatherdataModel = require('../models/WeatherDataModel.js');

/**
 * WeatherDataController.js
 *
 * @description :: Server-side logic for managing WeatherDatas.
 */
module.exports = {

    /**
     * WeatherDataController.list()
     */
    list: async function (req, res) {
        try {
            const weatherDataList = await WeatherdataModel.find();
            return res.json(weatherDataList);
        } catch (err) {
            return res.status(500).json({
                message: 'Error when getting WeatherData.',
                error: err
            });
        }
    },

    /**
     * WeatherDataController.show()
     */
    show: async function (req, res) {
        try {
            const id = req.params.id;
            const weatherData = await WeatherdataModel.findById(id);

            if (!weatherData) {
                return res.status(404).json({ message: 'No such WeatherData' });
            }

            return res.json(weatherData);
        } catch (err) {
            return res.status(500).json({
                message: 'Error when getting WeatherData.',
                error: err
            });
        }
    },

    /**
     * WeatherDataController.create()
     */
    create: async function (req, res) {
        try {
            const weatherData = new WeatherdataModel({
                date: req.body.date,
                location: req.body.location,
                temperature: req.body.temperature,
                humidity: req.body.humidity,
                weatherConditions: req.body.weatherConditions
            });

            const savedData = await weatherData.save();
            return res.status(201).json(savedData);
        } catch (err) {
            return res.status(500).json({
                message: 'Error when creating WeatherData',
                error: err
            });
        }
    },

    /**
     * WeatherDataController.update()
     */
    update: async function (req, res) {
        try {
            const id = req.params.id;
            const weatherData = await WeatherdataModel.findById(id);

            if (!weatherData) {
                return res.status(404).json({ message: 'No such WeatherData' });
            }

            weatherData.date = req.body.date ?? weatherData.date;
            weatherData.location = req.body.location ?? weatherData.location;
            weatherData.temperature = req.body.temperature ?? weatherData.temperature;
            weatherData.humidity = req.body.humidity ?? weatherData.humidity;
            weatherData.weatherConditions = req.body.weatherConditions ?? weatherData.weatherConditions;

            const updatedData = await weatherData.save();
            return res.json(updatedData);
        } catch (err) {
            return res.status(500).json({
                message: 'Error when updating WeatherData.',
                error: err
            });
        }
    },

    /**
     * WeatherDataController.remove()
     */
    remove: async function (req, res) {
        try {
            const id = req.params.id;
            await WeatherdataModel.findByIdAndDelete(id);
            return res.status(204).send();
        } catch (err) {
            return res.status(500).json({
                message: 'Error when deleting the WeatherData.',
                error: err
            });
        }
    }
};
