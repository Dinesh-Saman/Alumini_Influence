const Joi = require('joi');

const schema = Joi.string().uri({ domain: { minDomainSegments: 2 }, scheme: ['http', 'https'] });

const result = schema.validate("h://test.com");

if (result.error) {
    console.log("Error Code:", result.error.details[0].type);
    console.log("Message:", result.error.details[0].message);
}
