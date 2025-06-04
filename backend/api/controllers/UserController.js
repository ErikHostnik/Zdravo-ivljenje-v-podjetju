require('dotenv').config();
const UserModel = require('../models/UserModel.js');
const jwt = require('jsonwebtoken');
const TwoFactorRequest = require('../models/TwoFactorRequestModel.js');
const mqtt = require('mqtt');
const mqttClient = mqtt.connect(process.env.MQTT_URI);

const secret = process.env.JWT_SECRET;

/**
 * UserController.js
 *
 * @description :: Server-side logic for managing Users.
 */
module.exports = {
    updateFaceModel: async function (req, res) {
        const { userId, faceModelPath } = req.body;
        try {
            const updatedUser = await UserModel.findByIdAndUpdate(
            userId,
            { faceModel: faceModelPath },
            { new: true }
            );
            if (!updatedUser) {
                return res.status(404).json({
                    message: 'No such User to update faceModel.'
                });
            }
            return res.json({ success: true, user: updatedUser });
        } catch (err) {
            return res.status(500).json({
            message: 'Error when updating faceModel.',
            error: err
            });
        }
    },

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
                .populate('activities'); 

            if (!User) {
                return res.status(404).json({
                    message: 'No such User'
                });
            }

            if (!User.stepGoal) {
                User.stepGoal = 10000; 
                await User.save();
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
            stepGoal: req.body.stepGoal || 10000, // privzeta vrednost
            activities: req.body.activities || [],
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
            User.stepGoal = req.body.stepGoal || User.stepGoal;
            User.activities = req.body.activities || User.activities;
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
        const { username, password, isMobile } = req.body;

        try {
            const user = await UserModel.authenticate(username, password);
            if (!user) {
                return res.status(401).json({ message: 'Invalid credentials.' });
            }

            // 🔓 ZAČASNO: omogoči prijavo brez 2FA za vse (mobilne + spletne uporabnike)
            const token = jwt.sign({ id: user._id }, secret, { expiresIn: '1h' });
            return res.json({ user, token });

            // 🔒 ORIGINALNA 2FA LOGIKA (za spletno aplikacijo) — trenutno zakomentirano:
            /*
            if (isMobile) {
                const token = jwt.sign({ id: user._id }, secret, { expiresIn: '1h' });
                return res.json({ user, token });
            }

            const existing = await TwoFactorRequest.findOne({
                user: user._id,
                approved: false,
                rejected: false
            });

            if (existing) {
                return res.json({
                    pending2FA: true,
                    twoFactorRequestId: existing._id
                });
            }

            const twoFa = new TwoFactorRequest({ user: user._id });
            await twoFa.save();

            mqttClient.publish(
                `2fa/request/${user._id}`,
                JSON.stringify({ requestId: twoFa._id })
            );

            return res.json({
                pending2FA: true,
                twoFactorRequestId: twoFa._id
            });
            */
        } catch (err) {
            console.error("Login Error:", err);
            return res.status(500).json({ message: 'Login error.', error: err.message });
        }
    },


    /*login: async function (req, res) {
        const { username, password, isMobile } = req.body;

        try {
            const user = await UserModel.authenticate(username, password);
            if (!user) {
                return res.status(401).json({ message: 'Invalid credentials.' });
            }

            // Mobilna aplikacija - običajna prijava, brez 2FA
            if (isMobile) {
                const token = jwt.sign({ id: user._id }, secret, { expiresIn: '1h' });
                return res.json({ user, token });
            }

            // Spletna aplikacija - 2FA postopki
            const existing = await TwoFactorRequest.findOne({
                user: user._id,
                approved: false,
                rejected: false
            });

            if (existing) {
                return res.json({
                    pending2FA: true,
                    twoFactorRequestId: existing._id
                });
            }

            const twoFa = new TwoFactorRequest({ user: user._id });
            await twoFa.save();

            mqttClient.publish(
                `2fa/request/${user._id}`,
                JSON.stringify({ requestId: twoFa._id })
            );

            return res.json({
                pending2FA: true,
                twoFactorRequestId: twoFa._id
            });
        } catch (err) {
            console.error("Login Error:", err);
            return res.status(500).json({ message: 'Login error.', error: err.message });
        }
    },*/
    
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

    verify2fa: async (req, res) => {
    const { requestId } = req.body;
        try {
            const req2FA = await TwoFactorRequest.findById(requestId).populate('user');
            if (!req2FA) return res.status(404).json({ message: '2FA request not found.' });

            if (req2FA.rejected) return res.status(403).json({ message: 'Access denied.' });
            if (!req2FA.approved)  return res.json({ pending: true });

            const token = jwt.sign({ id: req2FA.user._id }, secret, { expiresIn: '1h' });
            return res.json({ user: req2FA.user, token });
        } catch (err) {
            console.error("verify2fa Error:", err);
            return res.status(500).json({ message: 'verify2fa error.', error: err.message });
        }
    },
};
