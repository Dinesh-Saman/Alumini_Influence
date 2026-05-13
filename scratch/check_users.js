const mongoose = require('mongoose');
const path = require('path');
const User = require('../src/models/User');
require('dotenv').config();

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({}, 'email role isVerified');
        console.log('Current Users:');
        console.log(JSON.stringify(users, null, 2));

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkUsers();
