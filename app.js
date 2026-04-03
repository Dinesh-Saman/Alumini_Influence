const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const cookieParser = require('cookie-parser');

dotenv.config();

const connectDB = require('./src/config/db');

// Connect to Database
connectDB();

const app = express();

const { mongoSanitize, xssSanitize } = require('./src/middleware/sanitize');

// Security Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Added for form data
app.use(cookieParser());

// Set View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Rate Limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: { success: false, message: 'Too many requests, please try again later.' }
});

// Stricter limiter for sensitive endpoints (Auth, Password Reset)
const sensitiveLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20, // Only 20 attempts per 15 mins
    message: { success: false, message: 'Too many login or reset attempts. Please wait 15 minutes.' }
});

app.use('/api', generalLimiter);
app.use('/api/auth', sensitiveLimiter);

// Data Sanitization
app.use(mongoSanitize); // Prevent NoSQL Injection
app.use(xssSanitize);   // Escape HTML tags

// Serve static files (css, js, uploads)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Routes
const authRoutes = require('./src/routes/auth');
const profileRoutes = require('./src/routes/profile');
const bidRoutes = require('./src/routes/bid');
const adminRoutes = require('./src/routes/admin');
const analyticsRoutes = require('./src/routes/analytics');

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);

// Public Client API (Protected by API Key)
// For "Get today's featured alumnus"
app.use('/api/client', require('./src/routes/client'));

// Swagger Docs
const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// UI Routes
const uiRoutes = require('./src/routes/ui');
app.use('/', uiRoutes);

// Custom Error Handling for Malformed JSON
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            success: false,
            message: 'Invalid JSON format in request body'
        });
    }
    next(err);
});

// General Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
});

module.exports = app;
