var UserModel = require('../models/UserModel.js');
const jwt = require('jsonwebtoken');
const secret = 'moja-skrivnost';

/**
 * UserController.js
 *
 * @description :: Server-side logic for managing Users.
 */
module.exports = {

    /**
     * UserController.list()
     */
    list: async function (req, res) {
        try {
            const Users = await UserModel.find();
            return res.json(Users);
        } catch (err) {
            return res.status(500).json({
                message: 'Error when getting User.',
                error: err
            });
        }
    },

    /**
     * UserController.show()
     */
    show: async function (req, res) {
    const id = req.params.id;

        try {
            const User = await UserModel.findById(id)
                .populate('activities'); // <-- tukaj dodano

            if (!User) {
                return res.status(404).json({
                    message: 'No such User'
                });
            }

            return res.json(User);
        } catch (err) {
            return res.status(500).json({
                message: 'Error when getting User.',
                error: err
            });
        }
    },

    /**
     * UserController.create()
     */
    create: async function (req, res) {
        const User = new UserModel({
            username: req.body.username,
            email: req.body.email,
            password: req.body.password,
            stepCount: req.body.stepCount,
            distance: req.body.distance,
            createdAt: req.body.createdAt
        });

        try {
            const newUser = await User.save();
            return res.status(201).json(newUser);
        } catch (err) {
            return res.status(500).json({
                message: 'Error when creating User',
                error: err
            });
        }
    },

    /**
     * UserController.update()
     */
    update: async function (req, res) {
        const id = req.params.id;

        try {
            let User = await UserModel.findOne({ _id: id });

            if (!User) {
                return res.status(404).json({
                    message: 'No such User'
                });
            }

            User.name = req.body.name || User.name;
            User.email = req.body.email || User.email;
            User.stepCount = req.body.stepCount || User.stepCount;
            User.distance = req.body.distance || User.distance;
            User.routes = req.body.routes || User.routes;
            User.createdAt = req.body.createdAt || User.createdAt;

            const updatedUser = await User.save();
            return res.json(updatedUser);
        } catch (err) {
            return res.status(500).json({
                message: 'Error when updating User.',
                error: err
            });
        }
    },

    /**
     * UserController.remove()
     */
    remove: async function (req, res) {
        const id = req.params.id;

        try {
            const User = await UserModel.findByIdAndRemove(id);

            if (!User) {
                return res.status(404).json({
                    message: 'No such User'
                });
            }

            return res.status(204).json();
        } catch (err) {
            return res.status(500).json({
                message: 'Error when deleting the User.',
                error: err
            });
        }
    },

   login: async function (req, res) {
        const { username, password } = req.body;

        try {
            const User = await UserModel.authenticate(username, password);

            if (!User) {
                return res.status(401).json({
                    message: 'Invalid username or password.'
                });
            }

            const token = jwt.sign({ id: User._id }, secret, { expiresIn: '1h' });

            return res.json({
                user: User,
                token: token
            });
        } catch (err) {
            return res.status(500).json({
                message: 'Error when logging in.',
                error: err.message
            });
        }
    },

    logout: async function (req, res) {
        try {
            await req.session.destroy();
            return res.status(200).json({
                message: 'Logged out successfully.'
            });
        } catch (err) {
            return res.status(500).json({
                message: 'Error when logging out.',
                error: err
            });
        }
    },
};
