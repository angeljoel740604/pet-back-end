const axios = require('axios');
const logger = require('../logger');

/**
 * Servicio para interactuar con las Azure Functions del Air Manifest
 */
module.exports = {
  /**
   * Obtiene los datos de un air manifest procesado
   * @param {string} id - ID del archivo/manifest (fileName)
   * @returns {Promise<Object>} Datos del air manifest
   */
  async getAirManifest(id) {
    try {
      const azureFunctionUrl = process.env.AZURE_FUNCTION_GET_AIR_MANIFEST_URL;
      const apiKey = process.env.AZURE_FUNCTION_API_KEY;

      if (!azureFunctionUrl) {
        throw new Error('AZURE_FUNCTION_GET_AIR_MANIFEST_URL not configured');
      }

      const response = await axios.get(azureFunctionUrl, {
        params: { id },
        headers: {
          'x-functions-key': apiKey || ''
        },
        timeout: 30000 // 30 segundos timeout
      });

      return response.data;
    } catch (error) {
      logger.error('Error fetching air manifest from Azure Function:', error);

      if (error.response) {
        // El servidor respondió con un código de error
        throw new Error(error.response.data?.message || error.response.data?.error || `HTTP ${error.response.status}`);
      } else if (error.request) {
        // La petición se hizo pero no se recibió respuesta
        throw new Error('No response from Azure Function');
      } else {
        // Error al configurar la petición
        throw error;
      }
    }
  },

  /**
   * Actualiza los datos de un air manifest
   * @param {string} id - ID del archivo/manifest
   * @param {Object} data - Datos del manifest a actualizar
   * @returns {Promise<Object>} Resultado de la actualización
   */
  async updateAirManifest(id, data) {
    try {
      const azureFunctionUrl = process.env.AZURE_FUNCTION_UPDATE_AIR_MANIFEST_URL;
      const apiKey = process.env.AZURE_FUNCTION_API_KEY;

      if (!azureFunctionUrl) {
        throw new Error('AZURE_FUNCTION_UPDATE_AIR_MANIFEST_URL not configured');
      }

      const response = await axios.put(azureFunctionUrl,
        { id, data },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-functions-key': apiKey || ''
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
   * Crea un shipment en Magaya desde un air manifest
   * @param {string} airManifestId - ID del air manifest
   * @returns {Promise<Object>} Resultado de la creación del shipment
   */
  async createShipment(airManifestId) {
    try {
      const azureFunctionUrl = process.env.AZURE_FUNCTION_CREATE_SHIPMENT_URL;
      const apiKey = process.env.AZURE_FUNCTION_API_KEY;

      if (!azureFunctionUrl) {
        throw new Error('AZURE_FUNCTION_CREATE_SHIPMENT_URL not configured');
      }

      const response = await axios.post(azureFunctionUrl,
        { AirManifestId: airManifestId },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-functions-key': apiKey || ''
          },
          timeout: 60000 // 60 segundos para la creación del shipment
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