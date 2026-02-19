const express = require('express');
require('express-async-errors');

const router = express.Router();
const bolService = require('../bill-of-lading/bill-of-lading.service');
const logger = require('../logger');

/**
 * IMPORTANTE: Las rutas específicas deben ir ANTES de las rutas paramétricas
 * para evitar que /:id capture rutas como /by-partition o /create-shipment
 */

/**
 * GET /bill-of-lading/by-partition/:partitionKey
 * Obtiene todos los bills of lading de una partición específica
 */
router.get('/by-partition/:partitionKey', async (request, response) => {
  try {
    const { partitionKey } = request.params;

    if (!partitionKey) {
      return response.status(400).json({ error: 'PartitionKey is required' });
    }

    const result = await bolService.getBolsByPartitionKey(partitionKey);

    response.json(result);
  } catch (error) {
    logger.error('Error getting bills of lading by partition key:', error);
    response.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

/**
 * POST /bill-of-lading/create-shipment
 * Crea un shipment en Magaya desde los datos del bill of lading
 */
router.post('/create-shipment', async (request, response) => {
  try {
    const { BolId } = request.body;

    if (!BolId) {
      return response.status(400).json({ error: 'BolId is required' });
    }

    const result = await bolService.createShipment(BolId);

    if (result) {
      response.json(result);
    } else {
      response.status(400).json({ error: 'Failed to create shipment' });
    }
  } catch (error) {
    logger.error('Error creating shipment from bill of lading:', error);
    response.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

/**
 * GET /bill-of-lading/:id
 * Obtiene los datos de un bill of lading procesado desde Azure Function
 * NOTA: Ruta paramétrica al final para no capturar rutas específicas anteriores
 */
router.get('/:id', async (request, response) => {
  try {
    const { id } = request.params;

    if (!id) {
      return response.status(400).json({ error: 'ID is required' });
    }

    const result = await bolService.getBillOfLading(id);

    if (result) {
      response.json(result);
    } else {
      response.status(404).json({ error: 'Bill of lading not found' });
    }
  } catch (error) {
    logger.error('Error getting bill of lading:', error);
    response.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

/**
 * PUT /bill-of-lading/:id
 * Actualiza los datos del bill of lading en Azure Function
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

    const result = await bolService.updateBillOfLading(id, data);

    if (result) {
      response.json(result);
    } else {
      response.status(400).json({ error: 'Failed to update bill of lading' });
    }
  } catch (error) {
    logger.error('Error updating bill of lading:', error);
    response.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

/**
 * DELETE /bill-of-lading/:id
 * Elimina un bill of lading
 */
router.delete('/:id', async (request, response) => {
  try {
    const { id } = request.params;

    if (!id) {
      return response.status(400).json({ error: 'ID is required' });
    }

    const result = await bolService.deleteBillOfLading(id);

    response.json(result);
  } catch (error) {
    logger.error('Error deleting bill of lading:', error);
    response.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

module.exports = router;
