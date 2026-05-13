const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
    let token;

    // 1. Check Bearer Token (API Context)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } 
    // 2. Check Session (Browser Context)
    else if (req.session && (req.session.userId || req.session.adminId || req.session.portalId)) {
        let id;
        if (req.originalUrl.startsWith('/api/admin') && req.session.adminId) {
            id = req.session.adminId;
        } else if (req.session.portalId) {
            id = req.session.portalId;
        } else {
            id = req.session.userId || req.session.adminId;
        }
        
        req.user = await User.findById(id);
        if (req.user) return next();
    }

    // Fallback: If no token and no session
    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized: No token or session found.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id);

        if (!req.user) {
            return res.status(401).json({ success: false, message: 'User no longer exists.' });
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
        return res.status(401).json({ success: false, message: 'Not authorized: Invalid token.' });
    }
};

