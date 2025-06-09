const mongoose = require('mongoose');
const SensorDataModel = require('../models/SensorDataModel.js');
const { getCount } = require('../services/ActiveDeviceService');

async function globalSteps(req, res) {
    const days = parseInt(req.query.days, 10) || 7;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days + 1);

    try {
        const results = await SensorDataModel.aggregate([
            { $unwind: '$session' },

            {
                $addFields: {
                    sessionDate: {
                        $dateFromString: { dateString: '$session.timestamp' }
                    }
                }
            },

            { $match: { sessionDate: { $gte: cutoff } } },

            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$sessionDate' }
                    },
                    totalSteps: { $sum: '$session.steps' }
                }
            },

            { $sort: { '_id': 1 } }
        ]);

        const data = [];
        for (let i = 0; i < days; i++) {
            const d = new Date(cutoff);
            d.setDate(cutoff.getDate() + i);
            const dayStr = d.toISOString().substring(0, 10);
            const rec = results.find(r => r._id === dayStr);
            data.push({ date: dayStr, totalSteps: rec ? rec.totalSteps : 0 });
        }

        return res.json(data);
    } catch (err) {
        console.error('globalSteps error:', err);
        return res
            .status(500)
            .json({ message: 'Error computing global steps', error: err });
    }
}

function activeUsersPerDay(req, res) {
    const days = parseInt(req.query.days, 10) || 7;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const results = [];
    for (let i = days - 1; i >= 0; i--) {
        const day = new Date(today);
        day.setDate(today.getDate() - i);
        results.push({
            date: day.toISOString().substring(0, 10),
            count: getCount()
        });
    }

    return res.json(results);
}

module.exports = {
    globalSteps,
    activeUsersPerDay
};
