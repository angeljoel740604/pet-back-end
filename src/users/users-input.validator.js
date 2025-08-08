const { body, param, validationResult } = require('express-validator');
const constants = require('./constants');

const validateEntity = (entity, entityName) => {
    const errorMessages = [];
    if (!entity) {
        errorMessages.push(`${entityName} is mandatory`);
    } else if (!entity.mapEntities || !entity.mapEntities.length) {
        errorMessages.push(`Map entities for ${entityName} is mandatory`);
    } else {
        const notExistsMapping = entity.mapEntities.filter((e) => constants.MAPPING_ENTITIES.indexOf(e) < 0);
        if (notExistsMapping.length) {
            errorMessages.push(`${entityName} Mapping Entities not allowed: ${notExistsMapping.join(',')}`);
        }
    }

    if (errorMessages.length) {
        throw new Error(errorMessages.join(','));
    }

    return true;
};

const validateFilerCode = (filerCode) => validateEntity(filerCode, 'FilerCode');

const validateUsername = (username) => validateEntity(username, 'Username');

const validatePassword = (password) => validateEntity(password, 'Password');

const validateInputUsers = () => {
    return [body('filerCode').custom(validateFilerCode), body('username').custom(validateUsername), body('password').custom(validatePassword)];
};

const validateUsers = (req, res, next) => {
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
    validateInputUsers,
    validateUsers,
};
