const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Bid = require('./src/models/Bid');
const User = require('./src/models/User');

dotenv.config();

const checkWinner = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected...');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find the winning bid for today
        const winningBid = await Bid.findOne({
            targetDate: today,
            status: 'won'
        }).populate('user');

        if (!winningBid) {
            console.log('No winning bid found for today.');
        } else {
            console.log('------------------------------------------------');
            console.log('WINNER FOUND FOR TODAY:');
            console.log('Bid Amount:', winningBid.amount);
            console.log('User Email:', winningBid.user.email);
            console.log('User ID:', winningBid.user._id);
            console.log('------------------------------------------------');
            console.log('ACTION REQUIRED:');
            console.log(`Log in as "${winningBid.user.email}" in Postman.`);
            console.log('Run the "Create/Update Profile" request.');
            console.log('Then try "Get Alumni of the Day" again.');
            console.log('------------------------------------------------');
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkWinner();
