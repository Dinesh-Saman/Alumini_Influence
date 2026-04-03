const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    getIndustryDistribution,
    getCertificationTrends,
    getSkillsGap,
    getCareerPathways,
    getGraduationStats
} = require('../controllers/analytics');

router.get('/industry-distribution', protect, getIndustryDistribution);
router.get('/certification-trends', protect, getCertificationTrends);
router.get('/skills-gap', protect, getSkillsGap);
router.get('/career-pathways', protect, getCareerPathways);
router.get('/graduation-stats', protect, getGraduationStats);

module.exports = router;
