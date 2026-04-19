const ApiKey = require('../models/ApiKey');

// @desc    Generate a new API Key
// @route   POST /api/admin/apikeys
// @access  Private (Admin only)
exports.generateApiKey = async (req, res) => {
    try {
        const { name, permissions } = req.body;

        // Check for duplicate name
        const existingKey = await ApiKey.findOne({ name });
        if (existingKey) {
            return res.status(400).json({
                success: false,
                message: 'An API key with this name already exists. Please use a unique name (e.g. AR Client v2).'
            });
        }

        const key = ApiKey.generateKey();

        const apiKey = await ApiKey.create({
            name,
            key,
            permissions: permissions || []
        });

        res.status(201).json({ success: true, data: { name: apiKey.name, key: apiKey.key } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get all API Keys
// @route   GET /api/admin/apikeys
// @access  Private (Admin only)
exports.getApiKeys = async (req, res) => {
    try {
        const keys = await ApiKey.find().select('-usageStats'); // Exclude stats for list
        res.status(200).json({ success: true, data: keys });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get API Key Statistics
// @route   GET /api/admin/apikeys/:id/stats
// @access  Private (Admin only)
exports.getKeyStats = async (req, res) => {
    try {
        const key = await ApiKey.findById(req.params.id);
        if (!key) {
            return res.status(404).json({ success: false, message: 'Key not found' });
        }

        res.status(200).json({
            success: true,
            data: {
                name: key.name,
                usageCount: key.usageStats.length,
                usageStats: key.usageStats
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Revoke API Key
// @route   DELETE /api/admin/apikeys/:id
// @access  Private (Admin only)
exports.revokeApiKey = async (req, res) => {
    try {
        const key = await ApiKey.findById(req.params.id);
        if (!key) {
            return res.status(404).json({ success: false, message: 'Key not found' });
        }

        key.isActive = false;
        await key.save();

        res.status(200).json({ success: true, message: 'API Key revoked' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Activate API Key
// @route   PUT /api/admin/apikeys/:id/activate
// @access  Private (Admin only)
exports.activateApiKey = async (req, res) => {
    try {
        const key = await ApiKey.findById(req.params.id);
        if (!key) {
            return res.status(404).json({ success: false, message: 'Key not found' });
        }

        key.isActive = true;
        await key.save();

        res.status(200).json({ success: true, message: 'API Key reactivated' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
// @desc    Get all Usage Logs (Central Statistics)
// @route   GET /api/admin/logs
// @access  Private (Admin only)
exports.getUsageLogs = async (req, res) => {
    try {
        const UsageLog = require('../models/UsageLog');
        const logs = await UsageLog.find().sort({ timestamp: -1 }).limit(100);
        res.status(200).json({ success: true, count: logs.length, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get Login History for a specific user
// @route   GET /api/admin/users/:id/logins
// @access  Private (Admin only)
exports.getUserLoginHistory = async (req, res) => {
    try {
        const User = require('../models/User');
        const user = await User.findById(req.params.id).select('email loginHistory');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
// @desc    Toggle Bonus Slot for a user
// @route   PUT /api/admin/users/:id/bonus
// @access  Private (Admin only)
exports.toggleBonusSlot = async (req, res) => {
    try {
        const Profile = require('../models/Profile');
        const profile = await Profile.findOne({ user: req.params.id });

        if (!profile) {
            return res.status(404).json({ success: false, message: 'Profile not found for this user' });
        }

        const { available } = req.body;

        if (available === undefined) {
            return res.status(400).json({ success: false, message: 'Please provide availability status (true/false)' });
        }

        profile.bonusSlotAvailable = available;
        await profile.save();

        res.status(200).json({
            success: true,
            message: `Bonus slot ${available ? 'granted' : 'revoked'} for user.`,
            data: { bonusSlotAvailable: profile.bonusSlotAvailable }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
// @desc    Get Aggregated Chart Data for Dashboards
// @route   GET /api/admin/metrics/charts
// @access  Private (Admin only)
exports.getChartData = async (req, res) => {
    try {
        const Profile = require('../models/Profile');
        
        // 1. Skills Gap (Top Certifications with Degree Breakdown)
        const certs = await Profile.aggregate([
            { $unwind: "$certifications" },
            { 
                $group: { 
                    _id: "$certifications.name", 
                    count: { $sum: 1 },
                    // Get all degrees associated with these profiles
                    degrees: { $push: "$degrees.degreeTitle" }
                } 
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        // Post-process the degrees into counts
        const skillsData = certs.map(c => {
            const degreeCounts = {};
            // c.degrees is an array of arrays [[D1, D2], [D1]]
            c.degrees.forEach(degreeArr => {
                if (Array.isArray(degreeArr)) {
                    degreeArr.forEach(d => {
                        degreeCounts[d] = (degreeCounts[d] || 0) + 1;
                    });
                }
            });
            return {
                name: c._id,
                count: c.count,
                breakdown: degreeCounts
            };
        });

        // 2. Industry Placement Trends (Alumni per Graduation Year)
        const industryTrends = await Profile.aggregate([
            { $unwind: "$degrees" },
            { 
                $group: { 
                    _id: { $year: "$degrees.completionDate" }, 
                    count: { $sum: 1 } 
                } 
            },
            { $match: { "_id": { $ne: null } } }, // Filter out profiles with no dates
            { $sort: { "_id": 1 } },
            { $limit: 10 }
        ]);

        // 3. Career Pathways (Top Degree Titles with Role Breakdown)
        const pathways = await Profile.aggregate([
            { $unwind: "$degrees" },
            { 
                $group: { 
                    _id: "$degrees.degreeTitle", 
                    count: { $sum: 1 },
                    // Get roles for these profiles
                    roles: { $push: "$employmentHistory.role" }
                } 
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        const pathwaysData = pathways.map(p => {
            const roleCounts = {};
            p.roles.forEach(roleArr => {
                if (Array.isArray(roleArr)) {
                    // Just take the current/first role for clarity in breakdown
                    const currentRole = roleArr[0] || 'Not specified';
                    roleCounts[currentRole] = (roleCounts[currentRole] || 0) + 1;
                }
            });
            return {
                degree: p._id,
                count: p.count,
                breakdown: roleCounts
            };
        });

        // 4. Role Overview (New Career Pathways - Top Roles with Degree Breakdown)
        const rolesAggregate = await Profile.aggregate([
            { $unwind: "$employmentHistory" },
            { 
                $group: { 
                    _id: "$employmentHistory.role", 
                    count: { $sum: 1 },
                    degrees: { $push: "$degrees.degreeTitle" }
                } 
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        const rolesData = rolesAggregate.map(r => {
            const degreeCounts = {};
            r.degrees.forEach(degreeArr => {
                if (Array.isArray(degreeArr)) {
                    const primaryDegree = degreeArr[0] || 'Not specified';
                    degreeCounts[primaryDegree] = (degreeCounts[primaryDegree] || 0) + 1;
                }
            });
            return {
                role: r._id,
                count: r.count,
                breakdown: degreeCounts
            };
        });

        // 5. Employment Placement (Top Employers)
        const placementAggregate = await Profile.aggregate([
            { $unwind: "$employmentHistory" },
            { $match: { "employmentHistory.current": true } }, // Only look at current placements
            { 
                $group: { 
                    _id: "$employmentHistory.company", 
                    count: { $sum: 1 }
                } 
            },
            { $sort: { count: -1 } },
            { $limit: 8 }
        ]);

        // 6. Professional Courses Distribution (Top Courses with Degree/Role Breakdown)
        const coursesAggregate = await Profile.aggregate([
            { $unwind: "$professionalCourses" },
            { 
                $group: { 
                    _id: "$professionalCourses.courseName", 
                    count: { $sum: 1 },
                    degrees: { $push: "$degrees.degreeTitle" },
                    roles: { $push: "$employmentHistory.role" }
                } 
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        const coursesData = coursesAggregate.map(c => {
            const degreeCounts = {};
            const roleCounts = {};
            c.degrees.forEach(degreeArr => { if (Array.isArray(degreeArr)) { const d = degreeArr[0] || 'N/A'; degreeCounts[d] = (degreeCounts[d] || 0) + 1; } });
            c.roles.forEach(roleArr => { if (Array.isArray(roleArr)) { const r = roleArr[0] || 'N/A'; roleCounts[r] = (roleCounts[r] || 0) + 1; } });
            return { course: c._id, count: c.count, degreeBreakdown: degreeCounts, roleBreakdown: roleCounts };
        });

        // 7. Industry Competency Index (Radar Chart) - Mutually Exclusive Categorization
        const targetIndustries = ['Technology', 'Finance', 'Engineering', 'Business & Management'];
        const industryKeywords = {
            'Technology': ['software', 'developer', 'engineer', 'computer', 'tech', 'it', 'data', 'cyber', 'systems'],
            'Finance': ['bank', 'finance', 'investment', 'audit', 'accountant', 'tax', 'fintech'],
            'Engineering': ['civil', 'mechanical', 'electrical', 'construction', 'structural', 'manufacturing'],
            'Business & Management': ['business', 'management', 'administration', 'strategy', 'operations', 'consulting', 'hr', 'project manager', 'mba', 'leadership']
        };

        // Step 1: Categorize each profile into EXACTLY ONE industry
        const allProfiles = await Profile.find({ "employmentHistory.0.role": { $exists: true } });
        const categorizedProfiles = { 'Technology': [], 'Finance': [], 'Engineering': [], 'Business & Management': [], 'Other': [] };

        allProfiles.forEach(p => {
            const searchStr = [p.bio, p.degrees[0]?.degreeTitle, p.employmentHistory[0]?.role, p.employmentHistory[0]?.company].join(' ').toLowerCase();
            
            let bestIndustry = 'Other';
            let maxMatches = 0;

            targetIndustries.forEach(ind => {
                const matches = industryKeywords[ind].filter(kw => searchStr.includes(kw.toLowerCase())).length;
                if (matches > maxMatches) {
                    maxMatches = matches;
                    bestIndustry = ind;
                }
            });

            if (maxMatches > 0) {
                categorizedProfiles[bestIndustry].push(p);
            }
        });

        // Step 2: Calculate competency scores for the 3 target industries
        const competencyData = targetIndustries.map(industry => {
            const matchingProfiles = categorizedProfiles[industry];
            
            if (matchingProfiles.length > 0) {
                const avg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
                const scores = {
                    certs: avg(matchingProfiles.map(p => p.certifications.length)) * 20,
                    courses: avg(matchingProfiles.map(p => p.professionalCourses.length)) * 25,
                    licences: avg(matchingProfiles.map(p => p.licences.length)) * 50,
                    experience: avg(matchingProfiles.map(p => {
                        const start = p.employmentHistory[0]?.startDate;
                        return start ? (new Date().getFullYear() - new Date(start).getFullYear()) : 0;
                    })) * 10,
                    engagement: avg(matchingProfiles.map(p => p.appearanceCount)) * 15
                };
                return { industry, scores: [scores.certs, scores.courses, scores.licences, scores.experience, scores.engagement] };
            }
            return { industry, scores: [0, 0, 0, 0, 0] };
        });

        // 8. Professional Licences Distribution (By Name with Body Breakdown)
        const licencesAggregate = await Profile.aggregate([
            { $unwind: "$licences" },
            { 
                $group: { 
                    _id: "$licences.name", 
                    count: { $sum: 1 },
                    bodies: { $push: "$licences.issuingBody" }
                } 
            },
            { $sort: { count: -1 } },
            { $limit: 4 }
        ]);

        const licencesData = licencesAggregate.map(l => {
            const bodyCounts = {};
            l.bodies.forEach(body => {
                bodyCounts[body] = (bodyCounts[body] || 0) + 1;
            });
            return {
                name: l._id,
                count: l.count,
                breakdown: bodyCounts
            };
        });

        const totalProfiles = await Profile.countDocuments();

        res.status(200).json({
            success: true,
            data: {
                totalProfiles,
                skills: {
                    labels: skillsData.map(s => s.name),
                    values: skillsData.map(s => s.count),
                    breakdown: skillsData.map(s => s.breakdown)
                },
                industries: {
                    labels: industryTrends.map(t => t._id),
                    values: industryTrends.map(t => t.count)
                },
                pathways: {
                    labels: pathwaysData.map(p => p.degree),
                    values: pathwaysData.map(p => p.count),
                    breakdown: pathwaysData.map(p => p.breakdown)
                },
                roles: {
                    labels: rolesData.map(r => r.role),
                    values: rolesData.map(r => r.count),
                    breakdown: rolesData.map(r => r.breakdown)
                },
                courses: {
                    labels: coursesData.map(c => c.course),
                    values: coursesData.map(c => c.count),
                    degreeBreakdown: coursesData.map(c => c.degreeBreakdown),
                    roleBreakdown: coursesData.map(c => c.roleBreakdown)
                },
                placements: {
                    labels: placementAggregate.map(p => p._id),
                    values: placementAggregate.map(p => p.count)
                },
                competency: competencyData,
                licences: {
                    labels: licencesData.map(l => l.name),
                    values: licencesData.map(l => l.count),
                    breakdown: licencesData.map(l => l.breakdown)
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
