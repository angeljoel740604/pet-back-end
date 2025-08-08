const express = require("express");
require("express-async-errors");

const globalContext = require("../global-context");

const router = express.Router();

const shipmentService = require("../created-shipment/created-shipment.service");
const logger = require("../logger");

router.post("/create-shipment", async (request, response) => {
  try {
    const { hyperion } = globalContext.getContext();
    const { ApiCredentials, Payload, TransactionId, TransactionType } =
      request.body;
    const result = await shipmentService(
      ApiCredentials,
      hyperion
    ).insertShipmentIsf(Payload, TransactionId, TransactionType);
    if (result) {
      response.json(result);
    } else {
      response.status(400).json({ message: result.message });
      logger.error(result.message);
    }
  } catch (exc) {
    if (exc.status) {
      response.status(exc.status).json({ error: exc.message });
      logger.error(exc.message);
    } else {
      response
        .status(500)
        .json({ error: exc.message || "Internal Server Error" });
      logger.error(exc.message || "Internal Server Error");
    }
  }
});

module.exports = router;
