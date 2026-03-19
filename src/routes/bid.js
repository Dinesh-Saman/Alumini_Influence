const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validate, placeBidSchema } = require('../middleware/validate');
const {
    placeBid,
    getBidStatus,
    getBidHistory,
} = require('../controllers/bid');

// All bid routes require authentication
router.use(protect);

// Place a new bid or update existing bid (increase only)
router.post('/', validate(placeBidSchema), placeBid);

// Get current bid status + remaining slots for this month
router.get('/status', getBidStatus);

// Full bid history for the logged-in user
router.get('/history', getBidHistory);

module.exports = router;
