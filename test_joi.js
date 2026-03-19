const Joi = require('joi');

const profileSchema = Joi.object({
    linkedinUrl: Joi.string()
        .uri({ scheme: ['http', 'https'] })
        .pattern(/https?:\/\/(www\.)?linkedin\.com\/.*$/)
        .allow('', null)
        .messages({
            'string.uri': 'LinkedIn URL must be a valid URI starting with http or https',
            'string.pattern.base': 'LinkedIn URL must be a valid LinkedIn link (e.g. https://www.linkedin.com/in/username)'
        }),
    degrees: Joi.array().items(Joi.object({
        degreeTitle: Joi.string().required(),
        university: Joi.string().required(),
        officialUrl: Joi.string().uri({ scheme: ['http', 'https'] }).allow('', null).messages({
            'string.uri': 'Official URL must be a valid URI starting with http or https'
        })
    }))
});

const testData = {
    linkedinUrl: "https://www.linkedin.com/in/johnsmith", // Correct
    degrees: [{
        degreeTitle: "BS",
        university: "Westminster",
        officialUrl: "h://eastminster.ac.uk/courses/computer-science" // Incorrect
    }]
};

const { error } = profileSchema.validate(testData, { abortEarly: false });

if (error) {
    console.log("Validation Failed:");
    error.details.forEach(detail => console.log("- " + detail.message));
} else {
    console.log("Validation Succeeded!");
}
