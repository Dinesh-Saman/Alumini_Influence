const express = require('express');
const router = express.Router();
const { protectUI } = require('../middleware/auth');
const Profile = require('../models/Profile');

// Public routes
router.get('/', (req, res) => {
    // If user is already logged in, they can go to dashboard
    let token = req.cookies && req.cookies.token;
    if (token && token !== 'none') {
        return res.redirect('/dashboard');
    }
    res.redirect('/login');
});

router.get('/login', (req, res) => {
    res.render('login', { title: 'Login' });
});

router.get('/register', (req, res) => {
    res.render('register', { title: 'Register' });
});

router.get('/logout', (req, res) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
    });
    res.redirect('/login');
});

// Protected UI routes
router.get('/dashboard', protectUI, async (req, res) => {
    res.render('dashboard', { title: 'Dashboard', path: '/dashboard' });
});

router.get('/graphs', protectUI, (req, res) => {
    res.render('graphs', { title: 'Analytics Graphs', path: '/graphs' });
});

router.get('/alumni-list', protectUI, async (req, res) => {
    res.render('alumni-list', { title: 'Alumni Directory', path: '/alumni-list' });
});

module.exports = router;
