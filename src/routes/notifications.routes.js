const express = require('express');
const { body, validationResult } = require('express-validator');

const logger = require('../logger');

const router = express.Router();

const notificationValidators = [
    body('id')
        .exists()
        .withMessage('id is required')
        .bail()
        .isString()
        .withMessage('id must be a string')
        .bail()
        .notEmpty()
        .withMessage('id cannot be empty'),
    body('processingTime')
        .exists()
        .withMessage('processingTime is required')
        .bail()
        .isInt({ min: 0 })
        .withMessage('processingTime must be a non-negative integer')
        .toInt(),
    body('success')
        .exists()
        .withMessage('success is required')
        .bail()
        .isBoolean()
        .withMessage('success must be a boolean value')
        .toBoolean(),
    body('error')
        .optional({ nullable: true })
        .isString()
        .withMessage('error must be a string'),
    body('result').exists().withMessage('result is required'),
];

router.post('/', notificationValidators, (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const notification = {
        id: req.body.id,
        processingTime: req.body.processingTime,
        success: req.body.success,
        error: req.body.error || '',
        result: req.body.result,
    };

    // Get connected clients count
    const connectedClients = req.io.sockets.sockets.size;

    // Broadcast notification to connected clients.
    req.io.sockets.emit('document_notification', notification);

    logger.info(`Document notification emitted for id ${notification.id}`, {
        connectedClients,
        success: notification.success,
        processingTime: notification.processingTime
    });

    if (connectedClients === 0) {
        logger.warn('⚠️ No Socket.IO clients connected - notification sent to void');
    }

    return res.status(202).json({
        received: true,
        connectedClients,
        notificationEmitted: true
    });
});

module.exports = router;
