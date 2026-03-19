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
    createdAt: {
        type: Date,
        default: Date.now,
    },
    usageStats: [
        {
            date: { type: Date, default: Date.now },
            endpoint: String,
            method: String
        }
    ]
});

// Generate API Key
ApiKeySchema.statics.generateKey = function () {
    return crypto.randomBytes(32).toString('hex');
};

module.exports = mongoose.model('ApiKey', ApiKeySchema);
