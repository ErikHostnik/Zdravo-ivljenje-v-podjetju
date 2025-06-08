const mongoose = require('mongoose');
const SensorDataModel = require('../models/SensorDataModel.js');
const { getCount } = require('../services/ActiveDeviceService');

async function globalSteps(req, res) {
    const days = parseInt(req.query.days, 10) || 7;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days + 1);

    try {
        const results = await SensorDataModel.aggregate([
            { $unwind: '$activity' },
            { $match: { 'activity.timestamp': { $gte: cutoff } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$activity.timestamp' }
                    },
                    totalSteps: { $sum: '$activity.steps' }
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
        res.json(data);
    } catch (err) {
        console.error('globalSteps error:', err);
        res.status(500).json({ message: 'Error computing global steps', error: err });
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
        const dayStart = day.getTime();
        const dayEnd = dayStart + 24 * 3600 * 1000;

        results.push({ date: day.toISOString().substring(0, 10), count: getCount() });
    }
    res.json(results);
}

module.exports = { globalSteps, activeUsersPerDay };
