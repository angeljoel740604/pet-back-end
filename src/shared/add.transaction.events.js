const helper = require('@magaya/db-helper');
const globalContext = require('../global-context');

const NoEntityFoundException = require('../exceptions/no-entity-found.exception');

module.exports = () => {
    const { hyperion } = globalContext.getContext();
    const { getCargoReleaseByGuid } = helper(hyperion).warehousing;
    const { getShipmentByGuid } = helper(hyperion).shipment;
    const { collectTransactions } = helper(hyperion).transactionHyperion;

    const AddTransactionEvent = async (transaction, eventName, details, date) => {
        const {
            hyperion: { dbx, algorithm: alg, dbw },
        } = globalContext.getContext();

        const trans = dbx.edit(transaction);
        const list = dbx.Common.Event.EventDefinition.List;
        let foundEvent =
            list && (await alg.find(dbx.using(list)).where((current) => current.Name === eventName));

        const newEvent = new dbx.DbClass.Event();
        if (foundEvent) {
            newEvent.EventDefinition = foundEvent;
        } else {
            foundEvent =
                list &&
                (await alg.find(dbx.using(list)).where((current) => current.Name === 'CBP - ALERT MESSAGE'));
            newEvent.EventDefinition = foundEvent;
        }

        newEvent.Date = Date.parse(date);
        newEvent.Details = details;
        try {
            dbx.insert(trans.Events, newEvent);
            await dbw.save(trans);
            return { delivery: true, msg: '' };
        } catch (error) {
            console.log('Error insert events: ', error);
            // logger.LogMessage(error);
            return { delivery: false, msg: `Error insert events: ${error}` };
        }
    };

    async function addEvent(guid, dataToSend, definition, isIsf, isShip = true) {
        const sh = (isShip && (await getShipmentByGuid(guid))) || (await getCargoReleaseByGuid(guid));
        if (!sh) {
            throw new NoEntityFoundException(guid, 'Shipment');
        }
        if (sh) {
            const dtCurrent = new Date().toLocaleString('en-US');
            const definitions = definition;
            const details = `Number: ${dataToSend.transactionNumber}`;

            // const houses = await getHouses(sh.Houses);
            const houses = sh.Houses;

            const housesList = houses && (await collectTransactions(houses, () => true));

            const houseSelected =
                housesList &&
                dataToSend.bolList &&
                housesList.filter((array) => {
                    return (
                        dataToSend.bolList.billInfo.filter((anotherOne) => {
                            const number =
                                (array.Type === 1 && anotherOne.billNumber) ||
                                (isIsf && `${anotherOne.billNumber}`) ||
                                `${anotherOne.scac}${anotherOne.billNumber}`;
                            return (
                                (array.Type === 1 && array.AirWaybillNumber === number) ||
                                array.BillOfLadingNumber === number
                            );
                        }).length > 0
                    );
                });

            const transactions =
                houseSelected &&
                houseSelected.map(async (hs) => {
                    await AddTransactionEvent(hs, definitions, details, dtCurrent);
                });

            if (transactions) {
                Promise.all(transactions);
            }

            if (!transactions || transactions.length === 0) {
                await AddTransactionEvent(sh, definitions, details, dtCurrent);
            }
        }
    }

    return {
        addEvent,
        AddTransactionEvent,
    };
};
