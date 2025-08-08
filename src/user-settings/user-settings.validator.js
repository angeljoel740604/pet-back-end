const { body, param, validationResult } = require('express-validator');

const validateUserSaveEntry = () => {
    return [
        body('user').exists(),
        // body('psw').exists(),
        body('filerCode').exists().isLength(3),
        body('used').isArray(),
    ];
};

const validateSoapCredentialsEntry = () => {
    return [body('userApi').exists()];
};

const validateFilerCode = () => {
    return [param('filerCode').isString().isLength(3)];
};

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next();
    }
    const extractedErrors = [];
    errors.array().map((err) => extractedErrors.push({ [err.param]: err.msg }));

    return res.status(400).json({
        errors: extractedErrors,
    });
};

module.exports = {
    validateFilerCode,
    validateUserSaveEntry,
    validateSoapCredentialsEntry,
    validate,
};
