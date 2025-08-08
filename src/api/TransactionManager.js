const logger = require('../helpers/extlogger');
const dateFormat = require('dateformat');
const com = require('../helpers/common');
const init = require('../api/initialize');
const hyperion = init.hyperion;
const dbx = hyperion.dbx;
const alg = hyperion.algorithm;

async function GetCompanyID() {
    return dbx.Company.NetworkID;
}

async function GetTransaction(type, guid) {
    let list = dbx.Shipping.Shipment.ListByGuid;
    if (list) {
        try {
            let transaction = await alg
                .find(dbx.using(list).from(guid))
                .where((current) => current.GUID === guid);
            return transaction;
        } catch (error) {
            logger.LogMessage(error);
            return null;
        }
    }
}

async function GetMagayaShipment(guid) {
    return await GetTransaction(dbx.Common.DbClassType.Shipment, guid);
}

async function GetShipmentsIni(guid) {
    let listArr = [];
    let listItems = [];
    let isLen = false;
    let sh = await GetMagayaShipment(guid);
    if (!sh) return;
    let itList = await GetShipmentHouses(sh);
    if (itList.length === 0) itList = await GetItemsShows(sh);

    for (let index = 0; index < itList.length; index++) {
        let lt = itList[index];
        for (let ind = 0; ind < lt.length; ind++) {
            let li = lt[ind];
            listArr.push(li);
            isLen = true;
        }
    }
    if (isLen === true) {
        listItems = listArr.reduce((m, o) => {
            var found = m.find(
                (p) =>
                    p.HTS === o.HTS &&
                    p.PartNumber === o.PartNumber &&
                    p.CountryOfOrigin === o.CountryOfOrigin &&
                    p.ManufacturerName === o.ManufacturerName &&
                    p.ShipperName === o.ShipperName &&
                    p.ConsigneeName === o.ConsigneeName,
            );
            if (found && o.HTS !== '') {
                found.Price.Unit_price += o.Price.Unit_price;
                found.TotalWeight.Amount += o.TotalWeight.Amount;
                found.TotalQuantity.Amount += o.TotalQuantity.Amount;
            } else {
                m.push(o);
            }
            return m;
        }, []);
    } else listItems = itList;

    for (let i = 0; i < listItems.length; i++) {
        const element = listItems[i];
        delete element.ManufacturerName;
        delete element.ShipperName;
        delete element.ConsigneeName;
        delete element.HTS;
    }

    return listItems;
}

async function GetShipmentHouses(sh) {
    let houses = sh.Houses;
    if (houses) {
        let list = [];
        let listHou = await alg.collect(dbx.using(houses)).where((t) => true);

        for (let index = 0; index < listHou.length; index++) {
            let house = listHou[index];
            let arr = await GetItemsShows(house);
            list.push(arr);
        }

        return list;
    }
}

async function ListHouses(houses) {
    return await alg.collect(dbx.using(houses)).where((t) => true);
}

async function GetItemsShows(house) {
    const inv = com.getInvoice(hyperion);
    let obj = {};
    let itemList = await alg.collect(dbx.using(house.PackingList.Items)).where((t) => true);

    const listGroupItems = itemList.reduce(async (m, o) => {
        let found = undefined;
        if (o.IsContainer) {
            let contList = await alg.collect(dbx.using(o.ContainedItems)).where((t) => true);
            const listGroupContainerItems = contList.reduce((m, o) => {
                let CountryOfOrigin =
                    o.AMSData !== undefined && o.AMSData.Country !== undefined ? o.AMSData.Country.Code : '';
                let ManufacturerName = o.Manufacturer ? o.Manufacturer.Name : '';
                let ShipperName = o.Shipper ? o.Shipper.Name : '';
                let ConsigneeName = o.Consignee ? o.Consignee.Name : '';
                let Manufacturer = o.Manufacturer
                    ? {
                          Name: o.Manufacturer.Name,
                          Address:
                              o.Manufacturer &&
                              (o.Manufacturer.Address || o.Manufacturer.Address.Street !== '')
                                  ? com.formatAddress(o.Manufacturer.Address)
                                  : undefined,
                          Phone: o.Manufacturer && o.Manufacturer.Phone ? o.Manufacturer.Phone : undefined,
                          Email: o.Manufacturer && o.Manufacturer.Email ? o.Manufacturer.Email : undefined,
                          Fax: o.Manufacturer && o.Manufacturer.Fax ? o.Manufacturer.Fax : undefined,
                          TaxID:
                              o.Manufacturer && o.Manufacturer.ExporterID
                                  ? o.Manufacturer.ExporterID
                                  : undefined,
                      }
                    : undefined;
                let Shipper = house.Shipper
                    ? {
                          Name: house.Shipper.Name,
                          Address:
                              house.Shipper && (house.Shipper.Address || house.Shipper.Address.Street !== '')
                                  ? com.formatAddress(house.Shipper.Address)
                                  : undefined,
                          Phone: house.Shipper && house.Shipper.Phone ? house.Shipper.Phone : undefined,
                          Email: house.Shipper && house.Shipper.Email ? house.Shipper.Email : undefined,
                          Fax: house.Shipper && house.Shipper.Fax ? house.Shipper.Fax : undefined,
                          TaxID:
                              house.Shipper && house.Shipper.ExporterID
                                  ? house.Shipper.ExporterID
                                  : undefined,
                      }
                    : undefined;
                let Consignee = house.Consignee
                    ? {
                          Name: house.Consignee.Name,
                          Address:
                              house.Consignee &&
                              (house.Consignee.Address || house.Consignee.Address.Street !== '')
                                  ? com.formatAddress(house.Consignee.Address)
                                  : undefined,
                          Phone: house.Consignee && house.Consignee.Phone ? house.Consignee.Phone : undefined,
                          Email: house.Consignee && house.Consignee.Email ? house.Consignee.Email : undefined,
                          Fax: house.Consignee && house.Consignee.Fax ? house.Consignee.Fax : undefined,
                          TaxID:
                              house.Consignee && house.Consignee.ExporterID
                                  ? house.Consignee.ExporterID
                                  : undefined,
                      }
                    : undefined;
                obj = {
                    Id: o.GUID,
                    HTS: '',
                    Tariff:
                        o.AMSData !== undefined && o.AMSData.HarmonizedTariff !== undefined
                            ? [{ Number: o.AMSData.HarmonizedTariff.Code }]
                            : [],
                    Description: o.Description,
                    PartNumber: o.PartNumber,
                    TotalQuantity: { Amount: o.Pieces, Uom: 'PCS' },
                    TotalWeight: { Amount: o.Weight.magnitude, Uom: o.Weight.unitSymbol },
                    Price: { Unit_price: o.UnitaryValue.amount, Total_price: o.TotalValue.amount },
                    InvoiceNumber: inv !== null ? inv.Number : '',
                    CountryOfOrigin: CountryOfOrigin,
                    Manufacturer: Manufacturer,
                    ManufacturerName: ManufacturerName,
                    Shipper: Shipper,
                    ShipperName: ShipperName,
                    Consignee: Consignee,
                    ConsigneeName: ConsigneeName,
                };
                if (
                    o.AMSData !== undefined &&
                    o.AMSData.HarmonizedTariff !== undefined &&
                    o.AMSData.HarmonizedTariff.Code !== ''
                ) {
                    obj.HTS = o.AMSData.HarmonizedTariff.Code;
                    obj.PartNumber = o.PartNumber;
                    const result = m.filter((w) => w.HTS !== undefined);
                    found = result.find(
                        (p) =>
                            p.HTS === obj.HTS &&
                            p.PartNumber === obj.PartNumber &&
                            p.CountryOfOrigin === obj.CountryOfOrigin &&
                            p.ManufacturerName === obj.ManufacturerName &&
                            p.ShipperName === obj.ShipperName &&
                            p.ConsigneeName === obj.ConsigneeName,
                    );
                    if (found) {
                        found.Price.Unit_price += obj.Price.Unit_price;
                        found.TotalWeight.Amount += obj.TotalWeight.Amount;
                        found.TotalQuantity.Amount += obj.TotalQuantity.Amount;
                    } else {
                        m.push(obj);
                    }
                } else {
                    m.push(obj);
                }
                return m;
            }, []);
            return listGroupContainerItems;
        } else {
            let CountryOfOrigin =
                o.AMSData !== undefined && o.AMSData.Country !== undefined ? o.AMSData.Country.Code : '';
            let ManufacturerName = o.Manufacturer ? o.Manufacturer.Name : '';
            let ShipperName = o.Shipper ? o.Shipper.Name : '';
            let ConsigneeName = o.Consignee ? o.Consignee.Name : '';
            let Manufacturer = o.Manufacturer
                ? {
                      Name: o.Manufacturer.Name,
                      Address:
                          o.Manufacturer && (o.Manufacturer.Address || o.Manufacturer.Address.Street !== '')
                              ? com.formatAddress(o.Manufacturer.Address)
                              : undefined,
                      Phone: o.Manufacturer && o.Manufacturer.Phone ? o.Manufacturer.Phone : undefined,
                      Email: o.Manufacturer && o.Manufacturer.Email ? o.Manufacturer.Email : undefined,
                      Fax: o.Manufacturer && o.Manufacturer.Fax ? o.Manufacturer.Fax : undefined,
                      TaxID:
                          o.Manufacturer && o.Manufacturer.ExporterID ? o.Manufacturer.ExporterID : undefined,
                  }
                : undefined;
            let Shipper = house.Shipper
                ? {
                      Name: house.Shipper.Name,
                      Address:
                          house.Shipper && (house.Shipper.Address || house.Shipper.Address.Street !== '')
                              ? com.formatAddress(house.Shipper.Address)
                              : undefined,
                      Phone: house.Shipper && house.Shipper.Phone ? house.Shipper.Phone : undefined,
                      Email: house.Shipper && house.Shipper.Email ? house.Shipper.Email : undefined,
                      Fax: house.Shipper && house.Shipper.Fax ? house.Shipper.Fax : undefined,
                      TaxID: house.Shipper && house.Shipper.ExporterID ? house.Shipper.ExporterID : undefined,
                  }
                : undefined;
            let Consignee = house.Consignee
                ? {
                      Name: house.Consignee.Name,
                      Address:
                          house.Consignee &&
                          (house.Consignee.Address || house.Consignee.Address.Street !== '')
                              ? com.formatAddress(house.Consignee.Address)
                              : undefined,
                      Phone: house.Consignee && house.Consignee.Phone ? house.Consignee.Phone : undefined,
                      Email: house.Consignee && house.Consignee.Email ? house.Consignee.Email : undefined,
                      Fax: house.Consignee && house.Consignee.Fax ? house.Consignee.Fax : undefined,
                      TaxID:
                          house.Consignee && house.Consignee.ExporterID
                              ? house.Consignee.ExporterID
                              : undefined,
                  }
                : undefined;
            m = await m;
            obj = {
                Id: o.GUID,
                HTS: '',
                Tariff:
                    o.AMSData !== undefined && o.AMSData.HarmonizedTariff !== undefined
                        ? [{ Number: o.AMSData.HarmonizedTariff.Code }]
                        : [],
                Description: o.Description,
                PartNumber: o.PartNumber,
                TotalQuantity: { Amount: o.Pieces, Uom: 'PCS' },
                TotalWeight: { Amount: o.Weight.magnitude, Uom: o.Weight.unitSymbol },
                Price: { Unit_price: o.UnitaryValue.amount, Total_price: o.TotalValue.amount },
                InvoiceNumber: inv !== null ? inv.Number : '',
                CountryOfOrigin: CountryOfOrigin,
                Manufacturer: Manufacturer,
                ManufacturerName: ManufacturerName,
                Shipper: Shipper,
                ShipperName: ShipperName,
                Consignee: Consignee,
                ConsigneeName: ConsigneeName,
            };
            if (
                o.AMSData !== undefined &&
                o.AMSData.HarmonizedTariff !== undefined &&
                o.AMSData.HarmonizedTariff.Code !== ''
            ) {
                obj.HTS = o.AMSData.HarmonizedTariff.Code;
                obj.PartNumber = o.PartNumber;
                const result = m.filter((w) => w.HTS !== undefined);
                found = result.find(
                    (p) =>
                        p.HTS === obj.HTS &&
                        p.PartNumber === obj.PartNumber &&
                        p.CountryOfOrigin === obj.CountryOfOrigin &&
                        p.ManufacturerName === obj.ManufacturerName &&
                        p.ShipperName === obj.ShipperName &&
                        p.ConsigneeName === obj.ConsigneeName,
                );
                if (found) {
                    found.Price.Unit_price += obj.Price.Unit_price;
                    found.TotalWeight.Amount += obj.TotalWeight.Amount;
                    found.TotalQuantity.Amount += obj.TotalQuantity.Amount;
                } else {
                    m.push(obj);
                }
            } else {
                m.push(obj);
            }
            return m;
        }
    }, []);
    return listGroupItems;
}
async function AddTransactionEvent(sh, event_name, details, date) {
    return await com.SaveTransactionEvent(sh, hyperion, event_name, details, date);
}

//Validate data mandatory.
async function validForSend(req) {
    let shpmts = req.body.data.guids;
    let trans_id = req.params.trans_id;
    let sh = await GetMagayaShipment(trans_id);
    let getOut = false;
    let result = {};
    let valid = {};
    if (shpmts.length) {
        valid = isValid(sh);
        if (valid.valid === false) {
            getOut = true;
            result.message = valid.message;
        }
    } else {
        result.message = 'No Items selected or found.';
        getOut = true;
    }
    if (!getOut) {
        result.valid = true;
    }
    return result;
}

function isValid(sh) {
    let message = [];

    if (!(sh.DestinationPort && sh.DestinationPort.Country && sh.DestinationPort.Country.Code == 'US')) {
        message.push('Make sure destination port is in United States');
    }
    if (sh.DestinationPortSchedule === '' || sh.OriginPortSchedule === '') {
        message.push('Make sure Schedule D and Schedule K are entered');
    }
    // if (!sh.DeliveryPort && sh.Type !== 1) {
    //   message.push("Make sure Place of Delivery by On Carrier is specified");
    // }
    if (!sh.OriginPort) {
        //direction === sh.Direction && sh.OriginPort.Country && sh.OriginPort.Country.Code == "US"
        message.push('Make sure origin port is specified');
    }
    // if (sh.OriginPort && sh.OriginPort.Country && sh.OriginPort.Country.Code == "US") {
    //   message.push("The port of origin cannot be in the United States");
    // }

    if (!sh.ModeOfTransportation) {
        message.push("Mode of Transportation of record needs to be specified on shipment's.");
    }
    if (!sh.Name) {
        message.push("The shipment number of record needs to be specified on shipment's.");
    }

    return {
        valid: !message.length,
        message: message.join('\r\n'),
    };
}

async function getAiDocumentdata(guid, data) {
    let sh = await GetMagayaShipment(guid);
    let shipTypes = dbx.Shipping.Shipment.Type;
    let importer;
    // const housesList = await GetShipmentHousesAndPieces(sh);
    //const codeCarrier = sh.MasterShipment ? await getIssuerCodeMaster(sh) : await getIssuerCode(sh);
    const fileNumber = {
        FileNumber: sh.Name,
        MasterCurrency: (sh.Currency !== null) & (sh.Currency !== undefined) ? sh.Currency.Code : '',
        ModeOfTransportation: sh.ModeOfTransportation ? sh.ModeOfTransportation.Code : undefined,
        DateOfArrival: {
            Date: sh.ActualArrivalDate
                ? dateFormat(new Date(sh.ActualArrivalDate).toLocaleString('en-US'), 'mm/dd/yyyy')
                : sh.EstimatedArrivalDate
                ? dateFormat(new Date(sh.EstimatedArrivalDate).toLocaleString('en-US'), 'mm/dd/yyyy')
                : undefined,
            Time: sh.ActualArrivalDate
                ? dateFormat(new Date(sh.ActualArrivalDate).toLocaleString('en-US'), 'hh:mm')
                : sh.EstimatedArrivalDate
                ? dateFormat(new Date(sh.EstimatedArrivalDate).toLocaleString('en-US'), 'hh:mm')
                : undefined,
        },
        Carrier: sh.Carrier
            ? {
                  SCAC:
                      sh.Carrier.CarrierTypeCode !== 1 ? sh.Carrier.SCACNumber : sh.Carrier.AirlineCodeNumber, //sh.Carrier.CarrierTypeCode == 1 ? sh.Carrier.AirlineCode : sh.Carrier.SCACNumber,
              }
            : undefined,
        PortOfLading: sh.OriginPort
            ? {
                  Code: sh.OriginPort.Code ? sh.OriginPort.Code : undefined,
                  CountryCode: sh.OriginPort.Country ? sh.OriginPort.Country.Code : undefined,
              }
            : undefined,
        PortOfUnlading: sh.DestinationPort
            ? {
                  Code: sh.DestinationPort.Code ? sh.DestinationPort.Code : undefined,
                  CountryCode: sh.DestinationPort.Country ? sh.DestinationPort.Country.Code : undefined,
              }
            : undefined,
        Importer: importer
            ? {
                  Name: importer.Name,
                  Address:
                      importer && (importer.Address || importer.Address.Street !== '')
                          ? com.formatAddress(importer.Address)
                          : undefined,
                  Phone: importer && importer.Phone ? importer.Phone : undefined,
                  Email: importer && importer.Email ? importer.Email : undefined,
                  Fax: importer && importer.Fax ? importer.Fax : undefined,
                  TaxID: importer && importer.ExporterID ? importer.ExporterID : undefined,
              }
            : undefined,
    };
    const lineItem = { LineItem: await getLineItemData(guid, data) };
    const wayBill = {
        wayBill:
            sh.HouseCount > 0
                ? {
                      Master: {
                          Number:
                              sh.Type === shipTypes.Air
                                  ? sh.AirWaybillNumber.substring(4, house.AirWaybillNumber.length)
                                  : await getBillNumberMaster(sh),
                          SCAC:
                              sh.Type === shipTypes.Air
                                  ? sh.AirWaybillNumber.substring(0, 3)
                                  : await getIssuerCodeMaster(sh),
                          TotalQuantity:
                              (await GetHouseIsContainer(sh)) === true
                                  ? await GetHouseQuantities(sh, hyperion)
                                  : sh.TotalPieces,
                          Layout: 'M',
                          House: await GetShipmentHousesPieces(sh),
                      },
                  }
                : [
                      {
                          Master: {
                              Number:
                                  sh.Type === shipTypes.Air
                                      ? sh.AirWaybillNumber.substring(4, sh.AirWaybillNumber.length)
                                      : sh.BillOfLadingNumber.substring(4, sh.BillOfLadingNumber.length),
                              SCAC:
                                  sh.Type !== shipTypes.Air
                                      ? sh.BillOfLadingNumber.substring(0, 4)
                                      : sh.AirWaybillNumber.substring(0, 3),
                              TotalQuantity:
                                  (await GetHouseIsContainer(sh)) === true
                                      ? await GetHouseQuantities(sh, hyperion)
                                      : sh.TotalPieces,
                              Layout: 'D',
                          },
                      },
                  ],
    };
    return {
        Shipment: [
            {
                ...fileNumber,
                ...wayBill,
                ...lineItem,
            },
        ],
    };
}

async function GetShipmentHousesPieces(sh) {
    let houses = sh.Houses;
    if (houses) {
        let shipTypes = dbx.Shipping.Shipment.Type;
        let housesList = await alg
            .collect(dbx.using(houses))
            .where((t) => true)
            .then((items) =>
                Promise.all(
                    items.map(async (house) => ({
                        Number:
                            house.Type == shipTypes.Air
                                ? house.AirWaybillNumber
                                : house.BillOfLadingNumber.substring(4, house.BillOfLadingNumber.length),
                        SCAC: house.Type !== shipTypes.Air ? house.BillOfLadingNumber.substring(0, 4) : '',
                        TotalQuantity:
                            (await GetHouseIsContainer(house)) === true
                                ? await GetHouseQuantities(house, hyperion)
                                : house.TotalPieces,
                    })),
                ),
            );
        return housesList;
    }
}

async function GetHouseQuantities(house, hyperion) {
    let count = 0;
    await alg.forEach(dbx.using(house.PackingList.Items)).callback(async function (item) {
        count += item.ContainedPieces;
    });
    return count;
}

async function GetHouseIsContainer(house) {
    let isContainer = false;

    let itemList = await alg.collect(dbx.using(house.PackingList.Items)).where((t) => true);
    for (let index = 0; index < itemList.length; index++) {
        const element = itemList[index];
        if (element.IsContainer || element.UpItem) {
            isContainer = true;
        }
    }
    return isContainer;
}

async function getLineItemData(guid, data) {
    let lines = await GetShipmentsIni(guid);
    let itemList = lines.filter((item) => data.data.guids.some((g) => item.Id === g));
    if (data.data.inv.length > 0) {
        itemList.forEach((it, index) => {
            let value =
                data.invoice !== '' ? data.invoice : data.data.inv.filter((item, ind) => index === ind)[0];
            it.InvoiceNumber = value;
        });
    }

    return itemList;
}

async function getIssuerCodeMaster(house) {
    let result = '';
    let issuerCode =
        house.Carrier && house.Carrier.CarrierTypeCode !== 1
            ? house.Carrier.SCACNumber
            : house.Carrier.AirlineCodeNumber;

    let billNumber = house ? (house.Type !== 1 ? house.BillOfLadingNumber : '') : '';

    if (house.Carrier && house.Carrier.CarrierTypeCode === 1) return (result = issuerCode);

    let resultBill = billNumber.substring(0, issuerCode.length);
    if (resultBill === issuerCode) result = issuerCode;
    if (resultBill !== issuerCode) result = billNumber.substring(0, 4);
    return result;
}

async function getBillNumberMaster(house) {
    let result = '';
    let issuerCode = house.Carrier && house.Carrier.CarrierTypeCode !== 1 ? house.Carrier.SCACNumber : '';

    let billNumber = house ? (house.Type !== 1 ? house.BillOfLadingNumber : '') : '';

    let resultBill = billNumber.substring(0, issuerCode.length);
    if (resultBill === issuerCode && billNumber.length >= 12 && billNumber.length <= 16)
        result = billNumber.substring(issuerCode.length, billNumber.length);
    if (resultBill !== issuerCode && billNumber.length >= 12 && billNumber.length <= 16)
        result = billNumber.substring(4, billNumber.length);
    return result;
}

async function getTransactionByBolNumber(bolNumber, mot, scac) {
    let list = dbx.Shipping.Shipment.ListByWaybillNumber;
    if (list) {
        try {
            let transaction = null;
            if (mot !== '40' && mot !== '41') {
                transaction = await alg
                    .find(dbx.using(list).from(bolNumber).to(bolNumber))
                    .where((current) => current.BillOfLadingNumber === bolNumber);
            } else {
                transaction = await alg
                    .find(dbx.using(list).from(bolNumber).to(bolNumber))
                    .where((current) => current.AirWaybillNumber === bolNumber);
            }

            if (!transaction && mot !== '40' && mot !== '41') {
                const bl = scac + bolNumber;
                transaction = await alg
                    .find(dbx.using(list).from(bl).to(bl))
                    .where((current) => current.BillOfLadingNumber === bl);
            }

            return transaction;
        } catch (error) {
            logger.LogMessage(error);
            return null;
        }
    }
}
/////////////////////////////////////////

async function EditValueCustomField(sh, value) {
    await com.AddCustomFieldValueToEditTrans(sh, 'magaya_abi_fileid', value); //
}

async function GetAbiDataHousesAndPiecesInbond(sh, onlyMaster, data) {
    let shipTypes = dbx.Shipping.Shipment.Type;
    let house = sh.GUID === data.guids[0] ? sh : onlyMaster ? sh : [];
    if (house) {
        let sMAsterBill = {};
        if (house.MasterShipment) {
            sMAsterBill = {
                IssuerCode: house.MasterShipment
                    ? house.Type == shipTypes.Air
                        ? house.MasterShipment.AirWaybillNumber.substring(0, 3)
                        : await getIssuerCodeMaster(house)
                    : '',
                BillNumber: house.MasterShipment
                    ? house.Type == shipTypes.Air
                        ? house.MasterShipment.AirWaybillNumber.substring(
                              4,
                              house.MasterShipment.AirWaybillNumber.length,
                          )
                        : await getBillNumberMaster(house)
                    : '',
                IssuerCodeHouse: house.Type !== shipTypes.Air ? house.BillOfLadingNumber.substring(0, 4) : '',
                BillNumberHouse:
                    house.Type == shipTypes.Air
                        ? house.AirWaybillNumber
                        : house.BillOfLadingNumber.substring(4, house.BillOfLadingNumber.length),
            };
        } else {
            sMAsterBill = {
                IssuerCode:
                    house.Type !== shipTypes.Air
                        ? house.BillOfLadingNumber.substring(0, 4)
                        : house.AirWaybillNumber.substring(0, 3),
                BillNumber:
                    house.Type == shipTypes.Air
                        ? house.AirWaybillNumber.substring(4, house.AirWaybillNumber.length)
                        : house.BillOfLadingNumber.substring(4, house.BillOfLadingNumber.length),
            };
        }
        return [
            {
                ...sMAsterBill,
                TotalQuantity: onlyMaster ? house.TotalPieces : await GetHouseQuantities(house, hyperion), //M
                guid: house.GUID,
                Unit: 'PCS',
                PackageType: 'Package',
                GrossWeight: house.TotalWeight.magnitude.toString(), //M
                GrossWeightUnit: house.TotalWeight.unitSymbol, //M
                TotalVolume: house.TotalVolume.magnitude.toString(),
                TotalVolumeUnit: await showVolumeUnit(house.TotalVolume), //house.TotalVolume.unitSymbol,
                ForeignShipper: house.Shipper
                    ? {
                          ForeignShipperName: house.ShipperName,
                          ForeignShipperAddress: com.formatAddress(house.ShipperAddress),
                          ForeignShipperPhone: house.Shipper ? house.Shipper.Phone : '',
                      }
                    : undefined,
                Consignee: house.Consignee
                    ? {
                          ConsigneeName: house.ConsigneeName,
                          ConsigneeAddress: com.formatAddress(house.ConsigneeAddress),
                          ConsigneePhone: house.Consignee ? house.Consignee.Phone : '',
                      }
                    : undefined,
                IsContainer: await GetHouseIsContainer(house),
                ItemsContainers: await GetAbiDataContainerItems(house),
                NotifyPartyList: house.NotifyParty
                    ? [
                          {
                              NotifyParty: house.NotifyPartyName,
                              NotifyPartyAddress: com.formatAddress(house.NotifyPartyAddress),
                              NotifyPartyPhone: house.NotifyParty ? house.NotifyParty.Phone : '',
                          },
                      ]
                    : [],
                SecondaryNotifyPartyCodesList: [],
            },
        ];
    }
}

async function GetAbiDataHousesAndPieces(sh, onlyMaster, data) {
    let houses = sh.Houses;
    if (houses) {
        let shipTypes = dbx.Shipping.Shipment.Type;
        let housesList = await alg.collect(dbx.using(houses)).where((t) => true);
        housesList = housesList.filter((house) => data.guids.some((g) => house.GUID === g));
        return Promise.all(
            housesList.map(async (house) => {
                return {
                    IssuerCode: house.MasterShipment
                        ? house.Type == shipTypes.Air
                            ? house.MasterShipment.AirWaybillNumber.substring(0, 3)
                            : await getIssuerCodeMaster(house)
                        : '',
                    BillNumber: house.MasterShipment
                        ? house.Type == shipTypes.Air
                            ? house.MasterShipment.AirWaybillNumber.substring(
                                  4,
                                  house.MasterShipment.AirWaybillNumber.length,
                              )
                            : await getBillNumberMaster(house)
                        : '',
                    IssuerCodeHouse:
                        house.Type !== shipTypes.Air ? house.BillOfLadingNumber.substring(0, 4) : '',
                    BillNumberHouse:
                        house.Type == shipTypes.Air
                            ? house.AirWaybillNumber
                            : house.BillOfLadingNumber.substring(4, house.BillOfLadingNumber.length),
                    TotalQuantity: await GetHouseQuantities(house, hyperion), //M
                    guid: house.GUID,
                    Unit: 'PCS',
                    PackageType: 'Package',
                    GrossWeight: house.TotalWeight.magnitude.toString(), //M
                    GrossWeightUnit: house.TotalWeight.unitSymbol, //M
                    TotalVolume: house.TotalVolume.magnitude.toString(),
                    TotalVolumeUnit: await showVolumeUnit(house.TotalVolume), //house.TotalVolume.unitSymbol,
                    ForeignShipper: house.Shipper
                        ? {
                              ForeignShipperName: house.ShipperName,
                              ForeignShipperAddress: com.formatAddress(house.ShipperAddress),
                              ForeignShipperPhone: house.Shipper ? house.Shipper.Phone : '',
                          }
                        : undefined,
                    Consignee: house.Consignee
                        ? {
                              ConsigneeName: house.ConsigneeName,
                              ConsigneeAddress: com.formatAddress(house.ConsigneeAddress),
                              ConsigneePhone: house.Consignee ? house.Consignee.Phone : '',
                          }
                        : undefined,
                    IsContainer: await GetHouseIsContainer(house),
                    ItemsContainers: await GetAbiDataContainerItems(house),
                    NotifyPartyList: house.NotifyParty
                        ? [
                              {
                                  NotifyParty: house.NotifyPartyName,
                                  NotifyPartyAddress: com.formatAddress(house.NotifyPartyAddress),
                                  NotifyPartyPhone: house.NotifyParty ? house.NotifyParty.Phone : '',
                              },
                          ]
                        : [],
                    SecondaryNotifyPartyCodesList: [],
                };
            }),
        );
    }
}

async function getIssuerCode(house) {
    let result = '';
    let issuerCode =
        house.Carrier && house.Carrier.CarrierTypeCode !== 1
            ? house.Carrier.SCACNumber
            : house.Carrier.AirlineCodeNumber;

    let billNumber = house.Type !== 1 ? house.BillOfLadingNumber : house.AirWaybillNumber;

    let resultBill = billNumber.substring(0, issuerCode.length);
    if (resultBill === issuerCode) result = issuerCode;
    if (resultBill !== issuerCode)
        result = house.Type !== 1 ? billNumber.substring(0, 4) : billNumber.substring(0, 3);
    return result;
}

async function getCarrier(code) {
    const list = hyperion.dbx.Entity.Carrier.List;
    // const foundCarrier = await hyperion.algorithm
    //   .find(hyperion.dbx.using(list))
    //   .where((current) => (current.CarrierTypeCode !== 1 ? current.SCACNumber : current.AirlineCode === code));

    let carrierName = '';
    dbx.using(list).iterate(function (current) {
        let codeC = current.CarrierTypeCode !== 1 ? current.SCACNumber : current.AirlineCodeNumber;
        if (codeC === code) carrierName = current.Name;
    });
    return carrierName;
}

async function showVolumeUnit(uomObj) {
    var result = '';
    var uom = uomObj.unit;

    switch (uom) {
        case dbx.Uom.Volume.CubicMeter:
            result = 'CM';
            break;
        case dbx.Uom.Volume.CubicCentimeter:
            result = 'CC';
            break;
        case dbx.Uom.Volume.CubicDecimeter:
            result = 'MM';
            break;
        case dbx.Uom.Volume.CubicFoot:
            result = 'CF';
            break;
        case dbx.Uom.Volume.CubicInch:
            result = 'NN';
            break;
    }
    return result;
}

async function GetAbiDataContainerItems(house) {
    let CargoDescriptionList = [];
    let ContainerHazardousMaterials = [];
    let ContainerItems = [];
    let CargoDescriptionClassList = {};
    let ContainerHazardousMaterialClass = {};
    let ContainerItemsClass = {};
    let ContainerMarksNumbers = [];
    let container = {
        ContainerNumber: '',
        ContainerType: '',
        SealNumber1: '',
        SealNumber2: '',
        ContainerMarksNumbers: [],
        CargoDescriptionList: [],
        ContainerHazardousMaterials: [],
        ContainerItems: [],
    };
    let lossItems = {
        CargoDescriptionList: [],
        ContainerHazardousMaterials: [],
        ContainerItems: [],
    };
    let itemsList = [];
    let type = '';
    let cntNumber = '';

    let itemListL = await alg.collect(dbx.using(house.PackingList.Items)).where((t) => true);
    for (let index = 0; index < itemListL.length; index++) {
        let item = itemListL[index];
        if (item.UpItem && type !== 'lossItem') {
            if (item.UpItem.SerialNumber !== cntNumber && cntNumber !== '') {
                itemsList.push({ ...container });
            }
            type = 'up';

            if (container.ContainerNumber === '' || item.UpItem.SerialNumber !== cntNumber) {
                cntNumber = item.UpItem.SerialNumber;
                container.ContainerNumber = item.UpItem.SerialNumber;
                container.ContainerType = item.UpItem.Package ? item.UpItem.Package.ContainerCode : '';
                container.SealNumber1 = item.UpItem.PartNumber;
                container.SealNumber2 = item.UpItem.LotNumber;
                container.ContainerMarksNumbers =
                    item.UpItem.Notes !== '' ? [{ MarkAndNumber: item.UpItem.Notes }] : [];

                CargoDescriptionList = [];
                ContainerHazardousMaterials = [];
                ContainerItems = [];
            }

            if (item.Package !== undefined && item.Package.Type === 2) {
                type = 'container';
                item = await getItem(item);

                if (item !== undefined) {
                    container.CargoDescriptionList = await GetAbiDataItemsContDescriptionList(item);
                    container.ContainerHazardousMaterials = await GetAbiDataItemsContHazardousList(item);
                    container.ContainerItems = await GetAbiDataItemsInContainer(item);

                    itemsList.push({ ...container });
                }
            } else {
                CargoDescriptionClassList = {
                    PieceCount: item.IsContainer ? item.ContainedPieces : item.Pieces,
                    Description: item.Description,
                    PackageType: item.Package ? com.getPackageTypeAbi(item.Package) : 'PKG',
                };
                CargoDescriptionList.push(CargoDescriptionClassList);

                if (item.Hazardous !== undefined) {
                    ContainerHazardousMaterialClass = {
                        Code: item.Hazardous.MaterialCode,
                        Class: item.Hazardous.MaterialClass,
                        Description: item.Hazardous.ClassDescription,
                        Contact: item.Hazardous.EmergencyContact, //EmergencyEntity
                        ContactPhone:
                            item.Hazardous.EmergencyEntity !== undefined
                                ? item.Hazardous.EmergencyEntity.Phone
                                : '',
                        FlashpointTemp: item.Hazardous.FlashpointTemp,
                        AddInfoObject: [],
                    };
                    ContainerHazardousMaterials.push(ContainerHazardousMaterialClass);
                }

                ContainerItemsClass = {
                    HTS:
                        item.AMSData && item.AMSData.HarmonizedTariff
                            ? item.AMSData.HarmonizedTariff.Code
                            : '',
                    Weight: item.Weight.magnitude,
                    WeightUnit: item.Weight.unitSymbol,
                    CountryofOrigin: item.AMSData && item.AMSData.Country ? item.AMSData.Country.Code : '',
                    Manufacturer: item.Manufacturer ? item.Manufacturer.Name : '',
                    Value: item.TotalValue.amount,
                };
                ContainerItems.push(ContainerItemsClass);

                container.CargoDescriptionList = CargoDescriptionList;
                container.ContainerHazardousMaterials = ContainerHazardousMaterials;
                container.ContainerItems = ContainerItems;
            }
            //itemsList.push({ ...container });
        } else if (item.IsContainer && type !== 'lossItem' && item.PackageName !== 'Pallet') {
            type = 'container';
            container.ContainerNumber = item.SerialNumber;
            container.ContainerType = item.Package ? item.Package.ContainerCode : '';
            container.SealNumber1 = item.PartNumber;
            container.SealNumber2 = item.LotNumber;
            container.ContainerMarksNumbers = item.Notes !== '' ? [{ MarkAndNumber: item.Notes }] : [];

            if (item.Package !== undefined && item.Package.Type === 2) {
                type = 'container';
                item = await getItem(item);
            }
            if (item !== undefined) {
                container.CargoDescriptionList = await GetAbiDataItemsContDescriptionList(item);
                container.ContainerHazardousMaterials = await GetAbiDataItemsContHazardousList(item);
                container.ContainerItems = await GetAbiDataItemsInContainer(item);

                itemsList.push({ ...container });
            }
        } else {
            if (item.Package !== undefined && item.Package.Type === 2) {
                type = 'container';
                item = await getItem(item);
                if (item !== undefined) {
                    lossItems.CargoDescriptionList = await GetAbiDataItemsContDescriptionList(item);
                    lossItems.ContainerHazardousMaterials = await GetAbiDataItemsContHazardousList(item);
                    lossItems.ContainerItems = await GetAbiDataItemsInContainer(item);

                    itemsList.push({ ...lossItems });
                }
            } else {
                type = 'lossItem';
                CargoDescriptionClassList = {
                    PieceCount: item.IsContainer ? item.ContainedPieces : item.Pieces,
                    Description: item.Description,
                    PackageType: item.Package ? com.getPackageTypeAbi(item.Package) : 'PKG',
                };
                CargoDescriptionList.push(CargoDescriptionClassList);

                if (item.Hazardous !== undefined) {
                    ContainerHazardousMaterialClass = {
                        Code: item.Hazardous.MaterialCode,
                        Class: item.Hazardous.MaterialClass,
                        Description: item.Hazardous.ClassDescription,
                        Contact: item.Hazardous.EmergencyContact,
                        ContactPhone:
                            item.Hazardous.EmergencyEntity !== undefined
                                ? item.Hazardous.EmergencyEntity.Phone
                                : '',
                        FlashpointTemp: item.Hazardous.FlashpointTemp,
                        AddInfoObject: [],
                    };
                    ContainerHazardousMaterials.push(ContainerHazardousMaterialClass);
                }

                ContainerItemsClass = {
                    HTS:
                        item.AMSData && item.AMSData.HarmonizedTariff
                            ? item.AMSData.HarmonizedTariff.Code
                            : '',
                    Weight: item.Weight.magnitude,
                    WeightUnit: item.Weight.unitSymbol,
                    CountryofOrigin: item.AMSData && item.AMSData.Country ? item.AMSData.Country.Code : '',
                    Manufacturer: item.Manufacturer ? item.Manufacturer.Name : '',
                    Value: item.TotalValue.amount,
                };
                ContainerItems.push(ContainerItemsClass);

                lossItems.CargoDescriptionList = CargoDescriptionList;
                lossItems.ContainerHazardousMaterials = ContainerHazardousMaterials;
                lossItems.ContainerItems = ContainerItems;
            }
        }
    }

    if (type === 'up') itemsList.push({ ...container });
    if (type === 'lossItem') itemsList.push({ ...lossItems });

    //Group Items with same HTS and Description
    let listItem = [];
    for (let ind = 0; ind < itemsList.length; ind++) {
        let listArray = itemsList[ind];
        const listGroupCargoDescriptionList = listArray.CargoDescriptionList.reduce((m, o) => {
            var found = m.find((p) => p.Description === o.Description);
            if (found && o.PieceCount !== '') {
                found.PieceCount += o.PieceCount;
            } else {
                m.push(o);
            }
            return m;
        }, []);
        const listGroupContainerItems = listArray.ContainerItems.reduce((m, o) => {
            var found = m.find((p) => p.HTS === o.HTS);
            if (found && o.HTS !== '') {
                found.Value += o.Value;
                found.Weight += o.Weight;
            } else {
                m.push(o);
            }
            return m;
        }, []);
        listItem = [...itemsList];
        listItem[ind].CargoDescriptionList = listGroupCargoDescriptionList;
        listItem[ind].ContainerItems = listGroupContainerItems;
    }
    return listItem;
}

async function getItem(item) {
    let its = item;
    let itemsList = await alg
        .collect(dbx.using(item.ContainedItems))
        .where((t) => true)
        .then((itemsL) =>
            Promise.all(
                itemsL.map(async (it) => {
                    if (it.Package !== undefined && it.Package.Type === 2) {
                        its = it;
                        return await getItem(it);
                    }
                }),
            ),
        );
    return its;
}

//OK
async function GetAbiDataItemsContDescriptionList(item) {
    let ls = [];
    let itemsList = await alg
        .collect(dbx.using(item.ContainedItems))
        .where((t) => true)
        .then((itemsL) =>
            Promise.all(
                itemsL.map(async (it) => {
                    if (it.Package !== undefined && it.Package.Type === 2) {
                        it = await getItem(it);
                        await alg
                            .collect(dbx.using(it.ContainedItems))
                            .where((t) => true)
                            .then((itemsL) =>
                                Promise.all(
                                    itemsL.map(async (itm) => {
                                        let cu = {
                                            PieceCount: itm.Pieces,
                                            Description: it.Description,
                                            PackageType: itm.Package
                                                ? com.getPackageTypeAbi(itm.Package)
                                                : 'PKG',
                                        };
                                        ls.push(cu);
                                    }),
                                ),
                            );
                    } else {
                        let cu = {
                            PieceCount: it.Pieces,
                            Description: it.Description,
                            PackageType: it.Package ? com.getPackageTypeAbi(it.Package) : 'PKG',
                        };
                        ls.push(cu);
                    }
                }),
            ),
        );
    return (itemsList = ls);
}

async function GetAbiDataItemsContHazardousList(item) {
    let haz = {};
    let ls = [];
    let itemsList = await alg
        .collect(dbx.using(item.ContainedItems))
        .where((t) => true)
        .then((itemsL) =>
            Promise.all(
                itemsL.map(async (it) => {
                    if (it.Package !== undefined && it.Package.Type === 2) {
                        it = await getItem(it);
                        await alg
                            .collect(dbx.using(it.ContainedItems))
                            .where((t) => true)
                            .then((itemsL) =>
                                Promise.all(
                                    itemsL.map(async (itm) => {
                                        if (itm.Hazardous !== undefined) {
                                            let haz = {
                                                Code: itm.Hazardous.MaterialCode,
                                                Class: itm.Hazardous.MaterialClass,
                                                //CodeQualifier: item.Hazardous.ClassQualifier,
                                                Description: itm.Hazardous.ClassDescription,
                                                Contact: itm.Hazardous.EmergencyContact,
                                                ContactPhone:
                                                    itm.Hazardous.EmergencyEntity !== undefined
                                                        ? itm.Hazardous.EmergencyEntity.Phone
                                                        : '',
                                                FlashpointTemp: itm.Hazardous.FlashpointTemp,
                                                AddInfoObject: [],
                                            };
                                            ls.push(haz);
                                        }
                                    }),
                                ),
                            );
                    }
                    if (it.Hazardous !== undefined) {
                        haz = {
                            Code: it.Hazardous.MaterialCode,
                            Class: it.Hazardous.MaterialClass,
                            //CodeQualifier: item.Hazardous.ClassQualifier,
                            Description: it.Hazardous.ClassDescription,
                            Contact: it.Hazardous.EmergencyContact,
                            ContactPhone:
                                it.Hazardous.EmergencyEntity !== undefined
                                    ? it.Hazardous.EmergencyEntity.Phone
                                    : '',
                            FlashpointTemp: it.Hazardous.FlashpointTemp,
                            AddInfoObject: [],
                        };
                        ls.push(haz);
                    }
                }),
            ),
        );
    return (itemsList = ls);
}

async function GetAbiDataItemsInContainer(item) {
    let ls = [];

    let itemsList = await alg
        .collect(dbx.using(item.ContainedItems))
        .where((t) => true)
        .then((itemsL) =>
            Promise.all(
                itemsL.map(async (it) => {
                    if (it.Package !== undefined && it.Package.Type === 2) {
                        it = await getItem(it);
                        await alg
                            .collect(dbx.using(it.ContainedItems))
                            .where((t) => true)
                            .then((itemsL) =>
                                Promise.all(
                                    itemsL.map(async (itm) => {
                                        let cu = {
                                            HTS:
                                                itm.AMSData && itm.AMSData.HarmonizedTariff
                                                    ? itm.AMSData.HarmonizedTariff.Code
                                                    : '',
                                            Weight: itm.Weight.magnitude,
                                            WeightUnit: itm.Weight.unitSymbol,
                                            CountryofOrigin:
                                                itm.AMSData && itm.AMSData.Country
                                                    ? itm.AMSData.Country.Code
                                                    : '',
                                            Manufacturer: itm.Manufacturer ? itm.Manufacturer.Name : '',
                                            Value: itm.TotalValue.amount,
                                        };
                                        ls.push(cu);
                                    }),
                                ),
                            );
                    } else {
                        let cu = {
                            HTS:
                                it.AMSData && it.AMSData.HarmonizedTariff
                                    ? it.AMSData.HarmonizedTariff.Code
                                    : '',
                            Weight: it.Weight.magnitude,
                            WeightUnit: it.Weight.unitSymbol,
                            CountryofOrigin: it.AMSData && it.AMSData.Country ? it.AMSData.Country.Code : '',
                            Manufacturer: it.Manufacturer ? it.Manufacturer.Name : '',
                            Value: it.TotalValue.amount,
                        };
                        ls.push(cu);
                    }
                }),
            ),
        );

    return (itemsList = ls);
}

function isMandatoryHouse(sh) {
    let message = [];

    let num = sh.Type == 1 ? sh.AirWaybillNumber : sh.BillOfLadingNumber;
    if (!num) {
        message.push("The house number of record needs to be specified on shipment's.");
    }
    if (sh.TotalWeight.magnitude === 0) {
        message.push(`The Total Weight of record needs to be specified on house ${num}.`);
    }
    if (sh.TotalPieces === 0) {
        message.push(`The Total Pieces of record needs to be specified on house ${num}.`);
    }

    let bill = sh.MasterShipment
        ? sh.Type == 1
            ? sh.MasterShipment.AirWaybillNumber
            : sh.MasterShipment.BillOfLadingNumber
        : undefined;
    if (bill !== undefined && bill.length > 16) {
        message.push('The BOL has more than 16 character.');
    }
    if (bill !== undefined && bill.length < 12) {
        message.push('The BOL has less than 12 character.');
    }

    return {
        valid: !message.length,
        message: message.join('\r\n'),
    };
}

async function validForABI(req) {
    let shpmts = req.body.guids;
    let trans_id = req.params.trans_id;
    let onlyMaster = req.body.onlyMasterInfo;
    let getOut = false;
    let mand = false;
    let mandatory = {};
    let result = {};
    if (shpmts.length) {
        for (let guid of shpmts) {
            if (onlyMaster) guid = trans_id;
            sh = await GetTransaction(dbx.Common.DbClassType.Shipment, guid);

            mandatory = isMandatoryHouse(sh);
            if (!mandatory.valid) {
                mand = true;
                result.message = mandatory.message;
            }

            if (!(sh.PackingList && sh.PackingList.Items && sh.PackingList.Items.Count)) continue;
            let items = sh.PackingList.Items;
            let loose = false;
            let containerized = false;
            getOut = await alg.anyOf(dbx.using(items)).where(function (item) {
                if (
                    (item.IsContainer &&
                        item.DbClassType === dbx.Common.DbClassType.Container &&
                        item.Package &&
                        item.Package.Type === dbx.Warehousing.Package.Type.Container) ||
                    (item.Package && item.Package.Type === 2)
                ) {
                    containerized = true;
                } else {
                    loose = true;
                }
                //If at some point this is true, shipment has loose and containerized cargo at the same time
                //exit loop
                return loose == containerized;
            });
            if (getOut) {
                result.message = 'All Cargo must be loose OR containerized, not both.';
                break;
            }
        }
    } else {
        result.message = 'No shipments selected or found.';
        getOut = true;
    }
    if (!getOut && !mand) {
        result.abiValid = true;
        result.url = `${process.env.ABI_APP_URL}/api/MagayaInbond`; //replace this url with Jorge's url for ABI'
    }
    return result;
}

module.exports = {
    GetCompanyID,
    GetItemsShows,
    GetShipmentsIni,
    validForSend,
    getAiDocumentdata,
    GetMagayaShipment,
    AddTransactionEvent,
    EditValueCustomField,
    getTransactionByBolNumber,
    ListHouses,
};
