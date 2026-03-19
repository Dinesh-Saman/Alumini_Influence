const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Bid = require('./src/models/Bid');
const User = require('./src/models/User'); // Required for population if needed

dotenv.config();

const seedWinner = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected...');

        // Find a user who HAS a profile
        const profile = await require('./src/models/Profile').findOne().populate('user');

        if (!profile) {
            console.log('No profiles found in the database. Please create a profile first via the API.');
            process.exit(1);
        }

        const user = profile.user;
        console.log(`Found candidate user with profile: ${user.email} (${user._id})`);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if a winner already exists for today
        let bid = await Bid.findOne({ targetDate: today, status: 'won' });

        if (bid) {
            console.log('A winner already exists for today:', bid._id);
            console.log('Updating winner to user with profile:', user.email);

            // Check if this user *already* has a bid for today (conflicting with unique index)
            // If so, delete it first, because we are about to make `bid` belong to `user`
            const existingUserBid = await Bid.findOne({ user: user._id, targetDate: today });
            if (existingUserBid && existingUserBid._id.toString() !== bid._id.toString()) {
                console.log('Deleting existing losing bid for this user to avoid conflict...');
                await Bid.deleteOne({ _id: existingUserBid._id });
            }

            bid.user = user._id;
            await bid.save();
            console.log('Winner updated successfully!');
        } else {
            console.log(`Creating winning bid for today (${today.toISOString()}) for user ${user.email}...`);
            await Bid.create({
                user: user._id,
                amount: 1000,
                targetDate: today,
                status: 'won'
            });
            console.log('Winning bid created!');
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedWinner();
