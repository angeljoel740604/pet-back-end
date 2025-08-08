const { EventEmitter } = require('events');

const eventEmitter = new EventEmitter({ captureRejections: true });
module.exports = eventEmitter;
