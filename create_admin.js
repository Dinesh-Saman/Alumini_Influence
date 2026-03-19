const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');

dotenv.config();

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected...');

        // Admin credentials — update these as needed
        const email = 'admin@eastminster.ac.uk';
        const password = 'Admin@Pass1234';

        // Check if admin already exists
        let user = await User.findOne({ email });

        if (user) {
            console.log('User already exists. Updating role to admin...');
            user.role = 'admin';
            user.password = password;
            user.isVerified = true;
            await user.save();
        } else {
            console.log('Creating new admin user...');
            user = await User.create({
                email,
                password,
                role: 'admin',
                isVerified: true,
            });
        }

        console.log('✅ Admin user ready!');
        console.log(`   Email:    ${email}`);
        console.log(`   Password: ${password}`);
        console.log('\nLogin via POST /api/auth/login');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creating admin:', err.message);
        process.exit(1);
    }
};

createAdmin();
