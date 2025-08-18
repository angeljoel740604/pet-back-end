const { authenticate } = require('@magaya/extension-check-updates');

const express = require('express');
require('express-async-errors');

const router = express.Router();
const userService = require('../user-settings/user-settings.service');
const globalContext = require('../global-context');

const {
    validateFilerCode,
    validateSoapCredentialsEntry,
    validateUserSaveEntry,
    validate,
} = require('../user-settings/user-settings.validator');
const logger = require('../logger');

router.get('/users-magaya-data', authenticate, async (request, response) => {
    const { hyperion } = globalContext.getContext();
    const data = await userService(hyperion).getMagayaData();
    response.send(data);
});


router.get('/', authenticate, async (request, response) => {
    const { hyperion } = globalContext.getContext();

    const filers = await userService(hyperion).getUserFilersSettings();
    response.send(filers);
});

router.post(
    '/save-soap-credentials',
    authenticate,
    validateSoapCredentialsEntry(),
    validate,
    async (request, response) => {
        const { hyperion } = globalContext.getContext();

        const { userApi, passwordApi } = request.body;
        const result = await userService(hyperion).saveSoapCredentials(userApi, passwordApi);
        if (result && result.status === 400) {
            response.status(400).json({ message: result.message });
            logger.error(result.message);
        } else if (result) {
            response.json(result);
        } else {
            response.status(400).json({ message: result.message });
            logger.error(result.message);
        }
    },
);

module.exports = router;
