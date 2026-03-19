const Profile = require('../models/Profile');
const User = require('../models/User');

// @desc    Get current user's profile
// @route   GET /api/profile/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.user.id }).populate(
            'user',
            ['name', 'email']
        );

        if (!profile) {
            return res.status(400).json({ success: false, message: 'There is no profile for this user' });
        }

        res.status(200).json({ success: true, data: profile });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Create or update user profile
// @route   POST /api/profile
// @access  Private
exports.createProfile = async (req, res) => {
    const {
        firstName,
        lastName,
        bio,
        linkedinUrl,
        degrees,
        certifications,
        licences,
        professionalCourses,
        employmentHistory
    } = req.body;

    // Build profile object
    const profileFields = {};
    profileFields.user = req.user.id;
    if (firstName) profileFields.firstName = firstName;
    if (lastName) profileFields.lastName = lastName;
    if (bio) profileFields.bio = bio;
    if (linkedinUrl) profileFields.linkedinUrl = linkedinUrl;

    // Arrays - ensure they are parsed if coming from form-data or just assigned if JSON
    if (degrees) profileFields.degrees = degrees;
    if (certifications) profileFields.certifications = certifications;
    if (licences) profileFields.licences = licences;
    if (professionalCourses) profileFields.professionalCourses = professionalCourses;
    if (employmentHistory) profileFields.employmentHistory = employmentHistory;

    try {
        let profile = await Profile.findOne({ user: req.user.id });

        if (profile) {
            // Update
            profile = await Profile.findOneAndUpdate(
                { user: req.user.id },
                { $set: profileFields },
                { new: true }
            );

            return res.status(200).json({
                success: true,
                message: 'Profile updated successfully',
                data: profile
            });
        }

        // Create
        profile = new Profile(profileFields);

        await profile.save();
        res.status(201).json({
            success: true,
            message: 'Profile created successfully',
            data: profile
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get all profiles
// @route   GET /api/profile
// @access  Public
exports.getProfiles = async (req, res) => {
    try {
        const profiles = await Profile.find().populate('user', ['name', 'email']);
        res.json({ success: true, count: profiles.length, data: profiles });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get profile by user ID
// @route   GET /api/profile/user/:user_id
// @access  Public
exports.getProfileByUserId = async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.params.user_id }).populate('user', ['name', 'email']);

        if (!profile) return res.status(400).json({ msg: 'Profile not found' });

        res.json({ success: true, data: profile });
    } catch (err) {
        console.error(err.message);
        if (err.kind == 'ObjectId') {
            return res.status(400).json({ msg: 'Profile not found' });
        }
        res.status(500).send('Server Error');
    }
};

// @desc    Delete profile, user & posts
// @route   DELETE /api/profile
// @access  Private
exports.deleteProfile = async (req, res) => {
    try {
        // Remove profile
        await Profile.findOneAndDelete({ user: req.user.id });
        // Remove user
        await User.findOneAndDelete({ _id: req.user.id });

        res.json({ success: true, message: 'User deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Upload profile photo
// @route   PUT /api/profile/uploadphoto
// @access  Private
exports.uploadPhoto = async (req, res) => {
    // This is a placeholder for the logic handled by route+multer, 
    // usually we just update the profile field here if the file was uploaded
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    try {
        const profile = await Profile.findOne({ user: req.user.id });
        if (!profile) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }

        profile.profileImage = req.file.filename;
        await profile.save();

        res.status(200).json({
            success: true,
            data: req.file.filename
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
