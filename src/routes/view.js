const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Profile = require('../models/Profile');
const Bid = require('../models/Bid');
const UsageLog = require('../models/UsageLog');

// Middleware to check if user is logged in
const ensureAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect('/login');
};

const redirectIfAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return res.redirect('/dashboard');
    }
    next();
};

// Route: Home -> Redirect to Dashboard if logged in, else login
router.get('/', (req, res) => {
    if (req.session && req.session.userId) {
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
        const user = await User.findById(req.session.userId);
        
        // Fetch real stats
        const totalAlumni = await Profile.countDocuments();
        
        // Find top bids (Live Ranking)
        const topBids = await Bid.find({ status: 'active' })
            .sort({ amount: -1 })
            .limit(5)
            .populate('user', 'email');
        
        // Highest Bid for the current auction (Active status)
        const highestBid = topBids.length > 0 ? topBids[0].amount : 0;
        const activeBidsCount = await Bid.countDocuments({ status: 'active' });
        
        // Latest Usage Logs
        const latestLogs = await UsageLog.find().sort({ timestamp: -1 }).limit(5);

        res.render('dashboard', { 
            title: 'Dashboard', 
            user,
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

        // Set session
        req.session.userId = user._id;
        res.redirect('/dashboard');
    } catch (err) {
        res.render('login', { title: 'Login', error: 'Server error' });
    }
});

// Route: Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

module.exports = router;
