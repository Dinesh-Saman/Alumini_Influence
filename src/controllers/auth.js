const crypto = require('crypto');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '30d',
    });
};

/**
 * Validate password strength:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character
 */
const validatePasswordStrength = (password) => {
    if (password.length < 8) {
        return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
        return 'Password must contain at least one uppercase letter';
    }
    if (!/[0-9]/.test(password)) {
        return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        return 'Password must contain at least one special character';
    }
    return null; // valid
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide an email and password' });
        }

        // Validate email domain (must be a university email)
        // Accepts .ac.uk (UK universities) or .edu (US universities) domains
        const emailLower = email.toLowerCase();
        if (!emailLower.endsWith('.ac.uk') && !emailLower.endsWith('.edu')) {
            return res.status(400).json({
                success: false,
                message: 'Please use a valid university email address (e.g. .ac.uk or .edu domain)',
            });
        }

        // Validate password strength
        const passwordError = validatePasswordStrength(password);
        if (passwordError) {
            return res.status(400).json({ success: false, message: passwordError });
        }

        // Check if user exists
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Create user
        const user = await User.create({
            email,
            password,
        });

        // Get verification token
        const verificationToken = user.getVerificationToken();
        await user.save({ validateBeforeSave: false });

        // Create verification URL
        const verificationUrl = `${req.protocol}://${req.get(
            'host'
        )}/api/auth/verifyemail/${verificationToken}`;

        console.log(`--- Email Verification for ${user.email} ---`);
        console.log(`URL: ${verificationUrl}`);
        console.log('--------------------------------------------');

        const message = `Welcome to the Alumni Influencers Platform!\n\nPlease verify your email by clicking the link below:\n\n ${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you did not register, please ignore this email.`;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Email Verification — Alumni Influencers Platform',
                message,
            });

            res.status(200).json({
                success: true,
                message: 'Registration successful. Please check your email to verify your account.',
            });
        } catch (error) {
            user.verificationToken = undefined;
            user.verificationTokenExpire = undefined;
            await user.save({ validateBeforeSave: false });

            return res.status(500).json({ success: false, message: 'Email could not be sent. Please try again.' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate email & password
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide an email and password' });
        }

        // Check for user
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Check if password matches
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Check if verified
        if (!user.isVerified) {
            return res.status(401).json({ success: false, message: 'Please verify your email before logging in' });
        }

        await sendTokenResponse(user, 200, req, res);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Verify email
// @route   GET /api/auth/verifyemail/:token
// @access  Public
exports.verifyEmail = async (req, res) => {
    try {
        const verificationToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        const user = await User.findOne({
            verificationToken,
            verificationTokenExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
        }

        // Mark as verified and clear token (single-use)
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpire = undefined;

        await user.save();

        res.status(200).json({ success: true, message: 'Email verified successfully. You can now log in.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });

        if (!user) {
            return res.status(404).json({ success: false, message: 'There is no user with that email' });
        }

        // Get reset token
        const resetToken = user.getResetPasswordToken();

        await user.save({ validateBeforeSave: false });

        // Create reset URL
        const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/resetpassword/${resetToken}`;

        console.log(`--- Password Reset for ${user.email} ---`);
        console.log(`URL: ${resetUrl}`);
        console.log('-----------------------------------------');

        const message = `You are receiving this email because a password reset was requested for your account.\n\nTo reset your password, make a PUT request to:\n\n ${resetUrl}\n\nThis link will expire in 10 minutes.\n\nIf you did not request this, please ignore this email and your password will remain unchanged.`;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Password Reset Request — Alumni Influencers Platform',
                message,
            });

            res.status(200).json({ success: true, data: 'Password reset email sent' });
        } catch (err) {
            console.error(err);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;

            await user.save({ validateBeforeSave: false });

            return res.status(500).json({ success: false, message: 'Email could not be sent' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Reset Password
// @route   PUT /api/auth/resetpassword/:token
// @access  Public
exports.resetPassword = async (req, res) => {
    try {
        // Get hashed token
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
        }

        // Validate new password strength
        const passwordError = validatePasswordStrength(req.body.password);
        if (passwordError) {
            return res.status(400).json({ success: false, message: passwordError });
        }

        // Set new password and clear token (single-use)
        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        await sendTokenResponse(user, 200, req, res);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Logout user / clear cookie
// @route   GET /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
    });
    res.status(200).json({ success: true, message: 'Logged out successfully' });
};


// Helper function to get token from model, create cookie and send response
const sendTokenResponse = async (user, statusCode, req, res) => {
    // Create token
    const token = generateToken(user._id);

    // Record login timestamp and details
    user.loginHistory.push({
        timestamp: new Date(),
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });

    await user.save({ validateBeforeSave: false });

    console.log(`--- New Login Token for ${user.email} ---`);
    console.log(token);
    console.log('-----------------------------------------');

    const options = {
        expires: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
        ),
        httpOnly: true,
    };

    if (process.env.NODE_ENV === 'production') {
        options.secure = true;
    }

    res.status(statusCode).cookie('token', token, options).json({
        success: true,
        token,
    });
};
