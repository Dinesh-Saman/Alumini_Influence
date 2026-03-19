const mongoose = require('mongoose');

const UsageLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Null for API key access if not tied to a user
    },
    endpoint: {
        type: String,
        required: true
    },
    method: {
        type: String,
        required: true
    },
    authType: {
        type: String,
        enum: ['JWT', 'API_KEY'],
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    ip: String,
    metadata: mongoose.Schema.Types.Mixed
});

module.exports = mongoose.model('UsageLog', UsageLogSchema);
