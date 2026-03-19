const Bid = require('../models/Bid');
const Profile = require('../models/Profile');
const User = require('../models/User');
const cron = require('node-cron');
const sendEmail = require('../utils/sendEmail');

/**
 * Get the start of tomorrow (midnight) as the target bid date.
 * Bids placed today are always for TOMORROW's featured slot.
 */
const getTargetDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
};

/**
 * Get the count of wins for the current user in the current calendar month.
 */
const getWinsThisMonth = async (userId) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    return Bid.countDocuments({
        user: userId,
        status: 'won',
        targetDate: { $gte: startOfMonth, $lte: endOfMonth },
    });
};

// @desc    Place a bid for tomorrow's slot (or update existing bid - increase only)
// @route   POST /api/bids
// @access  Private
exports.placeBid = async (req, res) => {
    try {
        const { amount } = req.body;

        if (amount === undefined || amount === null) {
            return res.status(400).json({ success: false, message: 'Please provide a bid amount' });
        }

        if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Bid amount must be a positive number' });
        }

        // 1. Check if user has a profile
        const profile = await Profile.findOne({ user: req.user.id });
        if (!profile) {
            return res.status(400).json({ success: false, message: 'Please create a profile before bidding' });
        }

        // 2. Check Monthly Limits (Max 3 wins per calendar month, 4 with bonus slot)
        const winsThisMonth = await getWinsThisMonth(req.user.id);
        const maxWins = profile.bonusSlotAvailable ? 4 : 3;

        if (winsThisMonth >= maxWins) {
            return res.status(400).json({
                success: false,
                message: `You have reached your monthly limit of ${maxWins} featured appearances. ${profile.bonusSlotAvailable ? '' : 'Attend a university alumni event to unlock a 4th slot.'}`.trim(),
            });
        }

        const targetDate = getTargetDate();

        // 3. Check if an active bid already exists for tomorrow
        const existingBid = await Bid.findOne({ user: req.user.id, targetDate, status: 'active' });

        if (existingBid) {
            // Update Logic: Check if new amount is higher
            if (amount <= existingBid.amount) {
                const symbol = process.env.CURRENCY_SYMBOL || '£';
                return res.status(400).json({ success: false, message: `New bid must be higher than your current active bid of ${symbol}${existingBid.amount}` });
            }
            // Mark the old bid as superseded to keep it in history
            existingBid.status = 'superseded';
            await existingBid.save();
        }

        // Create New Bid (always create a new record for history)
        const bid = await Bid.create({
            user: req.user.id,
            amount,
            currency: process.env.CURRENCY || 'GBP',
            targetDate,
            status: 'active'
        });

        // 4. Blind Bidding Feedback: tell user if they are winning or losing
        // We do NOT reveal the actual highest bid amount — only win/lose status
        const highestBid = await Bid.findOne({ targetDate }).sort({ amount: -1 });
        const isWinning = highestBid && highestBid.user.toString() === req.user.id.toString();

        // 5. Calculate remaining slots for this month
        const slotsRemaining = maxWins - winsThisMonth;

        res.status(200).json({
            success: true,
            data: {
                bidAmount: bid.amount,
                currency: bid.currency,
                currencySymbol: process.env.CURRENCY_SYMBOL || '£',
                targetDate: bid.targetDate,
                // Blind bidding: only return win/lose status, NOT the highest bid amount
                bidStatus: isWinning ? 'Winning' : 'Losing',
                message: isWinning
                    ? 'You are currently the highest bidder for tomorrow\'s slot!'
                    : 'You are currently outbid. Consider placing a higher bid.',
                remainingWinsThisMonth: slotsRemaining,
                bonusSlotActive: profile.bonusSlotAvailable,
            },
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Get user's current bid status for tomorrow
// @route   GET /api/bids/status
// @access  Private
exports.getBidStatus = async (req, res) => {
    try {
        const targetDate = getTargetDate();
        const bid = await Bid.findOne({ user: req.user.id, targetDate, status: 'active' });

        const profile = await Profile.findOne({ user: req.user.id });
        const winsThisMonth = await getWinsThisMonth(req.user.id);
        const maxWins = profile ? (profile.bonusSlotAvailable ? 4 : 3) : 3;
        const remainingWinsThisMonth = Math.max(0, maxWins - winsThisMonth);

        if (!bid) {
            return res.status(200).json({
                success: true,
                data: {
                    hasBid: false,
                    targetDate,
                    message: 'No bid placed for tomorrow yet',
                    winsThisMonth,
                    remainingWinsThisMonth,
                },
            });
        }

        const highestBid = await Bid.findOne({ targetDate, status: 'active' }).sort({ amount: -1 });
        const isWinning = highestBid && highestBid.user.toString() === req.user.id.toString();

        res.status(200).json({
            success: true,
            data: {
                hasBid: true,
                bidAmount: bid.amount,
                currency: bid.currency,
                currencySymbol: process.env.CURRENCY_SYMBOL || '£',
                targetDate: bid.targetDate,
                bidStatus: isWinning ? 'Winning' : 'Losing',
                winsThisMonth,
                remainingWinsThisMonth,
                bonusSlotActive: profile ? profile.bonusSlotAvailable : false,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Get Bid History for the current user
// @route   GET /api/bids/history
// @access  Private
exports.getBidHistory = async (req, res) => {
    try {
        const bids = await Bid.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: bids.length, data: bids });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// ---------------------------------------------------------------------------
// CRON JOB: Run every day at 6 PM (18:00) to select the Alumni of the Day
// ---------------------------------------------------------------------------
// How it works:
//  - Alumni place bids today for TOMORROW's featured slot (targetDate = tomorrow)
//  - At 6 PM, this cron triggers for tomorrow's featured slot (targetDate = tomorrow)
//  - Highest bidder wins, their profile is featured, and they receive an email.
//  - All others are marked as 'lost' and also receive a courtesy notification.
// ---------------------------------------------------------------------------
cron.schedule('0 18 * * *', async () => {
    console.log('[CRON] Starting Daily Winner Selection (6 PM)...');

    // At 6 PM, we look for bids where targetDate is TOMORROW
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 1);
    targetDate.setHours(0, 0, 0, 0);

    try {
        // 1. Find all active bidders for today
        const allBids = await Bid.find({ targetDate, status: 'active' }).sort({ amount: -1 });

        if (allBids.length > 0) {
            const highestBid = allBids[0];
            const otherBids = allBids.slice(1);

            // 2. Process Winner
            highestBid.status = 'won';
            await highestBid.save();

            // Update winner profile
            await Profile.findOneAndUpdate(
                { user: highestBid.user },
                {
                    $inc: { appearanceCount: 1 },
                    lastAppearanceDate: targetDate,
                }
            );

            // Email Winner
            const winnerUser = await User.findById(highestBid.user);
            if (winnerUser) {
                const symbol = process.env.CURRENCY_SYMBOL || '£';
                await sendEmail({
                    email: winnerUser.email,
                    subject: '🎉 Congratulations! You are the Alumni of the Day!',
                    message: `You won the bidding for ${targetDate.toDateString()}! Your winner profile is now live for all users to see.\n\nWinning Bid: ${symbol}${highestBid.amount}`,
                });
            }

            // 3. Process Losers (for "Excellent" feedback)
            if (otherBids.length > 0) {
                await Bid.updateMany(
                    { _id: { $in: otherBids.map(b => b._id) } },
                    { status: 'lost' }
                );

                for (const bid of otherBids) {
                    const user = await User.findById(bid.user);
                    if (user) {
                        await sendEmail({
                            email: user.email,
                            subject: 'Alumni of the Day Update',
                            message: `Thank you for your bid for ${targetDate.toDateString()}. Unfortunately, someone else placed a higher bid. Better luck next time!\n\nYou can always check the bidding status earlier in the day to increase your chances.`,
                        });
                    }
                }
            }

            console.log(`[CRON] Selection successful for ${targetDate.toDateString()}. Winner: ${highestBid.user}`);
        } else {
            console.log(`[CRON] No bids found for ${targetDate.toDateString()}`);
        }
    } catch (err) {
        console.error('[CRON] Error:', err);
    }
});
