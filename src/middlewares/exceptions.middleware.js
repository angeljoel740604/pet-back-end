const Exception = require('../exceptions/exception');
const logger = require('../logger');

const exceptionMiddleware = (err, req, res, next) => {
    if (err instanceof Exception) {
        res.status(err.getStatusCode()).json({
            message: err.message,
        });
    }
    // log error
    else {
        logger.error(`Internal Server Error: ${err.stack}`);
        res.status(500).send('Internal Server Error');
    }
};

module.exports = exceptionMiddleware;
