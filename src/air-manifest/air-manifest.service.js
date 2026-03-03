const axios = require('axios');
const logger = require('../logger');
const globalContext = require('../global-context');

/**
 * Service for interacting with the Air Manifest Azure Functions.
 */
module.exports = {
  /**
   * Retrieves a processed air manifest by ID.
   * @param {string} id - Document/manifest ID (fileName)
   * @returns {Promise<Object>} Air manifest data
   */
  async getAirManifest(id) {
    try {
      const azureFunctionUrl = process.env.AZURE_FUNCTION_GET_AIR_MANIFEST_URL;
      const apiKey = process.env.AZURE_FUNCTION_API_KEY;
      const token = globalContext.getContext().apiToken;

      if (!azureFunctionUrl) {
        throw new Error('AZURE_FUNCTION_GET_AIR_MANIFEST_URL not configured');
      }

      const response = await axios.get(azureFunctionUrl, {
        params: { id },
        headers: {
          'x-functions-key': apiKey || '',
          Authorization: `Bearer ${token}`
        },
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      logger.error('Error fetching air manifest from Azure Function:', error);

      if (error.response) {
        // Server responded with an error status code
        throw new Error(error.response.data?.message || error.response.data?.error || `HTTP ${error.response.status}`);
      } else if (error.request) {
        // Request was sent but no response was received
        throw new Error('No response from Azure Function');
      } else {
        // Error while setting up the request
        throw error;
      }
    }
  },

  /**
   * Updates an air manifest record.
   * @param {string} id - Document/manifest ID
   * @param {Object} data - Fields to update
   * @returns {Promise<Object>} Updated manifest data
   */
  async updateAirManifest(id, data) {
    try {
      const azureFunctionUrl = process.env.AZURE_FUNCTION_UPDATE_AIR_MANIFEST_URL;
      const apiKey = process.env.AZURE_FUNCTION_API_KEY;
      const token = globalContext.getContext().apiToken;

      if (!azureFunctionUrl) {
        throw new Error('AZURE_FUNCTION_UPDATE_AIR_MANIFEST_URL not configured');
      }

      const response = await axios.put(azureFunctionUrl,
        { id, data },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-functions-key': apiKey || '',
            Authorization: `Bearer ${token}`
          },
          timeout: 30000
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Error updating air manifest in Azure Function:', error);

      if (error.response) {
        throw new Error(error.response.data?.message || error.response.data?.error || `HTTP ${error.response.status}`);
      } else if (error.request) {
        throw new Error('No response from Azure Function');
      } else {
        throw error;
      }
    }
  },

  /**
   * Returns all manifests belonging to a specific partition key.
   * @param {string} partitionKey - Partition key to filter by
   * @returns {Promise<Array>} List of air manifests
   */
  async getManifestsByPartitionKey(partitionKey) {
    try {
      const azureFunctionUrl = process.env.AZURE_FUNCTION_GET_MANIFESTS_BY_PARTITION_URL;
      const apiKey = process.env.AZURE_FUNCTION_API_KEY;
      const token = globalContext.getContext().apiToken;

      if (!azureFunctionUrl) {
        throw new Error('AZURE_FUNCTION_GET_MANIFESTS_BY_PARTITION_URL not configured');
      }

      const response = await axios.get(azureFunctionUrl, {
        params: { partitionKey },
        headers: {
          'x-functions-key': apiKey || '',
          Authorization: `Bearer ${token}`
        },
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      logger.error('Error fetching manifests by partition key from Azure Function:', error);

      if (error.response) {
        throw new Error(error.response.data?.message || error.response.data?.error || `HTTP ${error.response.status}`);
      } else if (error.request) {
        throw new Error('No response from Azure Function');
      } else {
        throw error;
      }
    }
  },

  /**
   * Deletes an air manifest by ID.
   * @param {string} id - ID of the manifest to delete
   * @returns {Promise<Object>} Deletion result
   */
  async deleteManifest(id) {
    try {
      const azureFunctionUrl = process.env.AZURE_FUNCTION_DELETE_AIR_MANIFEST_URL;
      const apiKey = process.env.AZURE_FUNCTION_API_KEY;
      const token = globalContext.getContext().apiToken;

      if (!azureFunctionUrl) {
        throw new Error('AZURE_FUNCTION_DELETE_AIR_MANIFEST_URL not configured');
      }

      const response = await axios.delete(azureFunctionUrl, {
        params: { id },
        headers: {
          'x-functions-key': apiKey || '',
          Authorization: `Bearer ${token}`
        },
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      logger.error('Error deleting air manifest from Azure Function:', error);

      if (error.response) {
        throw new Error(error.response.data?.message || error.response.data?.error || `HTTP ${error.response.status}`);
      } else if (error.request) {
        throw new Error('No response from Azure Function');
      } else {
        throw error;
      }
    }
  },

  /**
   * Uploads an air manifest document to the Azure Function for AI processing.
   * - PDF     → multipart/form-data (uploaded to Blob Storage; sets llmRequest.DocumentUrl)
   * - TXT/CSV → application/json { filename, fileContent } (sets llmRequest.Content)
   *
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} fileName - Original file name
   * @returns {Promise<Object>} Result { id, fileName, fileSize, blobUrl, previewUrl }
   */
  async uploadManifest(fileBuffer, fileName) {
    try {
      const azureFunctionUrl = process.env.AZURE_FUNCTION_UPLOAD_AIR_MANIFEST_URL;
      const apiKey = process.env.AZURE_FUNCTION_API_KEY;
      const token = globalContext.getContext().apiToken;

      if (!azureFunctionUrl) {
        throw new Error('AZURE_FUNCTION_UPLOAD_AIR_MANIFEST_URL not configured');
      }

      const ext = fileName.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
      const isText = ext === '.txt' || ext === '.csv';

      let response;

      if (isText) {
        // Text import: send as JSON so the Azure Function sets llmRequest.Content
        const fileContent = fileBuffer.toString('utf8');
        response = await axios.post(
          azureFunctionUrl,
          { filename: fileName, fileContent },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-functions-key': apiKey || '',
              Authorization: `Bearer ${token}`
            },
            timeout: 60000
          }
        );
      } else {
        // PDF upload: multipart so the Azure Function uploads to Blob and sets llmRequest.DocumentUrl
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('file', fileBuffer, { filename: fileName, contentType: 'application/pdf' });

        response = await axios.post(azureFunctionUrl, formData, {
          headers: {
            ...formData.getHeaders(),
            'x-functions-key': apiKey || '',
            Authorization: `Bearer ${token}`
          },
          timeout: 60000
        });
      }

      return response.data;
    } catch (error) {
      logger.error('Error uploading air manifest to Azure Function:', error);

      if (error.response) {
        throw new Error(error.response.data?.message || error.response.data?.error || `HTTP ${error.response.status}`);
      } else if (error.request) {
        throw new Error('No response from Azure Function');
      } else {
        throw error;
      }
    }
  },

  /**
   * Creates a Magaya shipment from an existing air manifest.
   * @param {string} airManifestId - ID of the source air manifest
   * @returns {Promise<Object>} Shipment creation result
   */
  async createShipment(airManifestId) {
    try {
      const azureFunctionUrl = process.env.AZURE_FUNCTION_CREATE_SHIPMENT_URL;
      const apiKey = process.env.AZURE_FUNCTION_API_KEY;
      const token = globalContext.getContext().apiToken;

      if (!azureFunctionUrl) {
        throw new Error('AZURE_FUNCTION_CREATE_SHIPMENT_URL not configured');
      }

      const response = await axios.post(azureFunctionUrl,
        { AirManifestId: airManifestId },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-functions-key': apiKey || '',
            Authorization: `Bearer ${token}`
          },
          timeout: 60000
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Error creating shipment from air manifest in Azure Function:', error);

      if (error.response) {
        throw new Error(error.response.data?.message || error.response.data?.error || `HTTP ${error.response.status}`);
      } else if (error.request) {
        throw new Error('No response from Azure Function');
      } else {
        throw error;
      }
    }
  }
};
