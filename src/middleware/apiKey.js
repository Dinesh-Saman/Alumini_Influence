const ApiKey = require('../models/ApiKey');

exports.checkApiKey = async (req, res, next) => {
    // Check for x-api-key header
    const key = req.headers['x-api-key'];

    if (!key) {
        return res.status(401).json({ success: false, message: 'API Key missing' });
    }

    try {
        const apiKey = await ApiKey.findOne({ key, isActive: true });

        if (!apiKey) {
            return res.status(401).json({ success: false, message: 'Invalid API Key' });
        }

        // Update key-specific stats
        apiKey.usageStats.push({
            endpoint: req.originalUrl,
            method: req.method
        });

        await apiKey.save();

        // Log to central usage collection
        const UsageLog = require('../models/UsageLog');
        UsageLog.create({
            endpoint: req.originalUrl,
            method: req.method,
            authType: 'API_KEY',
            ip: req.ip,
            user: null, // No user for API key
            // Option to store Key ID if we want to link them later
            metadata: { apiKeyId: apiKey._id }
        }).catch(err => console.error('Logging error:', err));

        next();
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
