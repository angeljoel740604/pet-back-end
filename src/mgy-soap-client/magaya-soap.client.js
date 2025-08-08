const soap = require('soap');
const axios = require('axios');
const globalContext = require('../global-context');
const logger = require('../logger');

const DEFAULT_WSDL = 'http://localhost:3691/CSSoapService?wsdl';

let csclient;
let sessionId;
const pause = 2000;

async function getSoapWsdl() {
    const {
        hyperion: { dbx },
    } = globalContext.getContext();
    const networkId = dbx.Company.NetworkID;
    const endpoint = `${process.env.magayaGateway}/connection/${networkId}?app=magaya-ai-document`;
    try {
        const result = await axios({
            url: endpoint,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const urlObj = new URL(result.data.local);
        return `${urlObj.protocol}//${urlObj.host}/CSSoapService?wsdl`;
    } catch (error) {
        logger.error(error);
        return DEFAULT_WSDL;
    }
}

function delay(millis) {
    return new Promise((resolve) => setTimeout(() => resolve(), millis));
}

async function initSoapClient(username, userPassword) {
    try {
        if (username && userPassword) {
            const wsdlUrl = await getSoapWsdl();
            csclient = await soap.createClientAsync(wsdlUrl);
            const res = await csclient.StartSessionAsync({
                user: username,
                pass: userPassword,
            });
            sessionId = res[0].access_key;
            return true;
        }
    } catch (error) {
        csclient = undefined;
        logger.error('Init Soap:');
        logger.error(error.message);
    }
    return false;
}

async function testAPI(username, userPassword) {
    try {
        const wsdlUrl = await getSoapWsdl();
        const client = await soap.createClientAsync(wsdlUrl);
        const response = await client.StartSessionAsync({
            user: username,
            pass: userPassword,
        });
        const connected = response && response[0] && response[0].return === 'no_error';
        return {
            status: connected ? 200 : 400,
            return: {
                success: connected,
                api_response: response[0].return,
                error: response[0].err_desc || undefined,
            },
        };
    } catch (error) {
        logger.error(error.message);
        return {
            status: 500,
            return: {
                error: error.message,
            },
        };
    }
}

async function makeApiCall(args, apiMethod, credentials) {
    let apiResponse;
    if (sessionId) {
        apiResponse = await apiMethod({ ...args, access_key: sessionId });
    }

    if (!apiResponse || apiResponse[0].return === 'access_denied') {
        await delay(pause);
        sessionId = (
            await csclient.StartSessionAsync({ user: credentials.Username, pass: credentials.UserPassword })
        )[0].access_key;
        apiResponse = await apiMethod({ ...args, access_key: sessionId });
    }

    return apiResponse;
}

async function invoke(args, method, credentials) {
    if (!csclient) {
        await initSoapClient(credentials.Username, credentials.UserPassword);
    }
    try {
        const result = await makeApiCall(args, csclient[method], credentials);
        logger.info(`Magaya API response: ${result[0].return}`);
        console.log(`Magaya API response: ${result[0].return}`);
        return result[0];
    } catch (error) {
        logger.error('Invoke:');
        logger.error(error);
        return { error_desc: error.message };
    }
}

module.exports = {
    initSoapClient,
    setTransaction: async ({ xml, type, flags = 0 }, credentials) => {
        const args = {
            trans_xml: xml,
            type,
            flags,
        };
        const result = await invoke(args, 'SetTransactionAsync', credentials);
        return result;
    },
    setEntity: async ({ xml, flags = 0 }, credentials) => {
        const args = {
            entity_xml: xml,
            flags,
        };
        const result = await invoke(args, 'SetEntityAsync', credentials);
        return result;
    },
    setTransactionCharges: async ({ xml, type, flags = 0, number }, credentials) => {
        const args = {
            charge_list_xml: xml,
            type,
            flags,
            number,
        };
        const result = await invoke(args, 'SetTransactionChargesAsync', credentials);
        return result;
    },
    testAPI,
};

// module.exports = {
//     setTransaction: async ({ xml, type, flags = 0 }, credentials) => {
//         const args = {
//             trans_xml: xml,
//             type,
//             flags,
//         };

//         if (!csclient) {
//             await initSoapClient(credentials);
//         }

//         try {
//             const result = await makeApiCall(args, csclient.SetTransactionAsync, credentials);
//             console.log(`Magaya API response: ${result[0].return}`);
//             return result[0];
//         } catch (error) {
//             console.log(error.message);
//         }
//         return false;
//     },
//     testAPI,
// };
