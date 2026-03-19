const express = require('express');
const router = express.Router();
const { checkApiKey } = require('../middleware/apiKey');
const Profile = require('../models/Profile');
const Bid = require('../models/Bid');

// @desc    Get Alumni Influencer of the Day (for AR Client)
// @route   GET /api/client/alumni-of-the-day
// @access  Public API (requires valid x-api-key header)
router.get('/alumni-of-the-day', checkApiKey, async (req, res) => {
    try {
        // Find the winning bid for TODAY
        // The cron at 6 PM yesterday selected the winner for today's slot.
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const winningBid = await Bid.findOne({
            targetDate: today,
            status: 'won',
        }).populate('user', 'email');

        if (!winningBid) {
            return res.status(404).json({
                success: false,
                message: 'No Alumni of the Day has been selected for today',
            });
        }

        // Fetch the full profile for the winning user
        const profile = await Profile.findOne({ user: winningBid.user._id });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'The winning alumni does not have a profile set up',
            });
        }

        // Build the full profile image URL (prepend server base URL)
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const profileImageUrl = profile.profileImage && profile.profileImage !== 'no-photo.jpg'
            ? `${baseUrl}/uploads/${profile.profileImage}`
            : null;

        res.status(200).json({
            success: true,
            data: {
                // Personal Info
                name: `${profile.firstName} ${profile.lastName}`,
                bio: profile.bio,
                profileImage: profileImageUrl,
                linkedinUrl: profile.linkedinUrl,

                // Academic & Professional Credentials
                degrees: profile.degrees,
                certifications: profile.certifications,
                licences: profile.licences,
                professionalCourses: profile.professionalCourses,
                employmentHistory: profile.employmentHistory,

                // Metadata
                appearanceCount: profile.appearanceCount,
            },
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;
