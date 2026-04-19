const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const expressLayouts = require('express-ejs-layouts');
const mongoose = require('mongoose');

dotenv.config();

const connectDB = require('./src/config/db');

// Connect to Database
connectDB();

const app = express();

const { mongoSanitize, xssSanitize } = require('./src/middleware/sanitize');

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https://ui-avatars.com"],
            connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
        },
    },
}));
app.use(cors({
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies for HTML forms

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

// Serve static files (uploads and public folder)
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// EJS View Engine
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));
app.set('layout', 'layout'); // Set default layout

// Session Middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret1234',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        clientPromise: mongoose.connection.asPromise().then(m => m.getClient()),
        stringify: false,
    }),
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        maxAge: 86400000,
        httpOnly: true, // Prevents client-side JS from accessing the cookie (XSS Protection)
        sameSite: 'strict' // Robust CSRF protection: Cookie only sent for same-site requests
    }
}));

// Routes
const authRoutes = require('./src/routes/auth');
const profileRoutes = require('./src/routes/profile');
const bidRoutes = require('./src/routes/bid');
const adminRoutes = require('./src/routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/admin', adminRoutes);

// Public Client API (Protected by API Key)
// For "Get today's featured alumnus"
app.use('/api/client', require('./src/routes/client'));

// View Routes for Dashboard Client App
app.use('/', require('./src/routes/view'));

// Swagger Docs
const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req, res) => {
    res.send('Alumni Influencers API is running...');
});

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
