const { authenticate } = require('@magaya/extension-check-updates');

const express = require('express');
const { soapInvoiceStrategy, soapChargesStrategy } = require('../invoices/strategies');
const invoicesService = require('../invoices/invoices.service');
const paymentEditCreate = require('../invoices/payment.create');
require('express-async-errors');
const globalContext = require('../global-context');

const router = express.Router();
const logger = require('../logger');

router.post('/insert-invoice', authenticate, async (request, response) => {
    try {
        const { hyperion } = globalContext.getContext();

        const { apiCredentials, jsonInvoice } = request.body;
        const strategy = soapInvoiceStrategy(apiCredentials);
        const result = await invoicesService(strategy, hyperion).insertInvoice(jsonInvoice);
        if (result) {
            response.json(result);
        } else {
            response.status(400).json({ message: result.message });
            logger.error(result.message);
        }
    } catch (exc) {
        if (exc.status) {
            response.status(exc.status).json({ error: exc.message });
            logger.error(exc.message);
        } else {
            response.status(500).json({ error: exc.message || 'Internal Server Error' });
            logger.error(exc.message || 'Internal Server Error');
        }
    }
});

router.post('/send-payment/:id', authenticate, async (request, response) => {
    const { hyperion } = globalContext.getContext();

    const guid = request.params.id;
    const type = 'Payment';
    try {
        const { payment, paymentTransaction, actionType } = await invoicesService(
            {},
            hyperion,
        ).retrievePayment(guid, type);
        const result = await paymentEditCreate().paymentCreate(
                payment,
                paymentTransaction,
                type,
                actionType,
            );
            response.json(result);
        
    } catch (error) {
        logger.error(error);
    }
});

router.post('/send-check/:id', authenticate, async (request, response) => {
    const { hyperion } = globalContext.getContext();

    try {
        const guid = request.params.id;
        const type = 'Check';
        const { payment, paymentTransaction, actionType } = await invoicesService(
            {},
            hyperion,
        ).retrievePayment(guid, type);

        const result = await paymentEditCreate().paymentCreate(payment, paymentTransaction, type, actionType);
        response.json(result);
    } catch (error) {
        logger.error(error);
    }
});

router.get('/test-api-invoice', authenticate, async (request, response) => {
    const { hyperion } = globalContext.getContext();

    const result = await invoicesService({}, hyperion).testAPI(request.body);
    if (result) {
        response.json(result);
    } else {
        response.status(400).json({ message: result.message });
        logger.error(result.message);
    }
});

// Charges
router.post('/insert-charges', authenticate, async (request, response) => {
    try {
        const { hyperion } = globalContext.getContext();

        const { apiCredentials, jsonCharges } = request.body;
        const strategy = soapChargesStrategy(apiCredentials);
        const result = await invoicesService(strategy, hyperion).insertCharges(jsonCharges);
        if (result) {
            response.json(result);

            await invoicesService(strategy, hyperion).notificationCharges(result);
        } else {
            response.status(400).json({ message: result.message });
            logger.error(result.message);
        }
    } catch (exc) {
        if (exc.status) {
            response.status(exc.status).json({ error: exc.message });
            logger.error(exc.message);
        } else {
            response.status(500).json({ error: exc.message || 'Internal Server Error' });
            logger.error(exc.message || 'Internal Server Error');
        }
    }
});

router.get('/get-accounting-transactions-pending', authenticate, async (request, response) => {
    try {
        const { hyperion } = globalContext.getContext();

        const result = await invoicesService({}, hyperion).getAccountingPending(request.query);
        if (result) {
            response.json(result);
        } else {
            logger.error('No result');
        }
    } catch (error) {
        logger.error(error);
    }
});

router.post('/update-referen-id', authenticate, async (request, response) => {
    try {
        const { hyperion } = globalContext.getContext();
        const { jsonData, type } = request.body;
        const result = await invoicesService({}, hyperion).updateReferenId(jsonData, type);
        if (result) {
            response.json(result);
        } else {
            logger.error('No result');
        }
    } catch (error) {
        logger.error(error);
    }
});

router.post('/void-transaction', authenticate, async (request, response) => {
    try {
        const { hyperion } = globalContext.getContext();
        const { jsonVoid } = request.body;
        const result = await invoicesService({}, hyperion).voidAccountingTransaction(jsonVoid);
        if (result) {
            response.json(result);
        } else {
            logger.error('No result');
        }
    } catch (error) {
        logger.error(error);
    }
});

router.get('/get-transaction-by-number', authenticate, async (request, response) => {
    try {
        const { hyperion } = globalContext.getContext();

        const result = await invoicesService({}, hyperion).getTransactionByNumber(request.query);
        if (result) {
            response.json(result.GUID);
        } else {
            response.json('No found!');
        }
    } catch (error) {
        logger.error(error);
    }
});

module.exports = router;
