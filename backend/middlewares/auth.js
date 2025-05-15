const jwt = require('jsonwebtoken');
const secret = 'moja-skrivnost';

module.exports = function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Token missing' });

    jwt.verify(token, secret, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });

        req.userId = user.id;
        next();
    });
};
