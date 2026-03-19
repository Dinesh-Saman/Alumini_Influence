// Middleware to prevent NoSQL injection by stripping $ operator keys
const mongoSanitize = (req, res, next) => {
    const sanitize = (obj) => {
        if (obj instanceof Object) {
            for (let key in obj) {
                if (key.startsWith('$')) {
                    delete obj[key];
                } else if (obj[key] instanceof Object) {
                    sanitize(obj[key]);
                }
            }
        }
    };
    sanitize(req.body);
    sanitize(req.query);
    sanitize(req.params);
    next();
};

// Basic XSS protection by escaping < and > tags in body strings
const xssSanitize = (req, res, next) => {
    const sanitize = (obj) => {
        if (obj instanceof Object) {
            for (let key in obj) {
                if (typeof obj[key] === 'string') {
                    obj[key] = obj[key]
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');
                } else if (obj[key] instanceof Object) {
                    sanitize(obj[key]);
                }
            }
        }
    };
    sanitize(req.body);
    next();
};

module.exports = { mongoSanitize, xssSanitize };
