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

const multer = require('multer');
const path = require('path');

// Multer config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 1000000 }, // 1MB
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
});

function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

router.get('/me', protect, getMe);
router.post('/', protect, validate(profileSchema), createProfile);
router.get('/', getProfiles);
router.get('/user/:user_id', getProfileByUserId);
router.delete('/', protect, deleteProfile);
router.put('/uploadphoto', protect, upload.single('file'), uploadPhoto); // 'file' is the form key

module.exports = router;
