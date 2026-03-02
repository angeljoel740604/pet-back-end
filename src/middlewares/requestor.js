module.exports = (request, response, next) => {
    request._magRequestor = {
        networkId: request.dbx.Company.NetworkID,
        target: request.headers.target || 'default',
        employee: request.headers['employee-guid'],
    };
    next();
};
