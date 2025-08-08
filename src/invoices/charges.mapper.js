/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
const accountMgyClient = require('../magaya/accounting-mgy.client');
const shipmentMgyClient = require('../magaya/shipment-mgy.client');

module.exports = async (jsonData) => {
    const { getChargesData } = accountMgyClient();
    let msgList = '';

    const getBolGuid = async () => {
        const list = [];
        for (const iterator of jsonData.BillOfLading) {
            for (const bol of iterator.MastersBill) {
                let billNumber = bol.Bill_no;
                let scac = bol.Scac;
                let sh = {};
                if (jsonData.LinkAccountingTransactiontoShipmentHouses && bol.HousesBill) {
                    for (const hbol of bol.HousesBill) {
                        billNumber = hbol.Bill_no;
                        scac = hbol.Scac;

                        sh = await shipmentMgyClient().getTransactionByBolNumber(
                            billNumber,
                            scac,
                            jsonData.MOT,
                        );
                        if (sh) {
                            const cfTransId = sh.CustomFields && sh.CustomFields.ref_invoice_id;
                            const listTrans = cfTransId.split(',');
                            const foundId = listTrans.includes(jsonData.TransactionId);
                            if (!foundId) {
                                const trans = {
                                    guid: sh.GUID,
                                    transaction: sh,
                                    bills: iterator.MastersBill,
                                };
                                list.push(trans);
                            }
                            msgList = 'Transaction found in Shipment';
                        }
                        msgList = 'Not transaction found';
                    }
                } else {
                    sh = await shipmentMgyClient().getTransactionByBolNumber(billNumber, scac, jsonData.MOT);
                    if (sh) {
                        const cfTransId = sh.CustomFields && sh.CustomFields.ref_invoice_id;
                        const listTrans = cfTransId.split(',');
                        const foundId = listTrans.includes(jsonData.TransactionId);
                        if (!foundId) {
                            const trans = {
                                guid: sh.GUID,
                                transaction: sh,
                                bills: iterator.MastersBill,
                            };
                            list.push(trans);
                        }
                        msgList = 'Transaction found in Shipment';
                    }
                    msgList = msgList || 'Not transaction found';
                }
            }
        }
        return list;
    };

    const transactionList = await getBolGuid();
    const transactionId = jsonData.TransactionId;
    const charges = (await getChargesData(jsonData.Charges, 'charges')) || [];
    const transactionType = jsonData.TransactionType;

    return {
        charges,
        transactionType,
        transactionList,
        transactionId,
        msgList,
    };
};
