const Exception = require('./exception');

class NoEntityFoundException extends Exception {
    constructor(entityId, entityType) {
        super(`${entityType} with Id ${entityId} not found`);
        this.name = 'NoEntityFoundException';
        this.statusCode = 422;
    }

    getStatusCode() {
        return this.statusCode;
    }
}

module.exports = NoEntityFoundException;
