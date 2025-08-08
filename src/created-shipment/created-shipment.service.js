/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
const helper = require("@magaya/db-helper");
const soapStrategy = require("./strategies/soap-create-shipment.strategy");
const soapApiEntity = require("../mgy-soap-client/soap-created-entity.strategy");
const shipmentMgyClient = require("../magaya/shipment-mgy.client");

module.exports = (apiCredentials, hyperion) => {
  const { setCustomFieldValue, getCustomerByName, editFieldValue } =
    helper(hyperion).common;
  const { getShipmentByGuid } = helper(hyperion).shipment;
  const { getHouses } = shipmentMgyClient();

  const insertShipmentIsf = async (data, transactionId, transactionType) => {
    const response = await soapStrategy(apiCredentials).createShipment(
      data,
      transactionId,
      transactionType
    );
    if (response.status === "Imported") {
      const sh = await getShipmentByGuid(transactionId);

      let shipTo =
        data.ShipTo &&
        data.ShipTo[0] &&
        (await getCustomerByName(data.ShipTo[0].Name));
      if (!shipTo) {
        const responseEntity =
          data.ShipTo &&
          data.ShipTo[0] &&
          (await soapApiEntity(apiCredentials).createEntity(
            data.ShipTo && data.ShipTo[0]
          ));
        if (responseEntity && responseEntity.status === "Imported") {
          shipTo = await getCustomerByName(data.ShipTo[0].Name);
        }
      }
      let consolidators =
        data.Consolidators &&
        data.Consolidators[0] &&
        (await getCustomerByName(data.Consolidators[0].Name));
      if (!consolidators) {
        const responseEntity =
          data.Consolidators &&
          data.Consolidators[0] &&
          (await soapApiEntity(apiCredentials).createEntity(
            data.Consolidators && data.Consolidators[0]
          ));
        if (responseEntity && responseEntity.status === "Imported") {
          consolidators = await getCustomerByName(data.Consolidators[0].Name);
        }
      }
      let stuffingLocations =
        data.StuffingLocations &&
        data.StuffingLocations[0] &&
        (await getCustomerByName(data.StuffingLocations[0].Name));
      if (!stuffingLocations) {
        const responseEntity =
          data.StuffingLocations &&
          data.StuffingLocations[0] &&
          (await soapApiEntity(apiCredentials).createEntity(
            data.StuffingLocations && data.StuffingLocations[0]
          ));
        if (responseEntity && responseEntity.status === "Imported") {
          stuffingLocations = await getCustomerByName(
            data.StuffingLocations[0].Name
          );
        }
      }
      let importer =
        data.Importer && (await getCustomerByName(data.Importer.Name));
      if (!importer) {
        const responseEntity =
          data.Importer &&
          (await soapApiEntity(apiCredentials).createEntity(data.Importer));
        if (responseEntity && responseEntity.status === "Imported") {
          importer = await getCustomerByName(data.Importer.Name);
        }
      }
      let bookingParty =
        data.BookingParty &&
        data.BookingParty[0] &&
        (await getCustomerByName(data.BookingParty[0].Name));
      if (!bookingParty) {
        const responseEntity =
          data.BookingParty &&
          data.BookingParty[0] &&
          (await soapApiEntity(apiCredentials).createEntity(
            data.BookingParty && data.BookingParty[0]
          ));
        if (responseEntity && responseEntity.status === "Imported") {
          bookingParty = await getCustomerByName(data.BookingParty[0].Name);
        }
      }

      console.log("Done!!");
    } else {
      console.log("Error!!");
    }
    return response;
  };

  return {
    insertShipmentIsf,
  };
};
