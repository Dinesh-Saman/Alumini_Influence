const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = await User.findById(decoded.id);

        if (!req.user) {
            return res.status(401).json({ success: false, message: 'User no longer exists in our database' });
        }

        // Global usage logging
        const UsageLog = require('../models/UsageLog');
        UsageLog.create({
            user: req.user._id,
            endpoint: req.originalUrl,
            method: req.method,
            authType: 'JWT',
            ip: req.ip
        }).catch(err => console.error('Logging error:', err));

        next();
    } catch (err) {
        console.log(err);
        return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }
};
