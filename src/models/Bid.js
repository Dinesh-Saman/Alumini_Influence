const mongoose = require('mongoose');

const BidSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    amount: {
        type: Number,
        required: [true, 'Please add a bid amount'],
    },
    currency: {
        type: String,
        default: 'GBP',
    },
    bidDate: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ['active', 'won', 'lost', 'cancelled', 'superseded'],
        default: 'active',
    },
    targetDate: { // The date the alumni wants to be featured (usually tomorrow)
        type: Date,
        required: true
    }
}, {
    timestamps: true
});

// Allow multiple bids per target date to maintain history, but only one should be 'active'
BidSchema.index({ user: 1, targetDate: 1, status: 1 });

// CRON Optimization: Fast lookup for the highest active bidder at 6 PM
BidSchema.index({ targetDate: 1, status: 1, amount: -1 });

module.exports = mongoose.model('Bid', BidSchema);
