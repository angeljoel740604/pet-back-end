const helper = require('@magaya/db-helper');
const NoEntityFoundException = require('../exceptions/no-entity-found.exception');
const { inbondMapper } = require('./inbond.mapper');
const { entitiesMapper } = require('../shared/entities.mapper');
const { lineItemsMapper } = require('../shared/lineItems.mapper');
const { wayBillsMapper } = require('../shared/way-bills.mapper');
const shipmentMgyClient = require('../magaya/shipment-mgy.client');
const apiClient = require('../ai-document-cs/api-client');
const { containerData } = require('../shared/container.data.mapper');
const logger = require('../logger');

module.exports = (hyperion) => {
    const { getShipmentByGuid, getShipmentTotalQtyPieces } = helper(hyperion).shipment;
    const { shipmentType } = helper(hyperion).common;

    const { getHousesBillLadingNumbers, getHouses } = shipmentMgyClient();

    async function getBasicShipmentByGuid(guid) {
        const sh = await getShipmentByGuid(guid);
        if (!sh) {
            throw new NoEntityFoundException(guid, 'Shipment');
        }

        const summaryMapper = inbondMapper(sh, undefined, shipmentType);
        const entitiesSummaryMapper = entitiesMapper(sh, undefined, hyperion);
        const importer = await entitiesSummaryMapper.mapImporter();
        const notifyParty = await entitiesSummaryMapper.mapNotifyParty();
        const consignee = await entitiesSummaryMapper.mapConsignee();
        const shipmentData = summaryMapper.mapLoadingShipmentData();

        let billLadings = [];
        if (sh.HouseCount > 0) {
            billLadings = await getHousesBillLadingNumbers(sh.Houses);
        }

        return {
            importer,
            notifyParty,
            consignee,
            shipmentData,
            billLadings,
        };
    }

    async function sendInbond(guid, data) {
        const api = apiClient();

        const shipData = data && data.shipment;
        const billsData = shipData.billLadings.filter((bd) => bd.selected === true);
        const sh = await getShipmentByGuid(guid);
        if (!sh) {
            throw new NoEntityFoundException(guid, 'Shipment');
        }

        const summaryMapper = inbondMapper(sh, shipData, shipmentType);
        const wayBillMapper = wayBillsMapper(sh, shipmentType, 'inbond');
        // const shipmentData = await Promise.resolve(shiptData);

        const entitiesSummaryMapper = entitiesMapper(sh, shipData, hyperion);
        const imp = await entitiesSummaryMapper.mapImporter();
        const notify = await entitiesSummaryMapper.mapNotifyParty();
        const consig = await entitiesSummaryMapper.mapConsignee();
        const totalQtyPieces = await getShipmentTotalQtyPieces(sh);

        let waybills;
        if (!sh.MasterShipment && sh.Houses) {
            const houses = await getHouses(sh.Houses);

            const houseSelected = houses.filter((array) => {
                return (
                    billsData.filter((anotherOne) => {
                        return array.house.Type === 1
                            ? array.house.AirWaybillNumber === anotherOne.waybillNumber
                            : array.house.BillOfLadingNumber === `${anotherOne.waybillNumber}`;
                    }).length > 0
                );
            });

            waybills = await wayBillMapper.mapWayBills(totalQtyPieces, houseSelected);
        } else {
            const totalQtyPiecesMaster = await getShipmentTotalQtyPieces(sh.MasterShipment);
            waybills = await wayBillMapper.mapWayBillsHouse(
                sh.MasterShipment,
                totalQtyPieces,
                totalQtyPiecesMaster,
            );
        }

        const wayBillNumber = waybills && waybills.master && waybills.master.number;
        const containerInfoList = await containerData(sh).containerInfo(
            shipmentType,
            'inbond',
            wayBillNumber,
        );
        const shipmentData = await summaryMapper.mapShipmentData(containerInfoList);
        const entryLineItem = await lineItemsMapper(
            sh,
            shipmentType,
            undefined,
            wayBillNumber,
            hyperion,
        ).lineItem();

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
        getBasicShipmentByGuid,
        sendInbond,
    };
};
