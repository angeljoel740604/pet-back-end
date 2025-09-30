const express = require("express");
require("express-async-errors");
const axios = require("axios");

const router = express.Router();
const airManifestService = require("../air-manifest/air-manifest.service");
const logger = require("../logger");

/**
 * IMPORTANTE: Las rutas específicas deben ir ANTES de las rutas paramétricas
 * para evitar que /:id capture rutas como /pdf-proxy o /by-partition
 */

/**
 * GET /air-manifest/pdf-proxy
 * Proxy para descargar PDFs desde Azure Blob Storage evitando CORS
 * Query param: url - La URL del PDF en Azure Storage
 */
router.get("/pdf-proxy", async (request, response) => {
  try {
    const { url } = request.query;

    if (!url) {
      return response.status(400).json({ error: "URL parameter is required" });
    }

    // Validar que sea una URL de Azure Storage
    if (!url.includes('127.0.0.1:10000') && !url.includes('blob.core.windows.net')) {
      return response.status(400).json({ error: "Invalid Azure Storage URL" });
    }

    logger.info(`Proxying PDF from: ${url}`);

    // Descargar el PDF desde Azure Storage
    const pdfResponse = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'Accept': 'application/pdf'
      }
    });

    // Enviar el PDF al cliente con las cabeceras CORS correctas
    response.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdfResponse.data.length,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600'
    });

    response.send(Buffer.from(pdfResponse.data));
  } catch (error) {
    logger.error("Error proxying PDF:", {
      message: error.message,
      url: request.query.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data?.toString()
    });

    if (error.response) {
      // El servidor de Azure Storage respondió con un error
      const statusCode = error.response.status;
      const errorMessage = error.response.data?.toString() || error.response.statusText;

      return response.status(statusCode).json({
        error: `Azure Storage error: ${errorMessage}`,
        url: request.query.url,
        status: statusCode,
        details: statusCode === 404 ? 'File not found in Azure Storage. The file may have been deleted or the URL is incorrect.' : null
      });
    } else if (error.request) {
      // La petición se hizo pero no se recibió respuesta
      return response.status(503).json({
        error: "Azure Storage is not responding",
        url: request.query.url,
        details: "Check if Azurite is running on 127.0.0.1:10000"
      });
    } else {
      // Error al configurar la petición
      return response.status(500).json({
        error: error.message || "Internal Server Error",
        url: request.query.url
      });
    }
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

/**
 * GET /air-manifest/:id
 * Obtiene los datos del air manifest procesado desde Azure Function
 * NOTA: Esta ruta paramétrica debe ir AL FINAL para no capturar otras rutas específicas
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
 * NOTA: Esta ruta paramétrica debe ir AL FINAL
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
 * DELETE /air-manifest/:id
 * Elimina un air manifest
 * NOTA: Esta ruta paramétrica debe ir AL FINAL
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

module.exports = router;