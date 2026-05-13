const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Profile = require('../models/Profile');
const Bid = require('../models/Bid');
const UsageLog = require('../models/UsageLog');

// Middleware to check if user is logged in
const ensureAuthenticated = (req, res, next) => {
    if (req.session && req.session.adminId) {
        return next();
    }
    res.redirect('/login');
};

const redirectIfAuthenticated = (req, res, next) => {
    if (req.session && req.session.adminId) {
        return res.redirect('/dashboard');
    }
    next();
};

// Route: Home -> Redirect to Dashboard if logged in, else login
router.get('/', (req, res) => {
    if (req.session && req.session.adminId) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

// Route: Login Page
router.get('/login', redirectIfAuthenticated, (req, res) => {
    res.render('login', { title: 'Login', error: null });
});

// Route: Register Page
router.get('/register', redirectIfAuthenticated, (req, res) => {
    res.render('register', { title: 'Register', error: null, success: null });
});

// Route: Forgot Password Page
router.get('/forgot-password', redirectIfAuthenticated, (req, res) => {
    res.render('forgot-password', { title: 'Forgot Password', error: null, success: null });
});

// Route: Reset Password Page
router.get('/reset-password/:token', redirectIfAuthenticated, (req, res) => {
    res.render('reset-password', { title: 'Reset Password', token: req.params.token, error: null });
});

// Route: Dashboard
router.get('/dashboard', ensureAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.adminId);
        
        // Calculate targetDate (tomorrow at midnight) - matches the bidding logic
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 1);
        targetDate.setHours(0, 0, 0, 0);

        // Fetch real stats
        const totalAlumni = await Profile.countDocuments();
        
        // Find top bids for THE UPCOMING SLOT (Tomorrow)
        const topBids = await Bid.find({ status: 'active', targetDate })
            .sort({ amount: -1 })
            .limit(5)
            .populate('user', 'email');
        
        // Highest Bid for the target auction
        const highestBid = topBids.length > 0 ? topBids[0].amount : 0;
        const activeBidsCount = await Bid.countDocuments({ status: 'active', targetDate });
        
        // Latest Usage Logs
        const latestLogs = await UsageLog.find().sort({ timestamp: -1 }).limit(5);

        res.render('dashboard', { 
            title: 'Dashboard', 
            user,
            targetDate, // Pass this to show on the UI
            stats: {
                totalAlumni,
                activeBids: activeBidsCount,
                highestBid
            },
            topBids: topBids || [],
            latestLogs
        });
    } catch (error) {
        console.error('Dashboard Load Error:', error);
        res.render('dashboard', { 
            title: 'Dashboard', 
            user: null, 
            stats: { 
                totalAlumni: 0, 
                activeBids: 0, 
                highestBid: 0 
            }, 
            topBids: [], 
            latestLogs: [], 
            error: 'Failed to load dashboard data' 
        });
    }
});

// Route: Alumni Filters Page
router.get('/alumni', ensureAuthenticated, async (req, res) => {
    res.render('alumni', { title: 'View Alumni' });
});

// Route: Graphs Page
router.get('/graphs', ensureAuthenticated, async (req, res) => {
    res.render('graphs', { title: 'Analytics Graphs' });
});

// Route: API Key Management
router.get('/apikeys', ensureAuthenticated, async (req, res) => {
    res.render('apikeys', { title: 'API Key Management' });
});

// Route: Usage Statistics
router.get('/usage', ensureAuthenticated, async (req, res) => {
    try {
        const UsageLog = require('../models/UsageLog');
        // Last 200 logs, populated with user email
        const logs = await UsageLog.find()
            .sort({ timestamp: -1 })
            .limit(200)
            .populate('user', 'email');

        // Top endpoints by count
        const endpointCounts = {};
        logs.forEach(l => {
            const key = `${l.method} ${l.endpoint}`;
            endpointCounts[key] = (endpointCounts[key] || 0) + 1;
        });
        const topEndpoints = Object.entries(endpointCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([endpoint, count]) => ({ endpoint, count }));

        // Auth type breakdown
        const jwtCount = logs.filter(l => l.authType === 'JWT').length;
        const apiKeyCount = logs.filter(l => l.authType === 'API_KEY').length;

        // Login history across all users
        const users = await User.find().select('email loginHistory').sort({ 'loginHistory.timestamp': -1 });

        res.render('usage', { 
            title: 'Usage Statistics',
            logs,
            topEndpoints,
            jwtCount,
            apiKeyCount,
            users
        });
    } catch(err) {
        console.error(err);
        res.render('usage', { title: 'Usage Statistics', logs: [], topEndpoints: [], jwtCount: 0, apiKeyCount: 0, users: [] });
    }
});

// POST handling for session login is usually separate but let's do a simple one here for dashboard login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.render('login', { title: 'Login', error: 'Please enter all fields' });
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.render('login', { title: 'Login', error: 'Invalid credentials' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.render('login', { title: 'Login', error: 'Invalid credentials' });
        }

        if (!user.isVerified) {
            return res.render('login', { title: 'Login', error: 'Please verify your email first' });
        }

        if (user.role !== 'admin') {
            return res.render('login', { title: 'Login', error: 'Access denied. Admin only.' });
        }

        // Set session
        req.session.adminId = user._id;
        res.redirect('/dashboard');
    } catch (err) {
        res.render('login', { title: 'Login', error: 'Server error' });
    }
});

// Route: Logout
router.get('/logout', (req, res) => {
    delete req.session.adminId;
    res.redirect('/login');
});

module.exports = router;
