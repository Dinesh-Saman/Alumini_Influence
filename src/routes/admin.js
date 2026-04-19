const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const adminController = require('../controllers/admin');

// Note: Ensure that your protect middleware checks for req.user.role === 'admin' 
// or implement a sepreate requireAdmin middleware. For now using basic auth.

const { checkApiKey, requireScope } = require('../middleware/apiKey');

router.post('/apikeys', protect, adminController.generateApiKey);
router.get('/apikeys', protect, adminController.getApiKeys);
router.get('/apikeys/:id/stats', protect, adminController.getKeyStats);
router.delete('/apikeys/:id', protect, adminController.revokeApiKey);
router.put('/apikeys/:id/activate', protect, adminController.activateApiKey);
router.get('/logs', protect, adminController.getUsageLogs);

// Institutional Analytics Scoping: Supports both internal admins and authorized external dashboards
router.get('/metrics/charts', (req, res, next) => {
    // If request has Bearer token OR x-api-key, use API Key auth
    if (req.headers.authorization || req.headers['x-api-key']) {
        return checkApiKey(req, res, () => requireScope('read:analytics')(req, res, next));
    }
    // Otherwise fall back to Session/JWT protect for the internal Admin Panel
    protect(req, res, next);
}, adminController.getChartData);

router.get('/users/:id/logins', protect, adminController.getUserLoginHistory);
router.put('/users/:id/bonus', protect, adminController.toggleBonusSlot);

module.exports = router;
