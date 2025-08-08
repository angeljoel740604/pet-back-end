const express = require('express');
require('express-async-errors');
const eventEmitter = require('../mgy-workflow/event.emitter');

const router = express.Router();
const logger = require('../logger');

router.post('/', async (request, response) => {
    try {
        const typeTrans = request.body && request.body.payload && request.body.payload.transactionType;
        const description = request.body && request.body.payload && request.body.payload.description;
        if ((typeTrans === 'Payment' || typeTrans === 'Check') && description !== 'Hyperion API') {
            // const isCustomField =
            //     request.body &&
            //     request.body.payload &&
            //     request.body.payload.details &&
            //     request.body.payload.details.custom_fields;
            // if (!isCustomField) {
            const eventName = `${request.body.type}${request.body.payload.transactionType}`;
            console.log(`Event Name: ${eventName} received`);
            eventEmitter.emit(eventName, request.body);
            response.send({ success: true });
            // }
        }
        response.status(200).send(true);
    } catch (e) {
        response.status(400).send('Bad Input Request');
        logger.error(e);
    }
});

module.exports = router;
