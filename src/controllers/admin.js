const ApiKey = require('../models/ApiKey');

// @desc    Generate a new API Key
// @route   POST /api/admin/apikeys
// @access  Private (Admin only)
exports.generateApiKey = async (req, res) => {
    try {
        const { name } = req.body;

        // Check for duplicate name
        const existingKey = await ApiKey.findOne({ name });
        if (existingKey) {
            return res.status(400).json({
                success: false,
                message: 'An API key with this name already exists. Please use a unique name (e.g. AR Client v2).'
            });
        }

        const key = ApiKey.generateKey();

        const apiKey = await ApiKey.create({
            name,
            key
        });

        res.status(201).json({ success: true, data: { name: apiKey.name, key: apiKey.key } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get all API Keys
// @route   GET /api/admin/apikeys
// @access  Private (Admin only)
exports.getApiKeys = async (req, res) => {
    try {
        const keys = await ApiKey.find().select('-usageStats'); // Exclude stats for list
        res.status(200).json({ success: true, data: keys });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get API Key Statistics
// @route   GET /api/admin/apikeys/:id/stats
// @access  Private (Admin only)
exports.getKeyStats = async (req, res) => {
    try {
        const key = await ApiKey.findById(req.params.id);
        if (!key) {
            return res.status(404).json({ success: false, message: 'Key not found' });
        }

        res.status(200).json({
            success: true,
            data: {
                name: key.name,
                usageCount: key.usageStats.length,
                usageStats: key.usageStats
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Revoke API Key
// @route   DELETE /api/admin/apikeys/:id
// @access  Private (Admin only)
exports.revokeApiKey = async (req, res) => {
    try {
        const key = await ApiKey.findById(req.params.id);
        if (!key) {
            return res.status(404).json({ success: false, message: 'Key not found' });
        }

        key.isActive = false;
        await key.save();

        res.status(200).json({ success: true, message: 'API Key revoked' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Activate API Key
// @route   PUT /api/admin/apikeys/:id/activate
// @access  Private (Admin only)
exports.activateApiKey = async (req, res) => {
    try {
        const key = await ApiKey.findById(req.params.id);
        if (!key) {
            return res.status(404).json({ success: false, message: 'Key not found' });
        }

        key.isActive = true;
        await key.save();

        res.status(200).json({ success: true, message: 'API Key reactivated' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
// @desc    Get all Usage Logs (Central Statistics)
// @route   GET /api/admin/logs
// @access  Private (Admin only)
exports.getUsageLogs = async (req, res) => {
    try {
        const UsageLog = require('../models/UsageLog');
        const logs = await UsageLog.find().sort({ timestamp: -1 }).limit(100);
        res.status(200).json({ success: true, count: logs.length, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get Login History for a specific user
// @route   GET /api/admin/users/:id/logins
// @access  Private (Admin only)
exports.getUserLoginHistory = async (req, res) => {
    try {
        const User = require('../models/User');
        const user = await User.findById(req.params.id).select('email loginHistory');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
// @desc    Toggle Bonus Slot for a user
// @route   PUT /api/admin/users/:id/bonus
// @access  Private (Admin only)
exports.toggleBonusSlot = async (req, res) => {
    try {
        const Profile = require('../models/Profile');
        const profile = await Profile.findOne({ user: req.params.id });

        if (!profile) {
            return res.status(404).json({ success: false, message: 'Profile not found for this user' });
        }

        const { available } = req.body;

        if (available === undefined) {
            return res.status(400).json({ success: false, message: 'Please provide availability status (true/false)' });
        }

        profile.bonusSlotAvailable = available;
        await profile.save();

        res.status(200).json({
            success: true,
            message: `Bonus slot ${available ? 'granted' : 'revoked'} for user.`,
            data: { bonusSlotAvailable: profile.bonusSlotAvailable }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
