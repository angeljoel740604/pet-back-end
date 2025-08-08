/* eslint-disable no-await-in-loop */
const js2xmlparser = require('js2xmlparser');
const globalContext = require('../../global-context');
const soapApiClient = require('../../mgy-soap-client/magaya-soap.client');
const accountingMgyClient = require('../../magaya/accounting-mgy.client');
const logger = require('../../logger');

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

    async function getDataGeneral({
        division,
        invoiceNumber,
        transactionType,
        currency,
        billTo,
        invoiceDate,
        notes,
        relatedObject,
        accountReceivableName,
        accountPayableName,
    }) {
        const divisionNode = division && {
            Division: {
                '@': {
                    GUID: division.GUID,
                },
                Type: 'Division',
                Name: division.Name,
                // CreatedOn:
                //     division.CreationDate &&
                //     dateFormat(new Date(division.CreationDate).toLocaleString('en-US'), 'mm/dd/yyyy'),
                // IsPrepaid: true,
                // DivisionInfo: {
                //     UseInHeaders: false,
                // },
            },
        };

        const relatedObjectNode = relatedObject &&
            relatedObject.length > 0 && {
                ObjectElementName: relatedObject[0].typeTrans,
                RelatedObject: {
                    [relatedObject[0].typeTrans]: {
                        '@': {
                            GUID: relatedObject[0].guid,
                        },
                        '@1': {
                            Type: 'SH',
                        },
                        CreatedOn: invoiceDate,
                        Number: relatedObject[0].number,
                        Direction: relatedObject[0].direction,
                    },
                },
            };
        const billingAddress = billTo.address && {
            BillingAddress: billTo.address,
        };

        const accountNameRec = accountReceivableName || 'Account Receivable';
        const accountNamePay = accountPayableName || 'Account Payable';

        const data = {
            Number: invoiceNumber,
            IsPrepaid: false,
            Account: {
                Type:
                    ((transactionType === 'Invoice' || transactionType === 'CreditMemo') &&
                        'AccountReceivable') ||
                    'AccountPayable',
                Name:
                    ((transactionType === 'Invoice' || transactionType === 'CreditMemo') && accountNameRec) ||
                    accountNamePay,
                Currency: {
                    '@': {
                        Code: 'USD',
                    },
                    Name: 'United States Dollar',
                },
            },
            Entity: {
                Type:
                    ((transactionType === 'Invoice' || transactionType === 'CreditMemo') && 'Client') ||
                    'Vendor',
                Name: billTo.name,
                CreatedOn: invoiceDate,
                ...billingAddress,
            },
            CreatedOn: invoiceDate,
            TotalAmount: {
                '@': {
                    Currency: currency.code,
                },
                '#': '0', // ????
            },
            Currency: {
                '@': {
                    Code: currency.code,
                },
                Name: currency.name,
            },
            ExchangeRate: '1',
            ...divisionNode,
            ...billingAddress,
            Notes: notes,
            // Charges: { Charge: await getCharges(charges) },
            ...relatedObjectNode,
        };
        return data;
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

    async function getCharges(charges) {
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
                    // Description: charge.description,
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

    async function getDataCharges(charges) {
        // Charges
        const data = {
            Charges: { Charge: await getCharges(charges) },
        };
        return data;
    }

    async function transformToXml(
        {
            division,
            invoiceNumber,
            transactionType,
            currency,
            billTo,
            invoiceDate,
            charges,
            notes,
            relatedObject,
            accountReceivableName,
            accountPayableName,
        },
        type,
    ) {
        const options = {
            declaration: {
                include: true,
                encoding: 'UTF-8',
                version: '1.0',
            },
        };
        const xmlGeneral = await getDataGeneral({
            division,
            invoiceNumber,
            transactionType,
            currency,
            billTo,
            invoiceDate,
            notes,
            relatedObject,
            accountReceivableName,
            accountPayableName,
        });

        const xmlCharges = await getDataCharges(charges && charges.found);

        const invoiceToSend = {
            '@': {
                xmlns: 'http://www.magaya.com/XMLSchema/V1',
            },
            '@1': {
                Type: type,
            },
            ...xmlGeneral,
            ...xmlCharges,
            TotalAmountInCurrency: {
                '@': {
                    Currency: 'USD',
                },
                '#': '0',
            },
        };
        const root = transactionType;
        // (type === 'BI' && 'Bill') ||
        // (type === 'IN' && 'Invoice') ||
        // (type === 'CM' && 'CreditMemo') ||
        // (type === 'BC' && 'BillCredit');

        const xml = js2xmlparser.parse(root, invoiceToSend, options);
        return xml;
    }

    const insertInvoice = async ({
        division,
        invoiceNumber,
        transactionType,
        currency,
        billTo,
        invoiceDate,
        charges,
        transactionId,
        notes,
        relatedObject,
        accountReceivableName,
        accountPayableName,
    }) => {
        const type =
            (transactionType === 'Invoice' && 'IN') ||
            (transactionType === 'CreditMemo' && 'IN') ||
            (transactionType === 'Bill' && 'BI') ||
            (transactionType === 'BillCredit' && 'BI');
        const xmlInvoice = await transformToXml(
            {
                division,
                invoiceNumber,
                transactionType,
                currency,
                billTo,
                invoiceDate,
                charges,
                notes,
                relatedObject,
                accountReceivableName,
                accountPayableName,
            },
            type,
        );

        let errorMsg = '';
        let response = {};
        if (charges && charges.found.length > 0) {
            const flags = 128;
            response = await soapApiClient.setTransaction({ xml: xmlInvoice, type, flags }, apiCredentials);
            console.log(`Response api : ${transactionType}`, response);
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
        insertInvoice,
    };
};
