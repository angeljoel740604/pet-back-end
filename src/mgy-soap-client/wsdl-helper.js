const axios = require('axios');

const getUrl = async ({ networkId }) => {
    console.log(`[${new Date().toUTCString()}][info]: Getting wsdl url networkId: ${networkId}`);
    const appName = 'ai-document';
    const gateway = process.env.GATEWAY_URL;
    try {
        const url = `${gateway}/connection/${networkId}?app=${appName}`;
        let result = await axios.get(url);
        let regex = /^https?:\/\/([^/?#]+)(?:[/?#]|$)/i;
        let wsdl = `${result.data.local.match(regex)[0]}CSSoapService?wsdl`;
        console.log(`[${new Date().toUTCString()}][info]: Success getting wsdl url networkId: ${networkId}`);

        return wsdl;
    } catch (error) {
        console.log(`[${new Date().toUTCString()}][Error]: Getting wsdl url, error:  ${error.message}`);
    }
    return '';
};
module.exports = { getUrl };
