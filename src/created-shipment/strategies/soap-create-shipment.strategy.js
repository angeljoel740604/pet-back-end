/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
const helper = require("@magaya/db-helper");
const js2xmlparser = require("js2xmlparser");
const soapApiClient = require("../../mgy-soap-client/magaya-soap.client");
const utils = require("../../shared/utils");
const globalContext = require("../../global-context");
const logger = require("../../logger");

module.exports = (apiCredentials) => {
  const { hyperion } = globalContext.getContext();
  const { getDataByCondition, getCarrierByScac } = helper(hyperion).common;
  const { findTransactionByCondition } = helper(hyperion).transactionHyperion;

  async function getCarrierByAir(airScac) {
    let result;
    const airMethod = 1;
    const dbxEntityCarrier = hyperion.dbx.Entity.Carrier;
    const dbxEntityCarrierActiveList = dbxEntityCarrier.ActiveList;
    result = await findTransactionByCondition(
      dbxEntityCarrierActiveList,
      (ca) => ca.CarrierTypeCode === airMethod && ca.AirlineCode === airScac
    );
    if (!result) {
      result = await findTransactionByCondition(
        dbxEntityCarrierActiveList,
        (ca) =>
          ca.CarrierTypeCode === airMethod && ca.AirlineCodeNumber === airScac
      );
    }
    return result;
  }

  async function findPort(code) {
    const portList = hyperion.dbx.Common.Port.ActiveListByCode;
    const found = await getDataByCondition(
      portList,
      (current) => current.Code === code
    );
    return found;
  }
  async function portValidation(jsonData, ent) {
    const code = jsonData[`${ent}`];
    const found = await findPort(code);
    const entBase =
      (ent === "PortOfLading" && "OriginPort") ||
      (ent === "PortOfUnlading" && "DestinationPort") ||
      (ent === "ReleasePort" && "DeliveryPort") ||
      (ent === "ITLocation" && "ITLocation");
    const entity = jsonData[ent] && {
      [`${entBase}`]: {
        "@": {
          Code:
            (found && found.Code) ||
            jsonData[`${ent}`].Code ||
            jsonData[`${ent}`],
        },
        Country: {
          "@1": {
            Code: (found && found.Country && found.Country.Code) || "US",
          },
        },
        Name:
          (found && found.Name) ||
          jsonData[`${ent}`].Code ||
          jsonData[`${ent}`],
        Subdivision:
          (found && found.Subdivision) ||
          jsonData[`${ent}`].Code ||
          jsonData[`${ent}`],
      },
    };
    return entity;
  }

  async function getDataContainedItem(items) {
    const listItems = [];
    for (const item of items) {
      const htsString = item.HtsNumber && item.HtsNumber.replaceAll(".", "");
      const htsArray = htsString.split(",");
      const htsNumber = htsArray[htsArray.length - 1];
      const manufacturer = item.Manufaturer && {
        Manufaturer: {
          Type: "Client",
          Name: item.Manufaturer.Name || "",
          Address: {
            Street: item.Manufaturer.Address && item.Manufaturer.Address.Street,
            City: item.Manufaturer.Address && item.Manufaturer.Address.City,
            State: item.Manufaturer.Address && item.Manufaturer.Address.State,
            ZipCode:
              item.Manufaturer.Address && item.Manufaturer.Address.ZipCode,
            Country: {
              "@": {
                Code:
                  item.Manufaturer.Address && item.Manufaturer.Address.Country,
              },
              "#": item.Manufaturer.Address && item.Manufaturer.Address.Country,
            },
          },
          // Phone: item.Manufacture.Phone || '',
          // ExporterID: item.Manufacture.TaxID || '',
          // ExporterIDType: item.Manufacture.TaxIdType || '',
          // MID: item.Manufacture.MID || '',
        },
      };
      const dataIt = {
        "=": "Item",
        "@": { Type: "WI" },
        PartNumber: item.PartNumber || "",
        Pieces: (item.TotalQuantity && item.TotalQuantity.Amount) || 1,
        PieceQuantity: (item.TotalQuantity && item.TotalQuantity.Amount) || 1,
        Description: item.Description || "",
        Weight: {
          "@": { Unit: (item.TotalWeight && item.TotalWeight.Uom) || "lb" },
          "#": (item.TotalWeight && item.TotalWeight.Amount) || 0,
        },
        TotalValue: {
          "@": {
            Currency: "USD",
          },
          "#": (item.Price && item.Price.TotalPrice) || 0,
        },
        UnitaryValue: {
          "@": {
            Currency: "USD",
          },
          "#": (item.Price && item.Price.UnitPrice) || 0,
        },
        PackageName: item.PackageName || "Package",
        Package: {
          Type: (item.Package && item.Package.Type) || "Package",
          Code: (item.Package && item.Package.Code) || "PCK",
          Name: (item.Package && item.Package.Name) || "Package",
        },
        AMSData: {
          HarmonizedTariff: {
            "@": { Code: htsNumber },
          },
          Country: {
            "@": {
              Code: item.CountryOfOrigin && item.CountryOfOrigin.Code,
            },
            "#":
              (item.CountryOfOrigin && item.CountryOfOrigin.Name) ||
              (item.CountryOfOrigin && item.CountryOfOrigin.Code),
          },
        },
        ...manufacturer,
        // SupplierInvoiceNumber: item.InvoiceNumber,
      };
      listItems.push(dataIt);
    }
    return listItems;
  }

  async function getDataItem(jsonData) {
    const listData = [];
    let data;
    if (jsonData.Containers && jsonData.Containers.length > 0) {
      const contItem = await getDataContainedItem(jsonData.Items);
      let isMoreCont = false;
      for (const iterator of jsonData.Containers) {
        const dataContItem = !isMoreCont && { ContainedItems: { contItem } };
        data = {
          "=": "Item",
          "@": { Type: "WI" },
          Pieces: 1,
          SerialNumber: iterator.ContainerNumber,
          IsPallet: false,
          Status: "Loaded",
          Version: 105,
          IsContainer: true,
          // InMasterWayBillNumber: item.InMasterWayBillNumber,
          // InHouseWayBillNumber: item.InHouseWayBillNumber,
          ...dataContItem,
        };
        listData.push(data);
        isMoreCont = true;
      }
    } else {
      data = await getDataContainedItem(jsonData.Items);
    }
    return (listData.length > 0 && listData) || data;
  }

  async function getDataItems(jsonData) {
    const data = {
      Items: { Item: jsonData.Items && (await getDataItem(jsonData)) },
    };
    return data;
  }

  async function getDataEntities(jsonData) {
    const motCode =
      jsonData &&
      jsonData.Master &&
      jsonData.Master.Mot &&
      jsonData.Master.Mot.Code;
    const scac = jsonData && jsonData.Master && jsonData.Master.Scac;
    const currentCarrier =
      ((motCode === "40" || motCode === "41") &&
        (await getCarrierByAir(scac))) ||
      (await getCarrierByScac(scac));
    const carrier = currentCarrier && {
      CarrierName: currentCarrier.Name,
      Carrier: {
        Type: "Carrier",
        Name: currentCarrier.Name,
      },
      CarrierAddress: {
        Street: currentCarrier.Address && currentCarrier.Address.Street,
        City:
          currentCarrier &&
          currentCarrier.Address &&
          currentCarrier.Address.City,
        State:
          currentCarrier &&
          currentCarrier.Address &&
          currentCarrier.Address.State,
        ZipCode:
          currentCarrier &&
          currentCarrier.Address &&
          currentCarrier.Address.ZipCode,
        Country: {
          "@": {
            Code:
              currentCarrier &&
              currentCarrier.Address &&
              currentCarrier.Address.Country,
          },
          "#":
            currentCarrier &&
            currentCarrier.Address &&
            currentCarrier.Address.Country,
        },
      },
    };
    const consignee = jsonData.Consignees &&
      jsonData.Consignees[0] && {
        ConsigneeName: jsonData.Consignees && jsonData.Consignees[0].Name,
        Consignee: {
          Type: "Client",
          Name: jsonData.Consignees && jsonData.Consignees[0].Name,
        },
        ConsigneeAddress: {
          Street:
            jsonData.Consignees &&
            jsonData.Consignees[0].Address &&
            jsonData.Consignees[0].Address.Street,
          City:
            jsonData.Consignees &&
            jsonData.Consignees[0].Address &&
            jsonData.Consignees[0].Address.City,
          State:
            jsonData.Consignees &&
            jsonData.Consignees[0].Address &&
            jsonData.Consignees[0].Address.State,
          ZipCode:
            jsonData.Consignees &&
            jsonData.Consignees[0].Address &&
            jsonData.Consignees[0].Address.ZipCode,
          Country: {
            "@": {
              Code:
                jsonData.Consignees &&
                jsonData.Consignees[0].Address &&
                jsonData.Consignees[0].Address.Country,
            },
            "#":
              jsonData.Consignees &&
              jsonData.Consignees[0].Address &&
              jsonData.Consignees[0].Address.Country,
          },
        },
      };
    const shipper = jsonData.Manufacturer &&
      jsonData.Manufacturer[0] && {
        ShipperName: jsonData.Manufacturer && jsonData.Manufacturer[0].Name,
        Shipper: {
          Type: "Client",
          Name: jsonData.Manufacturer && jsonData.Manufacturer[0].Name,
        },
        ShipperAddress: {
          Street:
            jsonData.Manufacturer &&
            jsonData.Manufacturer[0].Address &&
            jsonData.Manufacturer[0].Address.Street,
          City:
            jsonData.Manufacturer &&
            jsonData.Manufacturer[0].Address &&
            jsonData.Manufacturer[0].Address.City,
          State:
            jsonData.Manufacturer &&
            jsonData.Manufacturer[0].Address &&
            jsonData.Manufacturer[0].Address.State,
          ZipCode:
            jsonData.Manufacturer &&
            jsonData.Manufacturer[0].Address &&
            jsonData.Manufacturer[0].Address.ZipCode,
          Country: {
            "@": {
              Code:
                jsonData.Manufacturer &&
                jsonData.Manufacturer[0].Address &&
                jsonData.Manufacturer[0].Address.Country,
            },
            "#":
              jsonData.Manufacturer &&
              jsonData.Manufacturer[0].Address &&
              jsonData.Manufacturer[0].Address.Country,
          },
        },
      };
    const data = { ...consignee, ...shipper, ...carrier };

    return data;
  }

  async function getDataHouse(jsonData, dataHouses) {
    const dtCurrent = new Date().toLocaleString("en-US");
    const listItems = [];
    const motCode =
      jsonData &&
      jsonData.Master &&
      jsonData.Master.Mot &&
      jsonData.Master.Mot.Code;
    const shipInfo = ((motCode === "40" || motCode === "41") && {
      AirShipmentInfo: {
        AirWayBillNumber: jsonData.Master && jsonData.Master.WayBillNumber,
      },
    }) || {
      OceanShipmentInfo: {
        BillOfLadingNumber: jsonData.Master && jsonData.Master.WayBillNumber,
      },
    };
    for (const house of dataHouses) {
      const data = {
        "@": {
          Type: "SH",
        },
        CreatedOn: dtCurrent && utils.convertDatetoUTC(dtCurrent),
        Number: house.WayBillNumber,
        Direction: "Incoming",
        ModeOfTransportation: {
          "@": {
            Code: motCode || "11",
          },
          Description:
            (jsonData.Master &&
              jsonData.Master.Mot &&
              jsonData.Master.Mot.Description) ||
            "Vessel, Containerized",
          Method: ((motCode === "40" || motCode === "41") && "Air") || "Ocean",
        },
        ...shipInfo,
      };
      listItems.push(data);
    }
    return listItems;
  }
  async function getDataOnlyHouse(jsonData, dataHouses) {
    const dtCurrent = new Date().toLocaleString("en-US");
    const listItems = [];
    const motCode =
      jsonData &&
      jsonData.Master &&
      jsonData.Master.Mot &&
      jsonData.Master.Mot.Code;
    const shipInfo = ((motCode === "40" || motCode === "41") && {
      AirShipmentInfo: {
        AirWayBillNumber: jsonData.Master && jsonData.Master.WayBillNumber,
      },
    }) || {
      OceanShipmentInfo: {
        BillOfLadingNumber: jsonData.Master && jsonData.Master.WayBillNumber,
      },
    };
    const dataEntities = await getDataEntities(jsonData);
    const dataItem =
      jsonData.Items &&
      jsonData.Items.length > 0 &&
      (await getDataItems(jsonData));
    for (const house of dataHouses) {
      const data = {
        "@": {
          Type: "SH",
        },
        CreatedOn: dtCurrent && utils.convertDatetoUTC(dtCurrent),
        Number: house.WayBillNumber,
        Direction: "Incoming",
        ModeOfTransportation: {
          "@": {
            Code: motCode || "11",
          },
          Description:
            (jsonData.Master &&
              jsonData.Master.Mot &&
              jsonData.Master.Mot.Description) ||
            "Vessel, Containerized",
          Method: ((motCode === "40" || motCode === "41") && "Air") || "Ocean",
        },
        ...shipInfo,
        ...dataEntities,
        ...dataItem,
      };
      listItems.push(data);
    }
    return listItems;
  }

  async function getDataHouses(jsonData, dataHouses) {
    const motCode =
      jsonData &&
      jsonData.Master &&
      jsonData.Master.Mot &&
      jsonData.Master.Mot.Code;
    const infoShip =
      ((motCode === "40" || motCode === "41") && "AirShipment") ||
      "OceanShipment";
    const data = {
      HouseShipments: { [infoShip]: await getDataHouse(jsonData, dataHouses) },
    };
    return data;
  }

  async function getDataOnlyHouses(jsonData, dataHouses) {
    const motCode =
      jsonData &&
      jsonData.Master &&
      jsonData.Master.Mot &&
      jsonData.Master.Mot.Code;
    const infoShip =
      ((motCode === "40" || motCode === "41") && "AirShipment") ||
      "OceanShipment";
    const data = {
      HouseShipments: {
        [infoShip]: await getDataOnlyHouse(jsonData, dataHouses),
      },
    };
    return data;
  }

  async function getDataGeneral(jsonData) {
    const originPort = await portValidation(jsonData.Master, "PortOfLading");
    const destinationPort = await portValidation(
      jsonData.Master,
      "PortOfUnlading"
    );
    const releasePort = await portValidation(jsonData.Master, "ReleasePort");
    const itLocation = await portValidation(jsonData.Master, "ITLocation");
    const dtCurrent = new Date().toLocaleString("en-US");
    const firmsCode = jsonData.Master &&
      jsonData.Master.FirmsCode && {
        FIRMSCode: jsonData.Master.FirmsCode.Code,
        FIRMS: {
          Code: jsonData.Master.FirmsCode.Code,
          FacilityName: jsonData.Master.FirmsCode.Name,
        },
      };
    const motCode =
      jsonData &&
      jsonData.Master &&
      jsonData.Master.Mot &&
      jsonData.Master.Mot.Code;
    const shipInfo = ((motCode === "40" || motCode === "41") && {
      AirShipmentInfo: {
        AirWayBillNumber: jsonData.Master && jsonData.Master.WayBillNumber,
        FlightNumber:
          (jsonData.Master && jsonData.Master.VesselFlightNumb) || "",
      },
    }) || {
      OceanShipmentInfo: {
        BillOfLadingNumber: jsonData.Master && jsonData.Master.WayBillNumber,
        VoyageIdentification:
          (jsonData.Master && jsonData.Master.VesselFlightNumb) || "",
        VesselName: (jsonData.Master && jsonData.Master.VesselName) || "",
      },
    };
    const data = {
      CreatedOn:
        (jsonData.CreatedOn && utils.convertDatetoUTC(jsonData.CreatedOn)) ||
        utils.convertDatetoUTC(dtCurrent),
      Number:
        (jsonData.Master && jsonData.Master.RefNumber) ||
        jsonData.Master.WayBillNumber,
      ModeOfTransportation: {
        "@": {
          Code: motCode || "11",
        },
        Description:
          (jsonData.Master &&
            jsonData.Master.Mot &&
            jsonData.Master.Mot.Description) ||
          "Vessel, Containerized",
        Method: ((motCode === "40" || motCode === "41") && "Air") || "Ocean",
      },
      Direction: (jsonData.Master && jsonData.Master.Direction) || "Incoming",
      EstimatedArrivalDate: utils.convertDatetoUTC(
        jsonData.Master && jsonData.Master.ArrivalDate
      ),
      EstimatedDepartureDate: utils.convertDatetoUTC(
        jsonData.Master && jsonData.Master.DepartureDate
      ),

      ...originPort,
      ...destinationPort,
      ...releasePort,
      ITNumber: (jsonData.Master && jsonData.Master.ITNumber) || "",
      ITDate:
        (jsonData.Master &&
          jsonData.Master.ITDate &&
          utils.convertDatetoUTC(jsonData.Master.ITDate)) ||
        utils.convertDatetoUTC(dtCurrent),
      ...itLocation,
      ...firmsCode,
      ...shipInfo,
    };
    return data;
  }

  async function getDataShipment(jsonData) {
    const listHouses = jsonData && jsonData.Houses;
    const wayNumber =
      jsonData && jsonData.Master && jsonData.Master.WayBillNumber;
    for (let i = 0; i < listHouses.length; i += 1) {
      if (listHouses[i].WayBillNumber === wayNumber) {
        listHouses.splice(i, 1);
        i -= 1;
      }
    }
    const dataGeneral = await getDataGeneral(jsonData);
    const dataItem = jsonData.Items && (await getDataItems(jsonData));
    const dataHouse =
      (jsonData.Houses &&
        jsonData.Houses.length !== 1 &&
        (await getDataHouses(jsonData, listHouses))) ||
      (await getDataOnlyHouses(jsonData, listHouses));

    const dataEntities = await getDataEntities(jsonData);

    const data = (jsonData.Houses &&
      jsonData.Houses.length !== 1 && {
        ...dataGeneral,
        ...dataEntities,
        ...dataHouse,
        ...dataItem,
      }) || { ...dataGeneral, ...dataHouse };
    return data;
  }

  async function transformToXml({ jsonData }, type, transactionId) {
    const options = {
      declaration: {
        include: true,
        encoding: "UTF-8",
        version: "1.0",
      },
    };
    const motCode =
      jsonData &&
      jsonData.Master &&
      jsonData.Master.Mot &&
      jsonData.Master.Mot.Code;
    const rootType =
      ((motCode === "40" || motCode === "41") && "AirShipment") ||
      "OceanShipment";
    const root = rootType;

    const xmlShipment = await getDataShipment(jsonData, type);

    const chargesToSend = {
      "@": {
        xmlns: "http://www.magaya.com/XMLSchema/V1",
        Type: type,
        GUID: transactionId,
      },
      ...xmlShipment,
    };

    const xml = js2xmlparser.parse(root, chargesToSend, options);
    console.log("xml: ", xml);
    return xml;
  }

  const createShipment = async (jsonData, transactionId) => {
    const type = "SH";
    const xmlShipment = await transformToXml(
      {
        jsonData,
      },
      type,
      transactionId
    );

    // const flags = 128;
    let errorMsg = "";
    const response = await soapApiClient.setTransaction(
      { xml: xmlShipment, type },
      apiCredentials
    );
    console.log("Response api created shipment: ", response);

    const st =
      (response && response.return === "no_error" && "Imported") || "Failed";
    if (errorMsg === "" && st !== "Imported") {
      errorMsg = (response && (response.error_desc || response.return)) || "";
      logger.info(response);
    }

    return { status: st, error: errorMsg };
  };

  return {
    createShipment,
  };
};
