const Profile = require('../models/Profile');
const mongoose = require('mongoose');

// @desc    Get alumni count by industry sector
// @route   GET /api/analytics/industry-distribution
exports.getIndustryDistribution = async (req, res) => {
    try {
        const stats = await Profile.aggregate([
            {
                $group: {
                    _id: '$industrySector',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);
        res.status(200).json({ success: true, data: stats });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Get growth of certifications over time (Scenario 3)
// @route   GET /api/analytics/certification-trends
exports.getCertificationTrends = async (req, res) => {
    try {
        const stats = await Profile.aggregate([
            { $unwind: '$certifications' },
            {
                $group: {
                    _id: {
                        month: { $month: '$certifications.completionDate' },
                        year: { $year: '$certifications.completionDate' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);
        res.status(200).json({ success: true, data: stats });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Skills Gap: university degrees vs certifications (Scenario 1)
// @route   GET /api/analytics/skills-gap
exports.getSkillsGap = async (req, res) => {
    try {
        // Aggregate which degrees lead to which certifications most frequently
        const stats = await Profile.aggregate([
            { $unwind: '$degrees' },
            { $unwind: '$certifications' },
            {
                $group: {
                    _id: { degree: '$degrees.degreeTitle', cert: '$certifications.name' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 20 }
        ]);
        res.status(200).json({ success: true, data: stats });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Career Pathways: Degree programmes vs current roles (Scenario 2)
// @route   GET /api/analytics/career-pathways
exports.getCareerPathways = async (req, res) => {
    try {
        const stats = await Profile.aggregate([
            { $unwind: '$degrees' },
            { $unwind: '$employmentHistory' },
            { $match: { 'employmentHistory.current': true } },
            {
                $group: {
                    _id: { degree: '$degrees.degreeTitle', role: '$employmentHistory.role' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);
        res.status(200).json({ success: true, data: stats });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Alumni by graduation year
// @route   GET /api/analytics/graduation-stats
exports.getGraduationStats = async (req, res) => {
    try {
        const stats = await Profile.aggregate([
            {
                $group: {
                    _id: '$graduationYear',
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        res.status(200).json({ success: true, data: stats });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};
