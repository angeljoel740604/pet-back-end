const helper = require("@magaya/db-helper");

async function validForSend(guid, transactionType, SHIPMENT_TYPE, hyperion) {
  const { getShipmentByGuid } = helper(hyperion).shipment;
  const sh = await getShipmentByGuid(guid);
  const message = [];
  if (sh) {
    if (transactionType !== "inbond" && !sh.Shipper) {
      message.push(
        "The Shipper of Record needs to be specified for Shipments."
      );
    }
    if (!sh.Consignee) {
      message.push(
        "The Consignee of Record needs to be specified for Shipments"
      );
    }
    if (!sh.ModeOfTransportation) {
      message.push(
        "The Mode of Transportation of Record needs to be specified for Shipments"
      );
    }
    if (!sh.Name) {
      message.push("The Waybill Number(s) are required");
    }
    const number =
      sh.Type === SHIPMENT_TYPE.Air
        ? sh.AirWaybillNumber
        : sh.BillOfLadingNumber;
    if (!number) {
      message.push(
        "The Waybill Number of Record needs to be specified for Shipments"
      );
    }
    if (number && number.length < 5) {
      message.push("The Waybill Number must have at least 5 characters");
    }

    if (transactionType === "inbond") {
      if (!sh.NotifyPartyName) {
        message.push(
          "The Notify Party of Record needs to be specified for Shipments"
        );
      }
      if (sh.Type === SHIPMENT_TYPE.Ocean) {
        if (!sh.OnCarriageBy) {
          message.push(
            "The On carriage By of Record needs to be specified for Shipments"
          );
        }
        if (!(sh.DeliveryPort && sh.DeliveryPort.Name)) {
          message.push(
            "The Place of Delivery of Record needs to be specified for Shipments"
          );
        }
      }
      if (sh.Type === SHIPMENT_TYPE.Ground) {
        if (!sh.CarrierName) {
          message.push(
            "The Carrier By of Record needs to be specified for Shipments"
          );
        }
        if (!(sh.DestinationPort && sh.DestinationPort.Name)) {
          message.push(
            "The Arrive To of Record needs to be specified for Shipments"
          );
        }
      }
      // if (
      //     !(sh.PackingList && sh.PackingList.Items) ||
      //     (sh.PackingList && sh.PackingList.Items && sh.PackingList.Items.Count === 0)
      // ) {
      //     message.push(
      //         'Add a container including the container number or a commodity to the shipment before sending the In-Bond to Customs Compliance',
      //     );
      // }
    }
  }

  return message;
}

async function validAmsForSend(guid, transactionType, SHIPMENT_TYPE, hyperion) {
  const { getShipmentByGuid } = helper(hyperion).shipment;
  const { transformTransactions } = helper(hyperion).transactionHyperion;
  const sh = await getShipmentByGuid(guid);
  const message = [];
  if (sh) {
    if (!sh.Shipper) {
      message.push(
        "The Shipper of Record needs to be specified for Shipments."
      );
    }
    if (!sh.Consignee) {
      message.push(
        "The Consignee of Record needs to be specified for Shipments"
      );
    }
    if (!sh.ModeOfTransportation) {
      message.push(
        "The Mode of Transportation of Record needs to be specified for Shipments"
      );
    }
    if (sh.Type !== SHIPMENT_TYPE.Air) {
      message.push("The Mode of Transportation of the Shipment must be Air.");
    }
    const number =
      sh.Type === SHIPMENT_TYPE.Air
        ? sh.AirWaybillNumber
        : sh.BillOfLadingNumber;
    if (!number) {
      message.push(
        "The Waybill Number of Record needs to be specified for Shipments"
      );
    }
    const wayBillNumberFormat = number.substring(4, number.length);
    if (wayBillNumberFormat && wayBillNumberFormat.length < 8) {
      message.push("The Waybill Number must have at least 8 characters");
    }
    if (wayBillNumberFormat && wayBillNumberFormat.length > 8) {
      message.push("The Waybill Number must not have more 8 characters.");
    }
    if (!sh.OriginPort && !sh?.OriginPort?.Code) {
      message.push(
        'The "Departure From" Port of the Shipment cannot be empty.'
      );
    }
    if (sh.OriginPort && sh.OriginPort.Code) {
      const regex = /^[a-zA-Z]{3}$/;
      if (!regex.test(sh.OriginPort.Code)) {
        message.push(
          'The "Departure From" Port code format is not correct. Must be 3 Alphanumeric characters (i.e JFK).'
        );
      }
    }
    if (!sh.DestinationPort && !sh.DestinationPort?.Code) {
      message.push(
        'The "Arrival To Final AirPort" of the Booking cannot be empty.'
      );
    }
    if (sh.DestinationPort && sh.DestinationPort.Code) {
      const regex = /^[a-zA-Z]{3}$/;
      if (!regex.test(sh.OriginPort.Code)) {
        message.push(
          'The "Arrival To Final AirPort" code format is not correct. Must be 3 Alphanumeric characters (i.e JFK).'
        );
      }
    }
    if (!sh.EstimatedDepartureDate) {
      message.push("A Departure Date for the Shipment is required.");
    }
    if (!sh.CarrierName) {
      message.push(
        "The Carrier By of Record needs to be specified for Shipments"
      );
    }
    if (!sh.FIRMSCodeText) {
      message.push(
        "The FIRMS Code By of Record needs to be specified for Shipments"
      );
    }
    if (sh.Houses.length < 0) {
      message.push("Shipment must be consolidation +1 hawb");
    }
    if (
      !(sh.PackingList && sh.PackingList.Items) ||
      (sh.PackingList &&
        sh.PackingList.Items &&
        sh.PackingList.Items.Count === 0)
    ) {
      message.push("Shipment cannot be sent without commodities.");
    }
    if (
      sh.PackingList &&
      sh.PackingList.Items &&
      sh.PackingList &&
      sh.PackingList.Items &&
      sh.PackingList.Items.Count > 0
    ) {
      const listItems = sh.PackingList && sh.PackingList.Items;
      const itemList = await transformTransactions(listItems, async (item) => {
        if (!item.AMSData && !item.AMSData?.HarmonizedTariff) {
          message.push(
            "All commodities in the shipment requires harmonized tariff code information"
          );
        }
        if (!item.Weight) {
          message.push(
            "All commodities in the shipment requires weight information"
          );
        }
        if (!item.TotalValue) {
          message.push(
            "All commodities in the shipment requires value information."
          );
        }
        if (!item.Description) {
          message.push("All commodities in the shipment requires description.");
        }
        if (
          item.IsContainer ||
          item.DbClassType === hyperion.dbx.Common.DbClassType.Container ||
          (item.Package &&
            item.Package.Type ===
              hyperion.dbx.Warehousing.Package.Type.Container) ||
          (item.Package && item.Package.Type === 2)
        ) {
          if (
            item.PackageName !== "D Container" &&
            item.PackageName !== "Type L-N" &&
            item.PackageName !== "Type EH" &&
            item.PackageName !== "Type E" &&
            item.PackageName !== "LD-2 (IATA Type 8D)" &&
            item.PackageName !== "LD-3 (IATA Type 8)" &&
            item.PackageName !== "LD-4 (IATA Type 7A)" &&
            item.PackageName !== "LD-8 (IATA Type 6A)" &&
            item.PackageName !== "LD-11 (IATA Type 6)" &&
            item.PackageName !== "LD-11 Pallet (IATA Type 6)" &&
            item.PackageName !== "LD-7 (IATA Type 5)"
          ) {
            message.push(
              `The Item: ${item.PackageName} is an ocean container and is not supported.`
            );
          }
        }
      });
    }
  }

  return message;
}

module.exports = { validForSend, validAmsForSend };
