const mongoose = require('mongoose');
const crypto = require('crypto');

const ApiKeySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true, // Prevent duplicate descriptive names
    },
    key: {
        type: String,
        required: true,
        unique: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    permissions: [{
        type: String,
        enum: ['read:alumni', 'read:analytics', 'read:alumni_of_day', 'write:alumni', 'admin:all'],
        default: ['read:alumni']
    }],
    lastUsed: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    usageStats: [
        {
            timestamp: { type: Date, default: Date.now },
            endpoint: String,
            method: String,
            ip: String,
            statusCode: Number
        }
    ]
});

// Generate API Key
ApiKeySchema.statics.generateKey = function () {
    return crypto.randomBytes(32).toString('hex');
};

module.exports = mongoose.model('ApiKey', ApiKeySchema);
