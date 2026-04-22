const mongoose = require('mongoose');
const Profile = require('../src/models/Profile');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alumni_dev')
    .then(async () => {
        console.log('Connected to DB');
        const profiles = await Profile.find().select('firstName profileImage');
        console.log('Profiles in DB:');
        console.table(profiles.map(p => ({
            name: p.firstName,
            image: p.profileImage
        })));
        mongoose.disconnect();
    })
    .catch(err => console.error(err));
