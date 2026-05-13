const ApiKey = require('../models/ApiKey');
const UsageLog = require('../models/UsageLog');

/**
 * Middleware to verify API Key via Bearer Token
 * Enforcement: All scoped endpoints must have a valid key
 */
exports.checkApiKey = async (req, res, next) => {
    let key;

    // Support Bearer Token (Authorization: Bearer <key>)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        key = req.headers.authorization.split(' ')[1];
    } 
    // Fallback to x-api-key for backward compatibility
    else if (req.headers['x-api-key']) {
        key = req.headers['x-api-key'];
    }

    if (!key) {
        return res.status(401).json({ 
            success: false, 
            message: 'Access Denied: No API key provided in Bearer token or headers' 
        });
    }

    try {
        const apiKey = await ApiKey.findOne({ key, isActive: true });

        if (!apiKey) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access Denied: Invalid or revoked API key' 
            });
        }

        // Attach key details to request for downstream scope validation
        req.apiKey = apiKey;

        // ASYNC LOGGING: Track usage metrics as per requirements
        // Number of times, timestamps, and endpoints accessed are captured
        UsageLog.create({
            endpoint: req.originalUrl,
            method: req.method,
            authType: 'API_KEY',
            ip: req.ip,
            metadata: { 
                apiKeyId: apiKey._id,
                clientName: apiKey.name,
                grantedPermissions: apiKey.permissions
            }
        }).catch(err => console.error('Audit Logging Error:', err));

        // Update internal key stats for the dashboard view
        apiKey.usageStats.push({
            endpoint: req.originalUrl,
            method: req.method,
            date: new Date()
        });
        await apiKey.save();

        next();
    } catch (error) {
        console.error('Core Auth Middleware Error:', error);
        res.status(500).json({ success: false, message: 'Internal Security Error' });
    }
};

/**
 * Scope Validator: Enforces granular permissions (e.g. read:alumni)
 * Provides proper 403 responses for unauthorized access
 */
exports.requireScope = (requiredPermission) => {
    return (req, res, next) => {
        if (!req.apiKey) {
            return res.status(403).json({ 
                success: false, 
                message: 'Security Context Missing: API key verification failed' 
            });
        }
        
        const hasPermission = req.apiKey.permissions && req.apiKey.permissions.includes(requiredPermission);
        
        if (!hasPermission) {
            return res.status(403).json({ 
                success: false, 
                message: `Forbidden: This key does not have the '${requiredPermission}' scope required for this client platform`,
                required: requiredPermission,
                granted: req.apiKey.permissions
            });
        }
        
        next();
    };
};

/**
 * Hybrid Auth: Allows access if:
 * 1. User is authenticated via session/JWT (Dashboard user)
 * OR
 * 2. Client is authenticated via a valid API Key with the required scope
 */
exports.authorizePlatform = (scope) => {
    return async (req, res, next) => {
        // 1. Check for interactive session (Dashboard Browser Access)
        if (req.session && (req.session.userId || req.session.adminId || req.session.portalId)) {
            return next();
        }

        // 2. Fallback to API Key Enforcement
        let key;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            key = req.headers.authorization.split(' ')[1];
        } else if (req.headers['x-api-key']) {
            key = req.headers['x-api-key'];
        }

        if (!key) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication Required: Please provide a Bearer Token or log in to the dashboard.' 
            });
        }

        try {
            const apiKey = await ApiKey.findOne({ key, isActive: true });
            if (!apiKey) {
                return res.status(401).json({ success: false, message: 'Invalid or revoked API key' });
            }

            // Verify Scope
            if (!apiKey.permissions.includes(scope)) {
                return res.status(403).json({ 
                    success: false, 
                    message: `Forbidden: API key lacks '${scope}' permission.` 
                });
            }

            // Register usage
            UsageLog.create({
                endpoint: req.originalUrl,
                method: req.method,
                authType: 'API_KEY',
                ip: req.ip,
                metadata: { apiKeyId: apiKey._id, clientName: apiKey.name }
            }).catch(e => {});

            next();
        } catch (error) {
            res.status(500).json({ success: false, message: 'Security gateway error' });
        }
    };
};
