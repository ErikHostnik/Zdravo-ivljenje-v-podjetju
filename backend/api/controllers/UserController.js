var UserModel = require('../models/UserModel.js');

/**
 * UserController.js
 *
 * @description :: Server-side logic for managing Users.
 */
module.exports = {

    /**
     * UserController.list()
     */
    list: function (req, res) {
        UserModel.find(function (err, Users) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting User.',
                    error: err
                });
            }

            return res.json(Users);
        });
    },

    /**
     * UserController.show()
     */
    show: function (req, res) {
        var id = req.params.id;

        UserModel.findOne({_id: id}, function (err, User) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting User.',
                    error: err
                });
            }

            if (!User) {
                return res.status(404).json({
                    message: 'No such User'
                });
            }

            return res.json(User);
        });
    },

    /**
     * UserController.create()
     */
    create: function (req, res) {
        var User = new UserModel({
			name : req.body.name,
			email : req.body.email,
			stepCount : req.body.stepCount,
			distance : req.body.distance,
			routes : req.body.routes,
			createdAt : req.body.createdAt
        });

        User.save(function (err, User) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when creating User',
                    error: err
                });
            }

            return res.status(201).json(User);
        });
    },

    /**
     * UserController.update()
     */
    update: function (req, res) {
        var id = req.params.id;

        UserModel.findOne({_id: id}, function (err, User) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting User',
                    error: err
                });
            }

            if (!User) {
                return res.status(404).json({
                    message: 'No such User'
                });
            }

            User.name = req.body.name ? req.body.name : User.name;
			User.email = req.body.email ? req.body.email : User.email;
			User.stepCount = req.body.stepCount ? req.body.stepCount : User.stepCount;
			User.distance = req.body.distance ? req.body.distance : User.distance;
			User.routes = req.body.routes ? req.body.routes : User.routes;
			User.createdAt = req.body.createdAt ? req.body.createdAt : User.createdAt;
			
            User.save(function (err, User) {
                if (err) {
                    return res.status(500).json({
                        message: 'Error when updating User.',
                        error: err
                    });
                }

                return res.json(User);
            });
        });
    },

    /**
     * UserController.remove()
     */
    remove: function (req, res) {
        var id = req.params.id;

        UserModel.findByIdAndRemove(id, function (err, User) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when deleting the User.',
                    error: err
                });
            }

            return res.status(204).json();
        });
    }
};
