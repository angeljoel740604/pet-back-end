/* eslint-disable no-await-in-loop */
const js2xmlparser = require('js2xmlparser');
const globalContext = require('../../global-context');
const logger = require('../../logger');
const soapApiClient = require('../../mgy-soap-client/magaya-soap.client');

// branch Dev to Inv

module.exports = (apiCredentials) => {
    const {
        hyperion: { dbx },
    } = globalContext.getContext();

    function getAccountTypesforXML(type) {
        const acctTypes = dbx.Accounting.Account.Type;
        let acctType;
        switch (type) {
            case acctTypes.CostOfGoodSold:
                acctType = 'CostOfGoodsSold';
                break;
            case acctTypes.AccountsReceivable:
                acctType = 'AccountReceivable';
                break;
            case acctTypes.AccountsPayable:
                acctType = 'AccountPayable';
                break;
            default:
                acctType = Object.keys(acctTypes).find((key) => acctTypes[key] === type);
                break;
        }
        return acctType;
    }

    async function getChargeDefinition(transaction, charDefTypes) {
        const data = transaction && {
            Type: Object.keys(charDefTypes).find((key) => charDefTypes[key] === transaction.Type),
            Description: transaction.Description,
            Code: transaction.Code,
            AccountDefinition: {
                Type: getAccountTypesforXML(transaction.AccountDefinition.Type),
                Name: transaction && transaction.AccountDefinition && transaction.AccountDefinition.Name,
                Currency: {
                    '@': {
                        Code: 'USD',
                    },
                    Name: 'United States Dollar',
                },
            },
            Currency: {
                '@': {
                    Code: 'USD',
                },
                Name: 'United States Dollar',
            },
        };

        return data;
    }

    async function getCharges(charges, transactionType) {
        let data = {};
        const listData = [];
        const charDefTypes = dbx.Accounting.ItemsAndServices.Type;

        // eslint-disable-next-line no-restricted-syntax
        for (const charge of charges) {
            const { transaction } = charge;
            if (transaction) {
                const chrgType = transaction && transaction.Type;
                const chargeType =
                    (chrgType &&
                        (chrgType === charDefTypes.Freight || chrgType === charDefTypes.OtherFreight) &&
                        'Freight') ||
                    'Standard';
                data = transaction && {
                    Type: chargeType,
                    Quantity: 1,
                    Price: {
                        '@': {
                            Currency: 'USD',
                        },
                        '#': charge.amount,
                    },
                    Amount: {
                        '@': {
                            Currency: 'USD',
                        },
                        '#': '0',
                    },
                    Entity: {
                        Type:
                            (transactionType === 'Invoice' && 'Client') ||
                            (transactionType === 'Bill' && 'Vendor'),

                        Name: charge.applyTo,
                    },
                    // Description: charge.description,
                    IsPrepaid: false,
                    ChargeDefinition: await getChargeDefinition(transaction, charDefTypes),
                    PriceInCurrency: {
                        '@': {
                            Currency: 'USD',
                        },
                        '#': charge.amount,
                    },
                    AmountInCurrency: {
                        '@': {
                            Currency: 'USD',
                        },
                        '#': '0',
                    },
                    ExchangeRate: '1',
                    Currency: {
                        '@': {
                            Code: 'USD',
                        },
                        Name: 'United States Dollar',
                    },
                };
                listData.push(data);
            }
        }
        return listData;
    }

    async function getDataCharges(charges, transactionType) {
        // Charges
        const data = {
            Charge: await getCharges(charges, transactionType),
        };
        return data;
    }

    async function transformToXml({ charges, transactionType }) {
        const options = {
            declaration: {
                include: true,
                encoding: 'UTF-8',
                version: '1.0',
            },
        };

        const xmlCharges = await getDataCharges(charges && charges.found, transactionType);

        const chargesToSend = {
            '@': {
                xmlns: 'http://www.magaya.com/XMLSchema/V1',
            },
            ...xmlCharges,
        };
        const root = 'Charges';

        const xml = js2xmlparser.parse(root, chargesToSend, options);
        return xml;
    }

    const insertCharges = async (charges, transactionType, transaction, transactionId) => {
        const type = 'SH';
        const xmlCharges = await transformToXml(
            {
                charges,
                transactionType,
                transaction,
            },
            type,
        );

        let errorMsg = '';
        let response = {};
        if (charges && charges.found.length > 0 && transaction) {
            response = await soapApiClient.setTransactionCharges(
                { xml: xmlCharges, type, number: transaction.guid },
                apiCredentials,
            );
            console.log('Response api charges: ', response);
        } else {
            errorMsg = `Charges Not Found: (${charges.notFound.join()})`;
        }
        const st = (response && response.return === 'no_error' && 'Imported') || 'Failed';
        if (errorMsg === '' && st !== 'Imported') {
            errorMsg = (response && (response.error_desc || response.return)) || '';
            logger.info(response);
        }

        return { id: transactionId, status: st, error: errorMsg };
    };

    return {
        insertCharges,
    };
};
