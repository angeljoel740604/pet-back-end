/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
const js2xmlparser = require('js2xmlparser');
const soapApiClient = require('./magaya-soap.client');
const logger = require('../logger');

module.exports = (apiCredentials) => {
    async function getDataEntities(jsonData) {
        const data = {
            Type: 'Client',
            Name: jsonData.Name,
            Address: {
                Street: jsonData.Address && jsonData.Address.Street,
                City: jsonData.Address && jsonData.Address.City,
                State: jsonData.Address && jsonData.Address.State,
                ZipCode: jsonData.Address && jsonData.Address.ZipCode,
                Country: {
                    '@': {
                        Code: jsonData.Address && jsonData.Address.Country,
                    },
                    '#': jsonData.Address && jsonData.Address.Country,
                },
            },
            Email: jsonData.Email || '',
            // Phone: entity.Phone || '',
            // ExporterID: entity.TaxID || '',
            // ExporterIDType: entity.TaxIdType || '',
            // MID: entity.MID || '',
        };

        return data;
    }

    async function getDataShipment(jsonData) {
        const dataEntities = await getDataEntities(jsonData);

        const data = {
            ...dataEntities,
        };
        return data;
    }

    async function transformToXml({ jsonData }) {
        const options = {
            declaration: {
                include: true,
                encoding: 'UTF-8',
                version: '1.0',
            },
        };

        const root = 'Entity';

        const xmlShipment = await getDataShipment(jsonData);

        const chargesToSend = {
            '@': {
                xmlns: 'http://www.magaya.com/XMLSchema/V1',
            },
            ...xmlShipment,
        };

        const xml = js2xmlparser.parse(root, chargesToSend, options);
        console.log('xml: ', xml);
        return xml;
    }

    const createEntity = async (jsonData) => {
        const xmlShipment = await transformToXml({
            jsonData,
        });

        // const flags = 128;
        let errorMsg = '';
        const response = await soapApiClient.setEntity({ xml: xmlShipment }, apiCredentials);
        console.log('Response api created Entity: ', response);

        const st = (response && response.return === 'no_error' && 'Imported') || 'Failed';
        if (errorMsg === '' && st !== 'Imported') {
            errorMsg = (response && (response.error_desc || response.return)) || '';
            logger.info(response);
        }

        return { status: st, error: errorMsg };
    };

    return {
        createEntity,
    };
};
