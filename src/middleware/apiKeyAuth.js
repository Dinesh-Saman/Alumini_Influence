const ApiKey = require('../models/ApiKey');

/**
 * Middleware to authorize requests using API keys instead of bearer tokens.
 * This is for server-to-server or machine-to-machine access as specified in CW2.
 */
exports.authorizeKey = async (req, res, next) => {
    let key;

    // Check header 'x-api-key' or 'Authorization: Bearer <API_KEY>'
    if (req.headers['x-api-key']) {
        key = req.headers['x-api-key'];
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        // In the context of API clients like the mobile AR app or university dashboard,
        // they might use the raw API key as a bearer token.
        key = req.headers.authorization.split(' ')[1];
    }

    if (!key) {
        return res.status(401).json({ success: false, message: 'API key required' });
    }

    try {
        const apiKey = await ApiKey.findOne({ key, isActive: true });

        if (!apiKey) {
            return res.status(401).json({ success: false, message: 'Invalid or deactivated API key' });
        }

        // Attach permissions to request for the next middleware
        req.apiKeyPermissions = apiKey.permissions;
        req.apiKeyId = apiKey._id;

        // Log usage (Scenario 4)
        apiKey.lastUsed = new Date();
        apiKey.usageStats.push({
            timestamp: new Date(),
            endpoint: req.originalUrl,
            method: req.method,
            ip: req.ip,
            statusCode: 200 // Default, will stay 200 unless error occurs later
        });
        
        // Use a background task for higher performance logging
        apiKey.save().catch(err => console.error('API Key Log Error:', err));

        next();
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

/**
 * Permission guard — requires a specific scope to access an endpoint.
 * @param {string} scope - e.g., 'read:analytics'
 */
exports.requireScope = (scope) => {
    return (req, res, next) => {
        // Admins with 'admin:all' can access anything
        if (req.apiKeyPermissions && req.apiKeyPermissions.includes('admin:all')) {
            return next();
        }

        if (!req.apiKeyPermissions || !req.apiKeyPermissions.includes(scope)) {
            return res.status(403).json({ 
                success: false, 
                message: `Insufficient permissions. Required scope: ${scope}` 
            });
        }
        next();
    };
};
