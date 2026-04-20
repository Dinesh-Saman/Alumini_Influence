const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Middleware to check if alumni is logged in
const ensureAlumniAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect('/portal/login');
};

const redirectIfAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return res.redirect('/portal/dashboard');
    }
    next();
};

// Route: Portal Home -> Redirect to Dashboard if logged in, else login
router.get('/', (req, res) => {
    if (req.session && req.session.userId) {
        res.redirect('/portal/dashboard');
    } else {
        res.redirect('/portal/login');
    }
});

// Route: Alumni Login Page
router.get('/login', redirectIfAuthenticated, (req, res) => {
    res.render('portal-login', { layout: 'portal-layout', title: 'Alumni Login', error: null });
});

// Route: Alumni Register Page
router.get('/register', redirectIfAuthenticated, (req, res) => {
    res.render('portal-register', { layout: 'portal-layout', title: 'Alumni Register', error: null, success: null });
});

// POST Login for Portal
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.render('portal-login', { layout: 'portal-layout', title: 'Alumni Login', error: 'Please enter all fields' });
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.render('portal-login', { layout: 'portal-layout', title: 'Alumni Login', error: 'Invalid credentials' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.render('portal-login', { layout: 'portal-layout', title: 'Alumni Login', error: 'Invalid credentials' });
        }

        if (!user.isVerified) {
            return res.render('portal-login', { layout: 'portal-layout', title: 'Alumni Login', error: 'Please verify your email first' });
        }

        // Set session
        req.session.userId = user._id;
        res.redirect('/portal/dashboard');
    } catch (err) {
        res.render('portal-login', { layout: 'portal-layout', title: 'Alumni Login', error: 'Server error' });
    }
});

// Route: Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/portal/login');
});

// Route: Forgot Password Page
router.get('/forgot-password', (req, res) => {
    res.render('portal-forgot-password', { layout: 'portal-layout', title: 'Forgot Password' });
});

// Route: Reset Password Page (token in URL)
router.get('/reset-password/:token', (req, res) => {
    res.render('portal-reset-password', { layout: 'portal-layout', title: 'Reset Password' });
});

const Profile = require('../models/Profile');

// The rest of the routes (dashboard, profile, bids) will be implemented next.
router.get('/dashboard', ensureAlumniAuthenticated, async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.session.userId });
        res.render('portal-dashboard', { layout: 'portal-layout', title: 'Alumni Dashboard', hasProfile: !!profile });
    } catch(err) {
        res.render('portal-dashboard', { layout: 'portal-layout', title: 'Alumni Dashboard', hasProfile: false });
    }
});

router.get('/profile', ensureAlumniAuthenticated, async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.session.userId }).populate('user', ['email']);
        res.render('portal-profile', { layout: 'portal-layout', title: 'My Profile', profile });
    } catch (err) {
        console.error(err);
        res.render('portal-profile', { layout: 'portal-layout', title: 'My Profile', profile: null });
    }
});

router.get('/bidding', ensureAlumniAuthenticated, async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.session.userId });
        res.render('portal-bidding', { layout: 'portal-layout', title: 'Featured Placement Bidding', profile });
    } catch (err) {
        res.redirect('/portal/dashboard');
    }
});

module.exports = router;

