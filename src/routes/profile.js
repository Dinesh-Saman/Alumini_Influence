const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    getMe,
    createProfile,
    getProfiles,
    getProfileByUserId,
    deleteProfile,
    uploadPhoto
} = require('../controllers/profile');
const { validate, profileSchema } = require('../middleware/validate');

const upload = require('../middleware/upload');

const { checkApiKey, requireScope, authorizePlatform } = require('../middleware/apiKey');

router.get('/me', protect, getMe);
router.post('/', protect, validate(profileSchema), createProfile);

// Enforce Scoping for Client Platforms (e.g. AR App) while allowing Dashboard access
router.get('/', authorizePlatform('read:alumni'), getProfiles);
router.get('/user/:user_id', authorizePlatform('read:alumni'), getProfileByUserId);

router.delete('/', protect, deleteProfile);
router.put('/uploadphoto', protect, upload.single('file'), uploadPhoto); // 'file' is the form key

module.exports = router;
