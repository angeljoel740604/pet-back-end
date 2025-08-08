const axios = require('axios');
const globalContext = require('../global-context');
const BadRequestException = require('../exceptions/bad-request.exception');
const Exception = require('../exceptions/exception');
const logger = require('../logger');

module.exports = () => {
    function doRequest(apiEndpoint, httpMethod, headers = {}, params, body, baseUrl = '') {
        const token = globalContext.getContext().apiToken;
        const host = baseUrl || process.env.APP_URL;
        return axios({
            method: httpMethod,
            url: `${host}/api/${apiEndpoint}`,
            params,
            data: body,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                ...headers,
            },
        })
            .then((response) => response.data)
            .catch((error) => {
                logger.error(error);
                const message = error.response
                    ? error.response.data || error.response.statusText
                    : error.message;
                if (error.response && error.response.status && error.response.status === 400) {
                    console.log('CS request message: ', message);
                    throw new BadRequestException(message || 'Bad Request');
                }
                if (
                    error.response &&
                    error.response.status &&
                    (error.response.status === 401 || error.response.status === 403)
                ) {
                    console.log('CS request message: ', message);
                    throw new Exception(message || 'Forbidden request', error.response.status);
                }

                console.log('CS request message: ', message);
                throw new Exception(message || 'Internal Server Error');
            });
    }

    function doPost(apiEndpoint, data, headers = {}, baseUrl = '') {
        return doRequest(apiEndpoint, 'POST', headers, null, data, baseUrl);
    }

    async function doGet(apiEndpoint, params = {}, headers = {}, baseUrl = '') {
        return doRequest(apiEndpoint, 'GET', headers, params, null, baseUrl);
    }

    async function doDelete(apiEndpoint, params = {}, headers = {}, baseUrl) {
        return doRequest(apiEndpoint, 'DELETE', headers, params, null, baseUrl);
    }

    return { doGet, doPost, doDelete };
};
