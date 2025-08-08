/* eslint-disable no-unused-vars */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
const helper = require('@magaya/db-helper');
const soapApiClient = require('../mgy-soap-client/magaya-soap.client');
const apiClient = require('../ai-document-cs/api-client');
const { paymentMapper } = require('./payment.mapper');
const invoiceMapper = require('./invoices.mapper');
const chargesMapper = require('./charges.mapper');
const documentsService = require('../documents/documents.services');
const logger = require('../logger');

module.exports = (invoiceStrategy = {}, hyperion) => {
    const api = apiClient();
    const { transformTransactions } = helper(hyperion).transactionHyperion;
    const helperAcc = helper(hyperion).accounting;
    const { saveBulkData, setCustomFieldValue } = helper(hyperion).common;

    const {
        getPaymentByGuid,
        getCheckByGuid,
        getInvoiceByNumber,
        getBillByNumber,
        getListInvoiceByNumber,
        getListBillByNumber,
        voidTransactionByNumber,
    } = helperAcc;
    const factoryTransactionGetter = {
        Payment: getPaymentByGuid,
        Check: getCheckByGuid,
        Invoice: getInvoiceByNumber,
        CreditMemo: getInvoiceByNumber,
        Bill: getBillByNumber,
        BillCredit: getBillByNumber,
        InvoiceList: getListInvoiceByNumber,
        BillList: getListBillByNumber,
    };

    const notificationInvoices = async (listResult) => {
        const requestObj = {
            TransactionIds: listResult,
        };
        try {
            const data = await api.doPost('NotifyTransactionsImported', requestObj);
            return data;
        } catch (error) {
            console.log('error: ', error);
            throw error;
        }
    };

    const insertInvoice = async (listInvoices) => {
        // let indexBillNumbers = 0;
        const listResult = [];
        const listImported = [];
        // eslint-disable-next-line no-restricted-syntax
        for (const jsonInvoice of listInvoices) {
            let foundShipment = false;
            // if (listInvoices.length > 1 && jsonInvoice.TransactionType !== 'Invoice') {
            //     indexBillNumbers += 1;
            // } else {
            //     indexBillNumbers = 0;
            // }
            // const invoiceNumber =
            //     (indexBillNumbers === 0 && jsonInvoice.InvoiceNumber) ||
            //     `${jsonInvoice.InvoiceNumber}-MGY${indexBillNumbers}`;
            const factoryType = jsonInvoice.TransactionType;
            const invoiceNumber = jsonInvoice.InvoiceNumber;
            const transInvBill = await factoryTransactionGetter[factoryType](invoiceNumber);
            if (transInvBill) {
                foundShipment = true;
                listResult.push({
                    id: jsonInvoice.TransactionId,
                    status: 'Failed',
                    error: 'Transaction found!',
                });
            }

            if (!foundShipment) {
                const invoice = await invoiceMapper(jsonInvoice, invoiceNumber, hyperion);
                const response = await invoiceStrategy.insertInvoice(invoice);

                if (response.status === 'Imported') {
                    const jsonInv = {
                        ...invoice,
                        documents: jsonInvoice.Documents,
                        mot: jsonInvoice.MOT,
                        entries: jsonInvoice.Entries,
                        transactionType: jsonInvoice.TransactionType,
                        charges: jsonInvoice.Charges,
                        isServiceBill: jsonInvoice.is_service_bill || false,
                    };
                    listImported.push(jsonInv);
                    // Add Attachment Invoices or Shipment
                }

                listResult.push(response);
            }
        }

        try {
            // eslint-disable-next-line no-unused-vars
            const notiResult = await notificationInvoices(listResult);
        } catch (error) {
            console.log('error: ', error);
        }
        //Notify result CS

        return listResult;
    };

    const notificationCharges = async (listResult) => {
        const requestObj = {
            TransactionIds: listResult,
        };
        try {
            const data = await api.doPost('NotifyTransactionChargesImported', requestObj);
            return data;
        } catch (error) {
            console.log('error: ', error);
            throw error;
        }
    };


    
    const testAPI = async (apiCredentials) => {
        const response = soapApiClient.testAPI(apiCredentials);
        return response;
    };

    const insertCharges = async (listJson) => {
        const listResult = [];
        for (const jsonCharges of listJson) {
            const jsData = await chargesMapper(jsonCharges);
            if (jsData.transactionList.length > 0) {
                for (const transaction of jsData.transactionList) {
                    const response = await invoiceStrategy.insertCharges(
                        jsData.charges,
                        jsData.transactionType,
                        transaction,
                        jsData.transactionId,
                    );
                    if (response.status === 'Imported') {
                        console.log('Done!!');
                    } else {
                        console.log('Error!!');
                    }
                    listResult.push(response);
                }
            } else {
                listResult.push({
                    id: jsData.transactionId,
                    status: 'Failed',
                    error: jsData.msgList,
                });
            }
        }
        return listResult;
    };

    const getAccountingPending = async (params) => {
        const requestObj = {
            networkId: params.networkId,
            code: params.code,
        };
        const listMagaya = [];
        const listNotFound = [];
        try {
            const pendingTransaction = await api.doGet('GetTransactionsPending', requestObj);
            if (pendingTransaction) {
                for (const iterator of pendingTransaction.transactions) {
                    const trans = await factoryTransactionGetter[iterator.invoiceType](
                        iterator.invoiceNumber,
                    );
                    if (trans) {
                        listMagaya.push({
                            iD: iterator.id,
                            status: 'Imported',
                            error: '',
                        });
                    } else {
                        listNotFound.push(iterator);
                    }
                }
            }
            // try {
            //     const notiResult = await notificationInvoices(listMagaya);
            //     console.log('notiResult: ', notiResult);
            // } catch (error) {
            //     console.log('error: ', error);
            // }
            return { inMagaya: listMagaya, notFound: listNotFound };
        } catch (error) {
            console.log('error: ', error);
            throw error;
        }
    };

    const updateReferenId = async (jsonData, type) => {
        const result = [];
        for (const invoice of jsonData) {
            const customFieldsToSave = [];
            const trans = await factoryTransactionGetter[type](invoice.InvoiceNumber);
            if (trans) {
                const fieldName = (type === 'Invoice' && 'ref_invoice_id') || 'ref_bill_id';
                customFieldsToSave.push({
                    internalName: fieldName,
                    value: invoice.id,
                });
                if (customFieldsToSave.length > 0) {
                    const successResult = await saveBulkData(trans, {
                        customFieldKeyValues: customFieldsToSave,
                    });
                    const msgError = `Update Reference ${type}: ${invoice.InvoiceNumber} status: ${successResult.success}`;
                    logger.info(msgError);
                    result.push({
                        InvoiceNumber: invoice.InvoiceNumber,
                        Type: type,
                        Status: `Success:${successResult.success} Msg: ${successResult.message}`,
                    });
                }
            } else {
                const msgError = `Update Reference Transaction not found! ${type}: ${invoice.InvoiceNumber}`;
                logger.info(msgError);
                result.push({
                    InvoiceNumber: invoice.InvoiceNumber,
                    Type: type,
                    Status: 'Transaction not found!',
                });
            }
        }
        return result;
    };

    const voidAccountingTransaction = async (listVoid) => {
        // eslint-disable-next-line no-useless-catch
        const listResult = [];
        try {
            for (const jsonVoid of listVoid) {
                const type = (jsonVoid.TransactionType === 'VoidInvoice' && 'Invoice') || 'Bill';
                const result = await voidTransactionByNumber(jsonVoid.Voided_invoiceNo, type);
                if (result && result.success === true) {
                    listResult.push({
                        id: jsonVoid.TransactionId,
                        status: 'Imported',
                        error: '',
                    });
                } else {
                    listResult.push({
                        id: jsonVoid.TransactionId,
                        status: 'Failed',
                        error:
                            result.error ||
                            `Error void transaction with id: ${jsonVoid.TransactionId} and number: ${jsonVoid.Voided_invoiceNo}`,
                    });
                }
            }
            if (listResult.length > 0) {
                const notiResult = await notificationInvoices(listResult);
                console.log('notiResult: ', notiResult);
            }
            return listResult;
        } catch (error) {
            logger.error(error.message);
            throw error;
        }
    };

    const getTransactionByNumber = async (params) => {
        const result = [];
        const customFieldsToSave = [];
        const trans = await factoryTransactionGetter[params.type](params.number);
        return trans;
    };

    return {
        insertInvoice,
        insertCharges,
        testAPI,
        notificationInvoices,
        notificationCharges,
        retrievePayment,
        notifyDeletePayment,
        editValueCustomFieldPostedPayment,
        getAccountingPending,
        updateReferenId,
        voidAccountingTransaction,
        getTransactionByNumber,
    };
};
