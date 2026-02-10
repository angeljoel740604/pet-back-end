const express = require('express');
require('express-async-errors');

const globalContext = require('../global-context');

const shipmentService = require('../created-shipment/created-shipment.service');
const logger = require('../logger');

const router = express.Router();
const userSettingsRouter = require('./user-settings.routes');
const airManifestRouter = require('./air-manifest.routes');
const notificationsRouter = require('./notifications.routes');
//const createdShipmentRouter = require('./created-shipment.routes');

router.use('/users', userSettingsRouter);
router.use('/air-manifest', airManifestRouter);
router.use('/notifications', notificationsRouter);

//router.use('/create-shipment', createdShipmentRouter);

router.post('/create-shipment', async (request, response) => {
    try {
        const { hyperion } = globalContext.getContext();
        const { ApiCredentials, Payload, TransactionId } = request.body;
        const result = await shipmentService(ApiCredentials, hyperion).insertShipmentIsf(
            Payload,
            TransactionId,
        );
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

router.get('/ping', (req, res) => res.send('pong'));

// Document status update endpoint - Called by Azure Functions to notify status changes
router.post('/document-status-update', (req, res) => {
    const { id, status, confidence_score, error_message, filename } = req.body;

    logger.info(`Document status update received: ${id} - ${status}`);

    // Emit to all connected clients
    if (req.io) {
        req.io.sockets.emit('document:updated', {
            id,
            status,
            confidence_score,
            error_message,
            filename,
            updated_at: new Date().toISOString()
        });
        logger.info(`Document update emitted: ${id} - ${status}`);
    }

    res.json({ success: true, message: 'Status update broadcasted' });
});

// Document created endpoint - Called when a new document is uploaded
router.post('/document-created', (req, res) => {
    const { id, filename, status } = req.body;

    logger.info(`Document created notification: ${id} - ${filename}`);

    // Emit to all connected clients
    if (req.io) {
        req.io.sockets.emit('document:created', {
            id,
            filename,
            status: status || 'pending',
            created_at: new Date().toISOString()
        });
        logger.info(`Document created emitted: ${id}`);
    }

    res.json({ success: true, message: 'Document created broadcasted' });
});

module.exports = router;
