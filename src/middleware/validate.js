const Joi = require('joi');

/**
 * Reusable Joi validation middleware factory.
 * Pass in a Joi schema; the middleware validates req.body against it.
 * On failure it responds with 400 and the Joi error message.
 * On success it strips unknown fields (for safety) and calls next().
 *
 * @param {Joi.Schema} schema - The Joi schema to validate against
 * @returns {Function} Express middleware
 */
const validate = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
        abortEarly: false,    // collect all errors, not just the first
        allowUnknown: false,  // reject unknown fields
        stripUnknown: true,   // remove extra fields before passing to controller
    });

    if (error) {
        const errors = error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message.replace(/"/g, ''),
        }));

        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors,
        });
    }

    req.body = value; // use the sanitized value
    next();
};

// ─────────────────────────────────────────────
// Auth Schemas
// ─────────────────────────────────────────────

/**
 * Password must be at least 8 chars, contain one uppercase,
 * one number, and one special character.
 */
const passwordSchema = Joi.string()
    .min(8)
    .pattern(/[A-Z]/, 'uppercase letter')
    .pattern(/[0-9]/, 'number')
    .pattern(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'special character')
    .required()
    .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.name': 'Password must contain at least one {#name}',
        'any.required': 'Password is required',
    });

const registerSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
    }),
    password: passwordSchema,
});

const registerAdminSchema = Joi.object({
    email: Joi.string().email().required(),
    password: passwordSchema,
    adminSecret: Joi.string().required()
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
    }),
});

const resetPasswordSchema = Joi.object({
    password: passwordSchema,
});

// Bid Schemas

const placeBidSchema = Joi.object({
    amount: Joi.number().positive().required().messages({
        'number.base': 'Bid amount must be a number',
        'number.positive': 'Bid amount must be a positive number',
        'any.required': 'Bid amount is required',
    }),
});

// Profile Schema

const commonUrlMessages = {
    'string.uri': '{#label} must be a valid URL',
    'string.uriCustomScheme': '{#label} must start with http or https',
    'string.uriRelativeOnly': '{#label} cannot be a relative path',
};

const profileSchema = Joi.object({
    firstName: Joi.string().trim().required().label('First Name'),
    lastName: Joi.string().trim().required().label('Last Name'),
    bio: Joi.string().max(500).label('Bio'),
    linkedinUrl: Joi.string()
        .uri({ scheme: ['http', 'https'] })
        .pattern(/https?:\/\/(www\.)?linkedin\.com\/.*$/)
        .allow('', null)
        .label('LinkedIn URL')
        .messages({
            ...commonUrlMessages,
            'string.pattern.base': 'LinkedIn URL must be a valid LinkedIn link (e.g. https://www.linkedin.com/in/username)'
        }),
    degrees: Joi.array().items(Joi.object({
        degreeTitle: Joi.string().required().label('Degree Title'),
        university: Joi.string().required().label('University'),
        completionDate: Joi.date().label('Completion Date'),
        officialUrl: Joi.string()
            .uri({ scheme: ['http', 'https'] })
            .allow('', null)
            .label('Official Degree URL')
            .messages(commonUrlMessages)
    })).label('Degrees'),
    certifications: Joi.array().items(Joi.object({
        name: Joi.string().required().label('Certification Name'),
        issuingOrganization: Joi.string().required().label('Issuing Organization'),
        completionDate: Joi.date().label('Completion Date'),
        credentialUrl: Joi.string()
            .uri({ scheme: ['http', 'https'] })
            .allow('', null)
            .label('Credential URL')
            .messages(commonUrlMessages)
    })).label('Certifications'),
    licences: Joi.array().items(Joi.object({
        name: Joi.string().required().label('Licence Name'),
        issuingBody: Joi.string().required().label('Issuing Body'),
        completionDate: Joi.date().label('Completion Date'),
        licenceUrl: Joi.string()
            .uri({ scheme: ['http', 'https'] })
            .allow('', null)
            .label('Licence URL')
            .messages(commonUrlMessages)
    })).label('Licences'),
    professionalCourses: Joi.array().items(Joi.object({
        courseName: Joi.string().required().label('Course Name'),
        provider: Joi.string().required().label('Provider'),
        completionDate: Joi.date().label('Completion Date'),
        courseUrl: Joi.string()
            .uri({ scheme: ['http', 'https'] })
            .allow('', null)
            .label('Course URL')
            .messages(commonUrlMessages)
    })).label('Professional Courses'),
    employmentHistory: Joi.array().items(Joi.object({
        company: Joi.string().required().label('Company'),
        role: Joi.string().required().label('Role'),
        startDate: Joi.date().required().label('Start Date'),
        endDate: Joi.date().allow(null).label('End Date'),
        current: Joi.boolean().default(false).label('Currently Working Here')
    })).label('Employment History')
});

module.exports = {
    validate,
    registerSchema,
    registerAdminSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    placeBidSchema,
    profileSchema
};
