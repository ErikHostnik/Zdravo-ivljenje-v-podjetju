var ProccesseddataModel = require('../models/ProccessedDataModel.js');

/**
 * ProccessedDataController.js
 *
 * @description :: Server-side logic for managing ProccessedDatas.
 */
module.exports = {

    /**
     * ProccessedDataController.list()
     */
    list: function (req, res) {
        ProccesseddataModel.find(function (err, ProccessedDatas) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting ProccessedData.',
                    error: err
                });
            }

            return res.json(ProccessedDatas);
        });
    },

    /**
     * ProccessedDataController.show()
     */
    show: function (req, res) {
        var id = req.params.id;

        ProccesseddataModel.findOne({_id: id}, function (err, ProccessedData) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting ProccessedData.',
                    error: err
                });
            }

            if (!ProccessedData) {
                return res.status(404).json({
                    message: 'No such ProccessedData'
                });
            }

            return res.json(ProccessedData);
        });
    },

    /**
     * ProccessedDataController.create()
     */
    create: function (req, res) {
        var ProccessedData = new ProccesseddataModel({
			user : req.body.user,
			date : req.body.date,
			totalSteps : req.body.totalSteps,
			avgTemperature : req.body.avgTemperature,
			summary : req.body.summary
        });

        ProccessedData.save(function (err, ProccessedData) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when creating ProccessedData',
                    error: err
                });
            }

            return res.status(201).json(ProccessedData);
        });
    },

    /**
     * ProccessedDataController.update()
     */
    update: function (req, res) {
        var id = req.params.id;

        ProccesseddataModel.findOne({_id: id}, function (err, ProccessedData) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting ProccessedData',
                    error: err
                });
            }

            if (!ProccessedData) {
                return res.status(404).json({
                    message: 'No such ProccessedData'
                });
            }

            ProccessedData.user = req.body.user ? req.body.user : ProccessedData.user;
			ProccessedData.date = req.body.date ? req.body.date : ProccessedData.date;
			ProccessedData.totalSteps = req.body.totalSteps ? req.body.totalSteps : ProccessedData.totalSteps;
			ProccessedData.avgTemperature = req.body.avgTemperature ? req.body.avgTemperature : ProccessedData.avgTemperature;
			ProccessedData.summary = req.body.summary ? req.body.summary : ProccessedData.summary;
			
            ProccessedData.save(function (err, ProccessedData) {
                if (err) {
                    return res.status(500).json({
                        message: 'Error when updating ProccessedData.',
                        error: err
                    });
                }

                return res.json(ProccessedData);
            });
        });
    },

    /**
     * ProccessedDataController.remove()
     */
    remove: function (req, res) {
        var id = req.params.id;

        ProccesseddataModel.findByIdAndRemove(id, function (err, ProccessedData) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when deleting the ProccessedData.',
                    error: err
                });
            }

            return res.status(204).json();
        });
    }
};
