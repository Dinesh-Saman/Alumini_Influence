const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Bid = require('./src/models/Bid');
const Profile = require('./src/models/Profile');
const User = require('./src/models/User');
const sendEmail = require('./src/utils/sendEmail');

dotenv.config();

const testWinnerSelection = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected for test...');

        // 1. Target date for the test is "TOMORROW" because that's what the bids you place 
        // in Postman are set for (getTargetDate).
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 1);
        targetDate.setHours(0, 0, 0, 0);

        console.log(`Checking bids for ${targetDate.toDateString()}...`);

        // 2. Find all active bidders for that date
        const allBids = await Bid.find({ targetDate, status: 'active' }).sort({ amount: -1 });

        if (allBids.length > 0) {
            const highestBid = allBids[0];
            const otherBids = allBids.slice(1);

            const symbol = process.env.CURRENCY_SYMBOL || '£';
            console.log(`Winner: User ${highestBid.user} (Bid: ${symbol}${highestBid.amount})`);
            console.log(`Losers: ${otherBids.length}`);

            // 3. Process Winner
            highestBid.status = 'won';
            await highestBid.save();

            // Update winner profile
            const updatedProfile = await Profile.findOneAndUpdate(
                { user: highestBid.user },
                {
                    $inc: { appearanceCount: 1 },
                    lastAppearanceDate: targetDate,
                },
                { new: true }
            );

            console.log(`Appearance count updated to: ${updatedProfile.appearanceCount}`);

            // Email Winner
            const winnerUser = await User.findById(highestBid.user);
            if (winnerUser) {
                console.log(`Notifying winner: ${winnerUser.email}`);
                const symbol = process.env.CURRENCY_SYMBOL || '£';
                await sendEmail({
                    email: winnerUser.email,
                    subject: '🎉 Congratulations! You are the Alumni of the Day!',
                    message: `You won the bidding for ${targetDate.toDateString()}! Your winner profile is now live.\n\nWinning Bid: ${symbol}${highestBid.amount}`,
                });
            }

            // 4. Process Losers
            if (otherBids.length > 0) {
                await Bid.updateMany(
                    { _id: { $in: otherBids.map(b => b._id) } },
                    { status: 'lost' }
                );

                for (const bid of otherBids) {
                    const user = await User.findById(bid.user);
                    if (user) {
                        console.log(`Notifying loser: ${user.email}`);
                        await sendEmail({
                            email: user.email,
                            subject: 'Alumni of the Day Update',
                            message: `Thank you for your bid for ${targetDate.toDateString()}. Unfortunately, someone else placed a higher bid.`,
                        });
                    }
                }
            }

            console.log(`Test complete for: ${targetDate.toDateString()}`);
        } else {
            console.log(`❌ No active bids found for ${targetDate.toDateString()}.`);
            console.log('   Please place a bid in Postman first before running this test.');
        }

        process.exit(0);
    } catch (err) {
        console.error('🛑 Test failed:', err.message);
        process.exit(1);
    }
};

testWinnerSelection();
