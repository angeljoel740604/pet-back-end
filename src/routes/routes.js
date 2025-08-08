const express = require('express');
require('express-async-errors');

const router = express.Router();
const entrySummmaryRouter = require('./entry-summary.routes');
const isfRouter = require('./isf.routes');
const amsRouter = require('./ams.routes');
const userSettingsRouter = require('./user-settings.routes');
const eventsRouter = require('./events.routes');
const invoicesRouter = require('./invoices.routes');
const workflowRouter = require('./mgy-workflow.routes');
const documentsRouter = require('./documents.routes');
const inbondRouter = require('./inbond.routes');
const inbondCargoRouter = require('./inbond-cargo.routes');
const e214Router = require('./e214.routes');
const entryCargoRouter = require('./entry-cargo.routes');
const createdShipmentRouter = require('./created-shipment.routes');

router.use('/entry-summary', entrySummmaryRouter);
router.use('/entry-cargo', entryCargoRouter);
router.use('/isf', isfRouter);
router.use('/ams', amsRouter);
router.use('/users', userSettingsRouter);
router.use('/events', eventsRouter);
router.use('/invoices', invoicesRouter);
router.use('/workflow', workflowRouter);
router.use('/documents', documentsRouter);
router.use('/inbond', inbondRouter);
router.use('/inbond-cargo', inbondCargoRouter);
router.use('/e214', e214Router);
router.use('/created-shipment', createdShipmentRouter);

router.get('/ping', (req, res) => res.send('pong'));

module.exports = router;
