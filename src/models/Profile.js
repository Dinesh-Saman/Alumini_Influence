const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true, // One profile per user
    },
    firstName: {
        type: String,
        required: [true, 'Please add a first name'],
    },
    lastName: {
        type: String,
        required: [true, 'Please add a last name'],
    },
    bio: {
        type: String,
        maxlength: 500,
    },
    linkedinUrl: {
        type: String,
        match: [
            /https:\/\/[a-z]{2,3}\.linkedin\.com\/.*$/,
            'Please use a valid LinkedIn URL',
        ],
    },
    profileImage: {
        type: String, // URL relative to server
        default: 'no-photo.jpg',
    },
    degrees: [
        {
            degreeTitle: { type: String, required: true },
            university: { type: String, required: true },
            completionDate: { type: Date },
            officialUrl: { type: String }, // URL to official university degree page
        },
    ],
    certifications: [
        {
            name: { type: String, required: true },
            issuingOrganization: { type: String, required: true },
            completionDate: { type: Date },
            credentialUrl: { type: String },
        },
    ],
    licences: [
        {
            name: { type: String, required: true },
            issuingBody: { type: String, required: true },
            completionDate: { type: Date },
            licenceUrl: { type: String },
        },
    ],
    professionalCourses: [
        {
            courseName: { type: String, required: true },
            provider: { type: String, required: true },
            completionDate: { type: Date },
            courseUrl: { type: String },
        },
    ],
    employmentHistory: [
        {
            company: { type: String, required: true },
            role: { type: String, required: true },
            startDate: { type: Date, required: true },
            endDate: { type: Date }, // null if current
            current: { type: Boolean, default: false },
        },
    ],
    // Fields for Bidding/Gamification
    appearanceCount: {
        type: Number,
        default: 0
    },
    lastAppearanceDate: {
        type: Date
    },
    // Grants the alumni a 4th bid slot in a calendar month if they attended a university event
    bonusSlotAvailable: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Profile', ProfileSchema);
