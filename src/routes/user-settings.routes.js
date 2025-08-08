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

router.post('/', validateUserSaveEntry(), validate, async (request, response) => {
    const { hyperion } = globalContext.getContext();

    const resp = await userService(hyperion).saveUserSettings({
        user: request.body.user,
        used: request.body.used,
        psw: request.body.psw || '',
        filerCode: request.body.filerCode,
        subscribe: request.body.subscribe,
        lastAuthDate: request.body.lastAuthDate,
        importDocuments: request.body.importDocuments,
        contactInfo: request.body.contactInfo,
        zoneIds: request.body.zoneIds,
        convertWeight: request.body.convertWeight,
        divisionInfo: request.body.divisionInfo,
    });

    response.send(resp);
});

router.post('/save-accounting', authenticate, async (request, response) => {
    const { hyperion } = globalContext.getContext();

    const resp = await userService(hyperion).saveAccountingSettings({
        filerCode: request.body.filerCode,
        importTransactionsAccounting: request.body.importTransactionsAccounting,
        linkAccountingTransactiontoShipment: request.body.linkAccountingTransactiontoShipment,
        linkAccountingTransactiontoShipmentHouses: request.body.linkAccountingTransactiontoShipmentHouses,
        accountingTransactiontoOnlyCharges: request.body.accountingTransactiontoOnlyCharges,
        paymentTransaction: request.body.paymentTransaction,
        paymentChange: request.body.paymentChange,
        accountReceivable: request.body.accountReceivableInfo,
        accountPayable: request.body.accountPayableInfo,
    });

    response.send(resp);
});

router.get('/users-magaya-data', authenticate, async (request, response) => {
    const { hyperion } = globalContext.getContext();
    const data = await userService(hyperion).getMagayaData();
    response.send(data);
});

router.get('/:filerCode', authenticate, validateFilerCode(), validate, async (request, response) => {
    const filerDetails = await userService().getFilerDetails(request.params.filerCode);
    response.send(filerDetails);
});

router.delete('/:filerCode', authenticate, validateFilerCode(), validate, async (request, response) => {
    const { hyperion } = globalContext.getContext();

    const success = await userService(hyperion).removeFiler(request.params.filerCode);
    response.send(success);
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
