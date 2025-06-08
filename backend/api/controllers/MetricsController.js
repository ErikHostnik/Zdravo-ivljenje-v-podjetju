const { getCount } = require('../services/ActiveDeviceService');

module.exports = {

    activeDevices: (req, res) => {
        const count = getCount();
        return res.json({ count });
    }
};
