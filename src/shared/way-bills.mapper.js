const utils = require("./utils");
const shipmentClient = require("../magaya/shipment-mgy.client");

module.exports.wayBillsMapper = (sh, SHIPMENT_TYPE, transactionType) => {
  function getIssuerCodeMaster(house) {
    let result = "";
    const issuerCode =
      (house.Carrier &&
        house.Carrier.CarrierTypeCode !== 1 &&
        house.Carrier.SCACNumber) ||
      (house.Carrier && house.Carrier.AirlineCodeNumber);

    const billNumber =
      (house && house.Type !== 1 && house.BillOfLadingNumber) || "";
    if (house.Carrier && house.Carrier.CarrierTypeCode === 1) {
      return issuerCode;
    }

    const resultBill = issuerCode && billNumber.substring(0, issuerCode.length);
    if (resultBill === issuerCode) {
      result = issuerCode;
    }
    if (resultBill !== issuerCode || !result) {
      result = billNumber.substring(0, 4);
    }

    return result;
  }

  function getBillNumberMaster(house) {
    let result = "";
    const issuerCode =
      house.Carrier && house.Carrier.CarrierTypeCode !== 1
        ? house.Carrier.SCACNumber
        : "";

    const billNumber =
      (house && house.Type !== 1 && house.BillOfLadingNumber) || "";
    const resultBill = billNumber.substring(0, issuerCode.length);
    if (resultBill === issuerCode && issuerCode !== "") {
      result = billNumber.substring(issuerCode.length, billNumber.length);
    }
    if (resultBill !== issuerCode || !result) {
      result = billNumber.substring(4, billNumber.length);
    }
    return result;
  }

  function wayBillNumberInbond(waybillNumber) {
    const result =
      waybillNumber &&
      `${waybillNumber.slice(0, 4)}-${waybillNumber.slice(
        5,
        waybillNumber.length
      )}`;
    return result;
  }

  function getEntitiesHouseIsf(
    house,
    consigneeEntryMapping,
    shipperEntryMapping,
    stuffingLocation,
    consolidator,
    bookingParty,
    shipperMid,
    consigneeMid,
    bookingPartyMid,
    consolidatorMid
  ) {
    const data = {
      shipper:
        (house.Shipper && {
          guid: house.Shipper.GUID,
          name: house.ShipperName,
          address: house && utils.formatAddress(house.ShipperAddress),
          taxId: house.Shipper && house.Shipper.ExporterID,
          mid: shipperMid,
        }) ||
        undefined,
      shipperMapper: shipperEntryMapping,
      consignee:
        (house.Consignee && {
          guid: house.Consignee.GUID,
          name: house.ConsigneeName,
          address: house && utils.formatAddress(house.ConsigneeAddress),
          taxId: house.Consignee && house.Consignee.ExporterID,
          mid: consigneeMid,
        }) ||
        undefined,
      consigneeMapper: consigneeEntryMapping,
      stuffingLocation:
        (stuffingLocation && {
          guid: stuffingLocation.GUID,
          name: stuffingLocation && stuffingLocation.Name,
          address:
            (stuffingLocation &&
              utils.formatAddress(stuffingLocation.Address)) ||
            {},
          taxId: stuffingLocation && stuffingLocation.ExporterID,
          mid: stuffingLocation.mid,
        }) ||
        undefined,
      consolidator:
        (consolidator && {
          guid: consolidator.GUID,
          name: consolidator && consolidator.Name,
          address:
            (consolidator && utils.formatAddress(consolidator.Address)) || {},
          taxId: consolidator && consolidator.ExporterID,
          mid: consolidatorMid,
        }) ||
        undefined,
      bookingParty:
        (bookingParty && {
          guid: bookingParty.GUID,
          name: bookingParty && bookingParty.Name,
          address:
            (bookingParty && utils.formatAddress(bookingParty.Address)) || {},
          taxId: bookingParty && bookingParty.ExporterID,
          mid: bookingPartyMid,
        }) ||
        undefined,
    };
    return data;
  }

  async function mapHouse(
    { house, totalQtyPieces, consigneeEntryMapping, shipperEntryMapping },
    packageType
  ) {
    const isfHouseEntities =
      (transactionType === "isf" &&
        getEntitiesHouseIsf(
          house,
          consigneeEntryMapping,
          shipperEntryMapping
        )) ||
      undefined;
    const houseMap = {
      number:
        (house.Type === SHIPMENT_TYPE.Air && house.AirWaybillNumber) ||
        (transactionType === "inbond" &&
          wayBillNumberInbond(house.BillOfLadingNumber)) ||
        (transactionType === "e214" && house.BillOfLadingNumber) ||
        house.BillOfLadingNumber.substring(4, house.BillOfLadingNumber.length),
      scac:
        house.Type !== SHIPMENT_TYPE.Air
          ? house.BillOfLadingNumber.substring(0, 4)
          : "",
      totalQuantity: totalQtyPieces,
      uom: packageType || "Package",
      foreignLoadPort: house.OriginPort
        ? {
            code: house.OriginPortSchedule,
            name: house.OriginPort.Name,
          }
        : undefined,
      countryOfExport:
        house.OriginPort && house.OriginPort.Country
          ? {
              name: house.OriginPort.Country.Name,
              code: house.OriginPort.Country.Code,
            }
          : undefined,
      containerNumber: await shipmentClient().getContainerNumber(house),
      it: house.ITNumber,
      totalWeight: house.TotalWeight && {
        amount: house.TotalWeight.magnitude,
        uom: house.TotalWeight.unitSymbol,
      },
      ...isfHouseEntities,
    };
    return houseMap;
  }

  const mapWayBillsHouse = async (master, pcs, pcsMaster, packageType) =>
    sh.MasterShipment && {
      master: {
        number:
          (master.Type === SHIPMENT_TYPE.Air &&
            master.AirWaybillNumber.indexOf("-") &&
            master.AirWaybillNumber.replace("-", "")) ||
          master.AirWaybillNumber ||
          (transactionType === "inbond" &&
            wayBillNumberInbond(master.BillOfLadingNumber)) ||
          (transactionType === "e214" && master.BillOfLadingNumber) ||
          master.BillOfLadingNumber.substring(
            4,
            master.BillOfLadingNumber.length
          ),
        scac:
          (master.Type !== SHIPMENT_TYPE.Air &&
            master.BillOfLadingNumber.substring(0, 4)) ||
          (master.Carrier && master.Carrier.AirlineCode),
        totalQuantity: pcsMaster,
        uom: packageType || "Package", // Package Type
        layout: "M",
        foreignLoadPort: master.OriginPort
          ? {
              code: master.OriginPortSchedule,
              name: master.OriginPort.Name,
            }
          : undefined,
        countryOfExport:
          master.OriginPort && master.OriginPort.Country
            ? {
                name: master.OriginPort.Country.Name,
                code: master.OriginPort.Country.Code,
              }
            : undefined,
        it: master.ITNumber,
        totalWeight: master.TotalWeight && {
          amount: master.TotalWeight.magnitude,
          uom: master.TotalWeight.unitSymbol,
        },
        house: [
          {
            number:
              (sh.Type === SHIPMENT_TYPE.Air && sh.AirWaybillNumber) ||
              (transactionType === "inbond" &&
                wayBillNumberInbond(sh.BillOfLadingNumber)) ||
              (transactionType === "e214" && sh.BillOfLadingNumber) ||
              sh.BillOfLadingNumber.substring(4, sh.BillOfLadingNumber.length),
            scac:
              (sh.Type !== SHIPMENT_TYPE.Air &&
                sh.BillOfLadingNumber.substring(0, 4)) ||
              (sh.Carrier && sh.Carrier.AirlineCode),
            totalQuantity: pcs,
            uom: packageType || "Package",
            foreignLoadPort: sh.OriginPort
              ? {
                  code: sh.OriginPortSchedule,
                  name: sh.OriginPort.Name,
                }
              : undefined,
            countryOfExport:
              sh.OriginPort && sh.OriginPort.Country
                ? {
                    name: sh.OriginPort.Country.Name,
                    code: sh.OriginPort.Country.Code,
                  }
                : undefined,
            containerNumber: await shipmentClient().getContainerNumber(sh),
            it: sh.ITNumber,
            totalWeight: sh.TotalWeight && {
              amount: sh.TotalWeight.magnitude,
              uom: sh.TotalWeight.unitSymbol,
            },
          },
        ],
      },
    };

  async function houseDataList(housesList, packageType) {
    const dt = housesList && housesList.map((h) => mapHouse(h, packageType));
    const result = dt && (await Promise.all(dt));
    return result;
  }

  const parentNumberValue = () => {
    if (transactionType === "isf" && sh.MasterShipment) {
      const result =
        (sh.Type === SHIPMENT_TYPE.Air && sh.MasterShipment.AirWaybillNumber) ||
        sh.MasterShipment.BillOfLadingNumber;
      return result;
    }
    return null;
  };

  async function mapWayBills(shipmentTotalQty, housesList, packageType) {
    const houseData = await houseDataList(housesList, packageType);
    const data =
      (sh.HouseCount > 0 && {
        master: {
          number:
            (sh.Type === SHIPMENT_TYPE.Air &&
              sh.AirWaybillNumber.indexOf("-") &&
              sh.AirWaybillNumber.replace("-", "")) ||
            sh.AirWaybillNumber ||
            (transactionType === "inbond" &&
              wayBillNumberInbond(sh.BillOfLadingNumber)) ||
            (transactionType === "e214" && sh.BillOfLadingNumber) ||
            getBillNumberMaster(sh),
          scac:
            (sh.Type === SHIPMENT_TYPE.Air &&
              sh.Carrier &&
              sh.Carrier.AirlineCode) ||
            getIssuerCodeMaster(sh),
          totalQuantity: shipmentTotalQty,
          uom: packageType || "Package",
          layout: "M",
          foreignLoadPort: sh.OriginPort
            ? {
                code: sh.OriginPortSchedule,
                name: sh.OriginPort.Name,
              }
            : undefined,
          countryOfExport:
            sh.OriginPort && sh.OriginPort.Country
              ? {
                  name: sh.OriginPort.Country.Name,
                  code: sh.OriginPort.Country.Code,
                }
              : undefined,
          containerNumber: await shipmentClient().getContainerNumber(sh),
          it: sh.ITNumber,
          totalWeight: sh.TotalWeight && {
            amount: sh.TotalWeight.magnitude,
            uom: sh.TotalWeight.unitSymbol,
          },
          house: houseData,
        },
      }) ||
      (sh.HouseCount === 0 && {
        master: {
          number:
            (sh.Type === SHIPMENT_TYPE.Air &&
              sh.AirWaybillNumber.indexOf("-") &&
              sh.AirWaybillNumber.replace("-", "")) ||
            sh.AirWaybillNumber ||
            (transactionType === "inbond" &&
              wayBillNumberInbond(sh.BillOfLadingNumber)) ||
            (transactionType === "e214" && sh.BillOfLadingNumber) ||
            getBillNumberMaster(sh),
          scac:
            (sh.Type !== SHIPMENT_TYPE.Air &&
              sh.BillOfLadingNumber.substring(0, 4)) ||
            (sh.Carrier && sh.Carrier.AirlineCode),
          totalQuantity: shipmentTotalQty,
          uom: packageType || "Package",

          // logica para mandar number del master
          parentNumber: parentNumberValue(),
          layout:
            (transactionType === "isf" && sh.MasterShipment && "SH") || "S",
          foreignLoadPort: sh.OriginPort
            ? {
                code: sh.OriginPortSchedule,
                name: sh.OriginPort.Name,
              }
            : undefined,
          countryOfExport:
            sh.OriginPort && sh.OriginPort.Country
              ? {
                  name: sh.OriginPort.Country.Name,
                  code: sh.OriginPort.Country.Code,
                }
              : undefined,
          containerNumber: await shipmentClient().getContainerNumber(sh),
          it: sh.ITNumber,
          totalWeight: sh.TotalWeight && {
            amount: sh.TotalWeight.magnitude,
            uom: sh.TotalWeight.unitSymbol,
          },
        },
      });
    return data;
  }

  return {
    mapWayBills,
    mapWayBillsHouse,
  };
};
