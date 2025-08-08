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

  const getOrCreateEntity = async (entityData, entityName) => {
    if (!entityData) {
      return null;
    }

    let entity = await getCustomerByName(entityName);
    if (!entity) {
      try {
        const response = await soapApiEntity(apiCredentials).createEntity(
          entityData
        );
        if (response && response.status === "Imported") {
          entity = await getCustomerByName(entityName);
        }
      } catch (error) {
        console.error(`Error creating entity ${entityName}:`, error);
      }
    }
    return entity;
  };

  const insertShipmentIsf = async (data, transactionId, transactionType) => {
    const response = await soapStrategy(apiCredentials).createShipment(
      data,
      transactionId,
      transactionType
    );
    if (response.status === "Imported") {
      await getShipmentByGuid(transactionId);

      if (data.ShipTo && data.ShipTo[0]) {
        await getOrCreateEntity(data.ShipTo[0], data.ShipTo[0].Name);
      }

      if (data.Consolidators && data.Consolidators[0]) {
        await getOrCreateEntity(
          data.Consolidators[0],
          data.Consolidators[0].Name
        );
      }

      if (data.StuffingLocations && data.StuffingLocations[0]) {
        await getOrCreateEntity(
          data.StuffingLocations[0],
          data.StuffingLocations[0].Name
        );
      }

      if (data.Importer) {
        await getOrCreateEntity(data.Importer, data.Importer.Name);
      }

      if (data.BookingParty && data.BookingParty[0]) {
        await getOrCreateEntity(
          data.BookingParty[0],
          data.BookingParty[0].Name
        );
      }
    }
    return response;
  };

  return {
    insertShipmentIsf,
  };
};
