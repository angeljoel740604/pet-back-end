const express = require('express');
require('express-async-errors');
const axios = require('axios');

const router = express.Router();
const airManifestService = require('../air-manifest/air-manifest.service');
const logger = require('../logger');

/**
 * IMPORTANT: Specific routes must be declared BEFORE parametric routes
 * to prevent /:id from capturing paths like /pdf-proxy or /by-partition
 */

/**
 * GET /air-manifest/pdf-proxy
 * Proxy to download PDFs from Azure Blob Storage, bypassing CORS restrictions.
 * Query param: url - The PDF URL in Azure Storage
 */
router.get('/pdf-proxy', async (request, response) => {
    try {
        const { url } = request.query;

        if (!url) {
            return response.status(400).json({ error: 'URL parameter is required' });
        }

        // Validate that the URL belongs to Azure Storage
        if (!url.includes('127.0.0.1:10000') && !url.includes('blob.core.windows.net')) {
            return response.status(400).json({ error: 'Invalid Azure Storage URL' });
        }

        logger.info(`Proxying PDF from: ${url}`);

        // Download the PDF from Azure Storage
        const pdfResponse = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: {
                Accept: 'application/pdf',
            },
        });

        // Forward the PDF to the client with the correct CORS headers
        response.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdfResponse.data.length,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=3600',
        });

        response.send(Buffer.from(pdfResponse.data));
    } catch (error) {
        logger.error('Error proxying PDF:', {
            message: error.message,
            url: request.query.url,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data?.toString(),
        });

        if (error.response) {
            // Azure Storage responded with an error status
            const statusCode = error.response.status;
            const errorMessage = error.response.data?.toString() || error.response.statusText;

            return response.status(statusCode).json({
                error: `Azure Storage error: ${errorMessage}`,
                url: request.query.url,
                status: statusCode,
                details:
                    statusCode === 404
                        ? 'File not found in Azure Storage. The file may have been deleted or the URL is incorrect.'
                        : null,
            });
        } else if (error.request) {
            // Request was sent but no response was received
            return response.status(503).json({
                error: 'Azure Storage is not responding',
                url: request.query.url,
                details: 'Check if Azurite is running on 127.0.0.1:10000',
            });
        } else {
            // Error while setting up the request
            return response.status(500).json({
                error: error.message || 'Internal Server Error',
                url: request.query.url,
            });
        }
    }
});

/**
 * POST /air-manifest/upload
 * Forwards a document to the Azure Function for AI processing.
 * Accepted formats: PDF, TXT, CSV
 */
router.post('/upload', async (request, response) => {
    try {
        if (!request.files || Object.keys(request.files).length === 0) {
            return response.status(400).json({ error: 'No file uploaded' });
        }

        const file = request.files.file || request.files[Object.keys(request.files)[0]];

        const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
        const accepted = ['.pdf', '.txt', '.jpg', '.jpeg', '.png'];
        if (!accepted.includes(ext)) {
            return response.status(400).json({
                error: `Unsupported file type '${ext}'. Accepted: PDF, TXT, JPG, PNG`,
            });
        }

        const result = await airManifestService.uploadManifest(file.data, file.name);

        response.json(result);
    } catch (error) {
        logger.error('Error uploading air manifest:', error);
        response.status(500).json({
            error: error.message || 'Internal Server Error',
        });
    }
});

/**
 * GET /air-manifest/by-partition/:partitionKey
 * Returns all manifests belonging to a specific partition key.
 */
router.get('/by-partition/:partitionKey', async (request, response) => {
    try {
        const { partitionKey } = request.params;

        if (!partitionKey) {
            return response.status(400).json({ error: 'PartitionKey is required' });
        }

        const result = await airManifestService.getManifestsByPartitionKey(partitionKey);

        response.json(result);
    } catch (error) {
        logger.error('Error getting manifests by partition key:', error);
        response.status(500).json({
            error: error.message || 'Internal Server Error',
        });
    }
});

/**
 * DELETE /air-manifest/:id
 * Deletes an air manifest by ID.
 */
router.delete('/:id', async (request, response) => {
    try {
        const { id } = request.params;

        if (!id) {
            return response.status(400).json({ error: 'ID is required' });
        }

        const result = await airManifestService.deleteManifest(id);

        response.json(result);
    } catch (error) {
        logger.error('Error deleting air manifest:', error);
        response.status(500).json({
            error: error.message || 'Internal Server Error',
        });
    }
});

/**
 * POST /air-manifest/create-shipment
 * Creates a Magaya shipment from an existing air manifest record.
 */
router.post('/create-shipment', async (request, response) => {
    try {
        const { AirManifestId } = request.body;

        if (!AirManifestId) {
            return response.status(400).json({ error: 'AirManifestId is required' });
        }

        const result = await airManifestService.createShipment(AirManifestId);

        if (result) {
            response.json(result);
        } else {
            response.status(400).json({ error: 'Failed to create shipment' });
        }
    } catch (error) {
        logger.error('Error creating shipment from air manifest:', error);
        response.status(500).json({
            error: error.message || 'Internal Server Error',
        });
    }
});

router.post('/update-shipment', async (request, response) => {
    const { AirManifestId, ShipmentId } = request.body;
});
/**
 * GET /air-manifest/:id
 * Returns the processed air manifest data from the Azure Function.
 * NOTE: This parametric route must be declared LAST to avoid capturing specific paths.
 */
router.get('/:id', async (request, response) => {
    try {
        const { id } = request.params;

        if (!id) {
            return response.status(400).json({ error: 'ID is required' });
        }

        const result = await airManifestService.getAirManifest(id);

        if (result) {
            response.json(result);
        } else {
            response.status(404).json({ error: 'Air manifest not found' });
        }
    } catch (error) {
        logger.error('Error getting air manifest:', error);
        response.status(500).json({
            error: error.message || 'Internal Server Error',
        });
    }
});

/**
 * PUT /air-manifest/:id
 * Updates an air manifest record in the Azure Function.
 * NOTE: This parametric route must be declared LAST.
 */
router.put('/:id', async (request, response) => {
    try {
        const { id } = request.params;
        const { data } = request.body;

        if (!id) {
            return response.status(400).json({ error: 'ID is required' });
        }

        if (!data) {
            return response.status(400).json({ error: 'Data is required' });
        }

        const result = await airManifestService.updateAirManifest(id, data);

        if (result) {
            response.json(result);
        } else {
            response.status(400).json({ error: 'Failed to update air manifest' });
        }
    } catch (error) {
        logger.error('Error updating air manifest:', error);
        response.status(500).json({
            error: error.message || 'Internal Server Error',
        });
    }
});

/**
 * DELETE /air-manifest/:id  (duplicate kept for compatibility)
 * NOTE: This parametric route must be declared LAST.
 */
router.delete('/:id', async (request, response) => {
    try {
        const { id } = request.params;

        if (!id) {
            return response.status(400).json({ error: 'ID is required' });
        }

        const result = await airManifestService.deleteManifest(id);

        response.json(result);
    } catch (error) {
        logger.error('Error deleting air manifest:', error);
        response.status(500).json({
            error: error.message || 'Internal Server Error',
        });
    }
});

module.exports = router;
