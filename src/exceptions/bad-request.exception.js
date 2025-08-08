const Exception = require('./exception');

class BadRequestException extends Exception {
    constructor(message) {
        super(message);
        this.statusCode = 400;
    }

    getStatusCode() {
        return this.statusCode;
    }
}

module.exports = BadRequestException;
