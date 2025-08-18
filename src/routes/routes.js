const express = require('express');
require('express-async-errors');

const router = express.Router();
const userSettingsRouter = require('./user-settings.routes');
const createdShipmentRouter = require('./created-shipment.routes');


router.use('/users', userSettingsRouter);
router.use('/created-shipment', createdShipmentRouter);

router.get('/ping', (req, res) => res.send('pong'));

module.exports = router;
