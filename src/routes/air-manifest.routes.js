const express = require("express");
require("express-async-errors");

const router = express.Router();
const airManifestService = require("../air-manifest/air-manifest.service");
const logger = require("../logger");

/**
 * GET /air-manifest/:id
 * Obtiene los datos del air manifest procesado desde Azure Function
 */
router.get("/:id", async (request, response) => {
  try {
    const { id } = request.params;

    if (!id) {
      return response.status(400).json({ error: "ID is required" });
    }

    const result = await airManifestService.getAirManifest(id);

    if (result) {
      response.json(result);
    } else {
      response.status(404).json({ error: "Air manifest not found" });
    }
  } catch (error) {
    logger.error("Error getting air manifest:", error);
    response.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
});

/**
 * PUT /air-manifest/:id
 * Actualiza los datos del air manifest en Azure Function
 */
router.put("/:id", async (request, response) => {
  try {
    const { id } = request.params;
    const { data } = request.body;

    if (!id) {
      return response.status(400).json({ error: "ID is required" });
    }

    if (!data) {
      return response.status(400).json({ error: "Data is required" });
    }

    const result = await airManifestService.updateAirManifest(id, data);

    if (result) {
      response.json(result);
    } else {
      response.status(400).json({ error: "Failed to update air manifest" });
    }
  } catch (error) {
    logger.error("Error updating air manifest:", error);
    response.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
});

/**
 * GET /air-manifest/by-partition/:partitionKey
 * Obtiene todos los manifests de una partición específica
 */
router.get("/by-partition/:partitionKey", async (request, response) => {
  try {
    const { partitionKey } = request.params;

    if (!partitionKey) {
      return response.status(400).json({ error: "PartitionKey is required" });
    }

    const result = await airManifestService.getManifestsByPartitionKey(partitionKey);

    response.json(result);
  } catch (error) {
    logger.error("Error getting manifests by partition key:", error);
    response.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
});

/**
 * DELETE /air-manifest/:id
 * Elimina un air manifest
 */
router.delete("/:id", async (request, response) => {
  try {
    const { id } = request.params;

    if (!id) {
      return response.status(400).json({ error: "ID is required" });
    }

    const result = await airManifestService.deleteManifest(id);

    response.json(result);
  } catch (error) {
    logger.error("Error deleting air manifest:", error);
    response.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
});

/**
 * POST /air-manifest/create-shipment
 * Crea un shipment en Magaya desde los datos del air manifest
 */
router.post("/create-shipment", async (request, response) => {
  try {
    const { AirManifestId } = request.body;

    if (!AirManifestId) {
      return response.status(400).json({ error: "AirManifestId is required" });
    }

    const result = await airManifestService.createShipment(AirManifestId);

    if (result) {
      response.json(result);
    } else {
      response.status(400).json({ error: "Failed to create shipment" });
    }
  } catch (error) {
    logger.error("Error creating shipment from air manifest:", error);
    response.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
});

module.exports = router;