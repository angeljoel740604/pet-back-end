const helper = require('@magaya/db-helper');
const NoEntityFoundException = require('../exceptions/no-entity-found.exception');
const { inbondMapper } = require('./inbond-cargo.mapper');
const { entitiesMapper } = require('../shared/entities.mapper');
const { lineItemsMapper } = require('../shared/lineItems.mapper');
const apiClient = require('../ai-document-cs/api-client');
const { containerData } = require('../shared/container.data.mapper');
const logger = require('../logger');

module.exports = (hyperion) => {
    const { getShipmentTotalQtyPieces } = helper(hyperion).shipment;
    const { getCargoReleaseByGuid } = helper(hyperion).warehousing;
    const { shipmentType } = helper(hyperion).common;

    async function getBasicCargoByGuid(guid) {
        const sh = await getCargoReleaseByGuid(guid);
        if (!sh) {
            throw new NoEntityFoundException(guid, 'Cargo Release');
        }

        const summaryMapper = inbondMapper(sh, undefined, shipmentType);
        const entitiesSummaryMapper = entitiesMapper(sh, undefined, hyperion);
        const shipmentData = summaryMapper.mapLoadingShipmentData();
        const importer = await entitiesSummaryMapper.mapImporter();
        const notifyParty = await entitiesSummaryMapper.mapNotifyParty();
        const consignee = await entitiesSummaryMapper.mapConsignee();

        return {
            importer,
            notifyParty,
            consignee,
            shipmentData,
        };
    }

    async function sendInbondCargo(guid, data) {
        const api = apiClient();

        const shipData = data.shipment;
        const sh = await getCargoReleaseByGuid(guid);
        if (!sh) {
            throw new NoEntityFoundException(guid, 'Cargo Release');
        }
        const wayBillNumberUI =
            shipData &&
            shipData.shipmentData &&
            shipData.shipmentData.wayBillNumberField.substring(
                4,
                shipData.shipmentData.wayBillNumberField.length,
            );

        const containerInfoList = await containerData(sh, wayBillNumberUI).containerInfo(
            shipmentType,
            'inbond',
        );
        const summaryMapper = inbondMapper(sh, shipData, shipmentType);
        const shipmentData = await summaryMapper.mapShipmentData(containerInfoList);

        const entitiesSummaryMapper = entitiesMapper(sh, shipData, hyperion);
        const imp = await entitiesSummaryMapper.mapImporter();
        const notify = await entitiesSummaryMapper.mapNotifyParty();
        const consig = await entitiesSummaryMapper.mapConsignee();
        const totalQtyPieces = await getShipmentTotalQtyPieces(sh);
        const entryLineIt = await lineItemsMapper(
            sh,
            shipmentType,
            undefined,
            undefined,
            hyperion,
        ).lineItem();
        const entryLineItem = entryLineIt.map((p) => ({
            ...p,
            wayBillNumber: wayBillNumberUI,
        }));

        const waybills = {
            master: {
                number: wayBillNumberUI,
                scac: undefined,
                totalQuantity: totalQtyPieces,
                uom: 'Package',
                layout: 'S',
                foreignLoadPort: undefined,
                countryOfExport: undefined,
                it: undefined,
                totalWeight: sh.TotalWeight && {
                    amount: sh.TotalWeight.magnitude,
                    uom: sh.TotalWeight.unitSymbol,
                },
            },
        };

        const shipmentToSend = {
            shipment: [
                {
                    ...shipmentData,
                    ...((imp && { importer: imp }) || null),
                    notifyParty: notify,
                    consignee: consig,
                    ...((waybills && { wayBill: waybills }) || null),
                    Lineitem: entryLineItem,
                },
            ],
            dataChecked: !!shipData.dataChecked,
            inbondNumber: shipData.inbondNumber || '',
        };

        const js = JSON.stringify(shipmentToSend);
        logger.info(js);
        const response = await api.doPost('CreateInbond', js);
        // const response = shipmentToSend;
        // handle response

        return response;
    }

    return {
        getBasicCargoByGuid,
        sendInbondCargo,
    };
};
