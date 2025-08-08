const { createLogger, format, transports } = require('winston');

const { combine, timestamp, printf } = format;

const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        timestamp({
            format: 'YYYY-MM-DD hh:mm:ss.SSS A',
        }),
        printf((value) => `[${value.timestamp}] ${value.level}: ${value.message}`),
    ),
    transports: [
        new transports.File({ filename: 'error.log', level: 'error' }),
        new transports.File({ filename: 'combined.log' }),
        new transports.Console(),
    ],
});

module.exports = logger;
