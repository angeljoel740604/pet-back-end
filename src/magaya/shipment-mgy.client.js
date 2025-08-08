const helper = require('@magaya/db-helper');
const globalContext = require('../global-context');
const utils = require('../shared/utils');

module.exports = () => {
    const { hyperion } = globalContext.getContext();
    const { getShipmentTotalQtyPieces } = helper(hyperion).shipment;
    const {
        accumulateTransactions,
        transformTransactions,
        collectTransactions,
        findTransactionByFromToConditions,
    } = helper(hyperion).transactionHyperion;

    async function getHouses(houses) {
        const housesList = await collectTransactions(houses, () => true);
        return Promise.all(
            housesList.map(async (h) => ({ house: h, totalQtyPieces: await getShipmentTotalQtyPieces(h) })),
        );
    }

    async function getHousesBillLadingNumbers(houses) {
        const billLadingNumber = await transformTransactions(houses, async (house) => {
            return {
                fileName: house.Name,
                waybillNumber:
                    house.Type === hyperion.dbx.Shipping.Shipment.Type.Air
                        ? house.AirWaybillNumber
                        : house.BillOfLadingNumber,
                // scac: house.Type !== 1 ? house.BillOfLadingNumber.substring(0, 4) : '',
                totalQuantity: await getShipmentTotalQtyPieces(house),

                shipper: {
                    name: house.ShipperName,
                    address: house && utils.formatAddress(house.ShipperAddress),
                    taxId: house.Shipper && house.Shipper.ExporterID,
                },
                consignee: {
                    name: house.ConsigneeName,
                    address: house && utils.formatAddress(house.ConsigneeAddress),
                    taxId: house.Consignee && house.Consignee.ExporterID,
                },
                importer: {
                    name: importer && importer.Name,
                    address: importer && utils.formatAddress(importer.Address),
                    taxId: importer && importer.ExporterID,
                },
                stuffingLocation: {
                    name: stuffingLocation && stuffingLocation.Name,
                    address: stuffingLocation && utils.formatAddress(stuffingLocation.Address),
                    taxId: stuffingLocation && stuffingLocation.ExporterID,
                },
                consolidator: {
                    name: consolidator && consolidator.Name,
                    address: consolidator && utils.formatAddress(consolidator.Address),
                    taxId: consolidator && consolidator.ExporterID,
                },
                bookingParty: {
                    name: bookingParty && bookingParty.Name,
                    address: bookingParty && utils.formatAddress(bookingParty.Address),
                    taxId: bookingParty && bookingParty.ExporterID,
                },
            };
        });

        return Promise.all(billLadingNumber);
    }

    async function getTransactionByBolNumber(bolNumber, scac, mot) {
        const { dbx } = hyperion;
        const list = dbx.Shipping.Shipment.ListByWaybillNumber;
        if (list) {
            try {
                let transaction = null;

                if (mot === '40' || mot === '41') {
                    // search with format
                    transaction = await findTransactionByFromToConditions(
                        list,
                        bolNumber,
                        bolNumber,
                        (current) => current.AirWaybillNumber === bolNumber,
                    );
                    if (!transaction) {
                        // search remove dash
                        const number = bolNumber.replace('-', '');
                        transaction = await findTransactionByFromToConditions(
                            list,
                            number,
                            number,
                            (current) => current.AirWaybillNumber === number,
                        );
                    }
                    if (!transaction) {
                        // search add dash
                        const char = '-';
                        const position = 3;
                        const strNumber = bolNumber.slice(0, position) + char + bolNumber.slice(position);
                        transaction = await findTransactionByFromToConditions(
                            list,
                            strNumber,
                            strNumber,
                            (current) => current.AirWaybillNumber === strNumber,
                        );
                    }
                    if (!transaction) {
                        // search add scac and -
                        const number = `${scac}-${bolNumber}`;
                        transaction = await findTransactionByFromToConditions(
                            list,
                            number,
                            number,
                            (current) => current.AirWaybillNumber === number,
                        );
                    }
                } else {
                    transaction = await findTransactionByFromToConditions(
                        list,
                        bolNumber,
                        bolNumber,
                        (current) => current.BillOfLadingNumber === bolNumber,
                    );
                    if (!transaction) {
                        const number = scac + bolNumber;
                        transaction = await findTransactionByFromToConditions(
                            list,
                            number,
                            number,
                            (current) => current.BillOfLadingNumber === number,
                        );
                    }
                }

                return transaction;
            } catch (error) {
                console.log('error: ', error);
                return null;
            }
        }
        return null;
    }

    function convertItemTo(itemWght, uom) {
        const unit = (uom === 'lb' && hyperion.dbx.Uom.Weight.Pound) || hyperion.dbx.Uom.Weight.Kilogram;
        const result = itemWght.convertTo(unit).magnitude;
        return result;
    }

    async function getFirstItemsData(sh, mode) {
        let bField = false;
        const arrayItems = [];
        const listCommodities = (sh.PackingList && sh.PackingList.Items) || sh.Items || undefined;
        const packageType = await transformTransactions(listCommodities, async (it) => {
            if (!bField) {
                if (it.IsContainer || it.UpItem) {
                    if (it.ContainedPieces === 0) {
                        return {
                            invoice: { number: it.SupplierInvoiceNumber || '' },
                            package: { id: 'Container', name: 'Container' },
                        };
                    }
                    // entrar al container y enviar el primero

                    const itemL = await transformTransactions(it.ContainedItems, (itm) => {
                        if (itm.Manufacturer && mode === 'isf') {
                            bField = true;
                        }
                        if (itm.PackageName && mode === 'entry') {
                            bField = true;
                        }
                        const dt = {
                            invoice: { number: itm.SupplierInvoiceNumber || '' },
                            package: (itm.PackageName && {
                                id: itm.PackageName,
                                name: itm.PackageName,
                            }) || { id: 'Package', name: 'Package' },
                            manufactureData: itm.Manufacturer && {
                                id: itm.Manufacturer.EntityID,
                                name: itm.Manufacturer.Name,
                                address:
                                    itm.Manufacturer.Address && utils.formatAddress(itm.Manufacturer.Address),
                            },
                        };
                        arrayItems.push(dt);
                        return dt;
                    });
                    return itemL[0];
                }
                if (it.Manufacturer && mode === 'isf') {
                    bField = true;
                }
                if (it.PackageName && mode === 'entry') {
                    bField = true;
                }
                return {
                    invoice: { number: it.SupplierInvoiceNumber || '' },
                    package: (it.PackageName && { id: it.PackageName, name: it.PackageName }) || {
                        id: 'Package',
                        name: 'Package',
                    },
                    manufactureData: it.Manufacturer && {
                        id: it.Manufacturer.EntityID,
                        name: it.Manufacturer.Name,
                        address: it.Manufacturer.Address && utils.formatAddress(it.Manufacturer.Address),
                    },
                };
            }
            return null;
        });
        // devolver
        return (
            packageType[0] || {
                invoice: { number: '' },
                package: { id: 'Package', name: 'Package' },
            }
        );
    }

    async function getContainerNumber(sh) {
        const listCommodities = (sh.PackingList && sh.PackingList.Items) || sh.Items || undefined;
        const itemList = await transformTransactions(listCommodities, (it) => {
            if (it.IsContainer || it.UpItem) {
                const cntNumber =
                    (it.UpItem && it.UpItem.SerialNumber) ||
                    (it.SerialNumber !== '' && it.SerialNumber) ||
                    undefined;
                return (
                    cntNumber && {
                        containerNumber: cntNumber,
                    }
                );
            }
            return null;
        });
        const result = itemList.filter((it) => !!it);
        return result;
    }

    async function getTotalChargesFreight(sh) {
        const listCharges = sh.Charges;
        const chargeType = hyperion.dbx.Accounting.ItemsAndServices.Type;
        let chargeTotal = 0;
        await transformTransactions(listCharges, (it) => {
            const type = it.ChargeDefinition.Type;
            if (type === chargeType.Freight || type === chargeType.OtherFreight) {
                chargeTotal += it.Amount.amount;
            }
        });
        return chargeTotal;
    }

    async function getTotalValue(sh) {
        let value = 0;
        const listCommodities = (sh.PackingList && sh.PackingList.Items) || sh.Items || undefined;
        const valueResult = await transformTransactions(listCommodities, async (it) => {
            value += it.TotalValue.amount;
            if (it.IsContainer || it.UpItem) {
                const total = await accumulateTransactions(
                    it.ContainedItems,
                    0,
                    (accumulated, item) => accumulated + item.TotalValue.amount,
                );
                value = 0;
                value += total;
                return value;
            }
            return value;
        });
        const result = await Promise.all(valueResult);
        const sumResult = result.reduce((partialSum, a) => partialSum + a, 0);
        return sumResult;
    }

    async function getWaybillNumber(item, SHIPMENT_TYPE, packageType) {
        const ship = item.InShipment || item.OutShipment;
        const number =
            (ship && ship.Type === SHIPMENT_TYPE.Air && ship.AirWaybillNumber) ||
            (ship && packageType === 'e214' && ship.BillOfLadingNumber) ||
            (ship && ship.BillOfLadingNumber.substring(4, ship.BillOfLadingNumber.length));
        return number;
    }

    async function getManufactureList() {
        const result = [];
        const listCustomer = await collectTransactions(hyperion.dbx.Entity.Customer.List, () => true);
        const listVendor = await collectTransactions(hyperion.dbx.Entity.Vendor.List, () => true);

        Promise.all(
            listCustomer.map((h) =>
                result.push({ id: h.GUID, name: h.Name, address: utils.formatAddress(h.Address) }),
            ),
        );
        Promise.all(
            listVendor.map((h) =>
                result.push({ id: h.GUID, name: h.Name, address: utils.formatAddress(h.Address) }),
            ),
        );

        result.sort((a, b) => (a.name > b.name ? 1 : -1));
        return result;
    }

    return {
        getHousesBillLadingNumbers,
        getHouses,
        getTransactionByBolNumber,
        convertItemTo,
        getFirstItemsData,
        getContainerNumber,
        getTotalChargesFreight,
        getTotalValue,
        getWaybillNumber,
        getManufactureList,
    };
};
