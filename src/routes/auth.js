const express = require('express');
const {
    register,
    login,
    verifyEmail,
    forgotPassword,
    resetPassword,
    logout,
} = require('../controllers/auth');
const { protect } = require('../middleware/auth');
const { validate, registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require('../middleware/validate');

const router = express.Router();

// Registration — validates email domain (server-side) and password strength
router.post('/register', validate(registerSchema), register);

// Login
router.post('/login', validate(loginSchema), login);

// Logout (requires authentication)
router.get('/logout', protect, logout);

// Email verification via secure token in link
router.get('/verifyemail/:token', verifyEmail);

// Forgot password — sends reset email
router.post('/forgotpassword', validate(forgotPasswordSchema), forgotPassword);

// Reset password using the token from the email
router.put('/resetpassword/:token', validate(resetPasswordSchema), resetPassword);

module.exports = router;
