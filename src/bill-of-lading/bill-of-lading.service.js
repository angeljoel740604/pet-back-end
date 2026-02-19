const axios = require('axios');
const logger = require('../logger');

/**
 * Servicio para interactuar con las Azure Functions del Bill of Lading
 */
module.exports = {
  /**
   * Obtiene los datos de un bill of lading procesado
   * @param {string} id - ID del documento
   * @returns {Promise<Object>} Datos del bill of lading
   */
  async getBillOfLading(id) {
    try {
      const azureFunctionUrl = process.env.AZURE_FUNCTION_GET_BOL_URL;
      const apiKey = process.env.AZURE_FUNCTION_API_KEY;

      if (!azureFunctionUrl) {
        throw new Error('AZURE_FUNCTION_GET_BOL_URL not configured');
      }

      const response = await axios.get(azureFunctionUrl, {
        params: { id },
        headers: { 'x-functions-key': apiKey || '' },
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      logger.error('Error fetching bill of lading from Azure Function:', error);

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
   * Actualiza los datos de un bill of lading
   * @param {string} id - ID del documento
   * @param {Object} data - Datos a actualizar
   * @returns {Promise<Object>} Resultado de la actualización
   */
  async updateBillOfLading(id, data) {
    try {
      const azureFunctionUrl = process.env.AZURE_FUNCTION_UPDATE_BOL_URL;
      const apiKey = process.env.AZURE_FUNCTION_API_KEY;

      if (!azureFunctionUrl) {
        throw new Error('AZURE_FUNCTION_UPDATE_BOL_URL not configured');
      }

      const response = await axios.put(
        azureFunctionUrl,
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
      logger.error('Error updating bill of lading in Azure Function:', error);

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
   * Obtiene todos los bills of lading de una partición específica
   * @param {string} partitionKey - Clave de partición (client ID)
   * @returns {Promise<Array>} Lista de bills of lading
   */
  async getBolsByPartitionKey(partitionKey) {
    try {
      const azureFunctionUrl = process.env.AZURE_FUNCTION_GET_BOLS_BY_PARTITION_URL;
      const apiKey = process.env.AZURE_FUNCTION_API_KEY;

      if (!azureFunctionUrl) {
        throw new Error('AZURE_FUNCTION_GET_BOLS_BY_PARTITION_URL not configured');
      }

      const response = await axios.get(azureFunctionUrl, {
        params: { partitionKey },
        headers: { 'x-functions-key': apiKey || '' },
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      logger.error('Error fetching bills of lading by partition key from Azure Function:', error);

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
   * Elimina un bill of lading
   * @param {string} id - ID del documento a eliminar
   * @returns {Promise<Object>} Resultado de la eliminación
   */
  async deleteBillOfLading(id) {
    try {
      const azureFunctionUrl = process.env.AZURE_FUNCTION_DELETE_BOL_URL;
      const apiKey = process.env.AZURE_FUNCTION_API_KEY;

      if (!azureFunctionUrl) {
        throw new Error('AZURE_FUNCTION_DELETE_BOL_URL not configured');
      }

      const response = await axios.delete(azureFunctionUrl, {
        params: { id },
        headers: { 'x-functions-key': apiKey || '' },
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      logger.error('Error deleting bill of lading from Azure Function:', error);

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
   * Crea un shipment en Magaya desde un bill of lading
   * @param {string} bolId - ID del bill of lading
   * @returns {Promise<Object>} Resultado de la creación del shipment
   */
  async createShipment(bolId) {
    try {
      const azureFunctionUrl = process.env.AZURE_FUNCTION_CREATE_BOL_SHIPMENT_URL;
      const apiKey = process.env.AZURE_FUNCTION_API_KEY;

      if (!azureFunctionUrl) {
        throw new Error('AZURE_FUNCTION_CREATE_BOL_SHIPMENT_URL not configured');
      }

      const response = await axios.post(
        azureFunctionUrl,
        { BolId: bolId },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-functions-key': apiKey || ''
          },
          timeout: 60000
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Error creating shipment from bill of lading in Azure Function:', error);

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
