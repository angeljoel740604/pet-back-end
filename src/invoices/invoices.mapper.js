/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
const helper = require('@magaya/db-helper');

const accountMgyClient = require('../magaya/accounting-mgy.client');
const utils = require('../shared/utils');
const shipmentMgyClient = require('../magaya/shipment-mgy.client');

module.exports = async (jsonData, invNumber, hyperion) => {
    const { getChargesData } = accountMgyClient();
    const { getDivisionByName, getCustomerByName, getVendorByName } = helper(hyperion).common;

    const getAddressByClientName = async (billTo, type) => {
        const entity =
            (type === 'Invoice' && (await getCustomerByName(billTo.BillTo_Name))) ||
            (await getVendorByName(billTo.BillTo_Name));
        const billAddress =
            (billTo.BillTo_Address1 &&
                type === 'Invoice' && {
                    Street: billTo.BillTo_Address1,
                    City: billTo.BillTo_city,
                    State: billTo.BillTo_state,
                    ZipCode: billTo.BillTo_zip,
                }) ||
            (entity && entity.BillingAddress);
        return utils.formatAddressUpper(billAddress);
    };

    // const getTheCharge = (charge, accountingTypes) => {
    //     try {
    //         return (
    //             (accountingTypes.includes(charge.AccountDefinition.Type) && charge) ||
    //             (charge.ResaleCharge &&
    //                 accountingTypes.includes(charge.ResaleCharge.AccountDefinition.Type) &&
    //                 charge.ResaleCharge) ||
    //             null
    //         );
    //     } catch (e) {
    //         console.log(e);
    //         return null;
    //     }
    // };

    function replaceMulCharInString(str, charToReplace) {
        let strMaster = str;
        for (let i = 0; i < charToReplace.length; i += 1) {
            // strMaster = str.replaceAll(new RegExp(_charToReplace[i], 'gi'), _replaceWith[i]);
            strMaster = strMaster.replace(new RegExp(charToReplace[i], 'gi'), ' ');
        }
        return strMaster;
    }

    const getNotes = async () => {
        let notes = (jsonData.Invoice_notes && `            ${jsonData.Invoice_notes}\n`) || '';
        for (const iterator of jsonData.Entries) {
            let mastersBill = JSON.stringify(iterator.BillOfLading && iterator.BillOfLading.MastersBill);
            // mastersBill = mastersBill.replace('null', 'Empty').replaceAll(/{|}|\[/gi, '');

            const charToReplace = ['\\[', '\\]', '\\{', '\\}', '\\"', 'null'];
            notes = replaceMulCharInString(notes, charToReplace);
            mastersBill = replaceMulCharInString(mastersBill, charToReplace);
            mastersBill = mastersBill.replace(new RegExp('Bill_no', 'gi'), '\n               Bill_no');
            mastersBill = mastersBill.replace(new RegExp('HousesBill', 'gi'), '\n             HousesBill');
            for (const cbp of iterator.cbp7501_infoField) {
                notes += `
            Shipment Number: ${cbp.entry_number}
            Reference Number: ${cbp.reference_number}
            MastersBill: ${mastersBill}`;
            }
        }
        return notes;
    };

    const getBolGuid = async () => {
        const directionHyp = hyperion.dbx.Shipping.Shipment.Direction;
        const typeHyp = hyperion.dbx.Shipping.Shipment.Type;
        const list = [];
        for (const iterator of jsonData.Entries) {
            if (
                iterator.BillOfLading &&
                iterator.BillOfLading.MastersBill &&
                iterator.BillOfLading.MastersBill.length === 1
            ) {
                for (const bol of iterator.BillOfLading.MastersBill) {
                    // Product Backlog Item 47632: [Extension] Accounting Configuration - Link Invoices & Docs
                    const billNumber =
                        (jsonData.LinkAccountingTransactiontoShipmentHouses &&
                            bol.HousesBill &&
                            bol.HousesBill[0].Bill_no) ||
                        bol.Bill_no;
                    const scac =
                        (jsonData.LinkAccountingTransactiontoShipmentHouses &&
                            bol.HousesBill &&
                            bol.HousesBill[0].Scac) ||
                        bol.Scac;
                    const sh = await shipmentMgyClient().getTransactionByBolNumber(
                        billNumber,
                        scac,
                        jsonData.MOT,
                    );
                    if (sh) {
                        const dirType = Object.keys(directionHyp).find(
                            (key) => directionHyp[key] === sh.Direction,
                        );
                        const type =
                            (typeHyp.Air === sh.Type && 'AirShipment') ||
                            (typeHyp.Ocean === sh.Type && 'OceanShipment') ||
                            (typeHyp.Ground === sh.Type && 'GroundShipment');
                        const trans = {
                            guid: sh.GUID,
                            number: sh.Name,
                            direction: dirType,
                            typeTrans: type,
                            transaction: sh,
                            bills: iterator.BillOfLading.MastersBill,
                        };
                        list.push(trans);
                    }
                }
            }
        }
        return list;
    };

    const divisionName = jsonData.DivisionName;
    const division = await getDivisionByName(divisionName);
    const transactionType = jsonData.TransactionType;
    const transactionId = jsonData.TransactionId;
    const invoiceNumber = invNumber;
    const currency = {
        code: 'USD',
        name: 'United States Dollar',
    };
    const billTo = {
        name: jsonData.Invoice_Bill_To[0].BillTo_Name,
        address: await getAddressByClientName(jsonData.Invoice_Bill_To[0], transactionType),
    };

    const invoiceDate = utils.convertDatetoUTC(jsonData.InvoiceDate);
    const charges = await getChargesData(jsonData.Charges, 'invoice');
    const notes = await getNotes();
    const relatedObject = jsonData.LinkAccountingTransactiontoShipment && (await getBolGuid());
    const accountReceivableName = jsonData.AccountReceivableName;
    const accountPayableName = jsonData.AccountPayableName;

    return {
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
    };
};
