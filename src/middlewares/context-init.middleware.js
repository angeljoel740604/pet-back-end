const globalContext = require('../global-context');
const logger = require('../logger');

const contextInitMiddleware = async (request, res, next) => {
    try {
        const token = await request.api.getAccessToken();
        //const token = '1223';
        globalContext.initContext(
            { dbx: request.dbx, dbw: request.dbw, algorithm: request.algorithm },
            token,
        );
        next();
    } catch (e) {
        logger.error(`Invalid Api key: ${e.stack}`);
        res.status(401).send('Invalid Api key');
    }
};

module.exports = contextInitMiddleware;
