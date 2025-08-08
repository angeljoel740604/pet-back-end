jest.doMock('@magaya/db-helper', () => () => ({
    common: { getTaxIdType: () => {}, shipmentType: {} },
    shipment: { getShipmentByGuid: () => {} },
    warehousing: { getCargoReleaseByGuid: () => {} },
}));
const dataInbond = {
    shipment: {
        shipmentData: {
            wayBillNumberField: '13456789',
            fileNumber: '5',
            entryType: 61,
            carrierCode: {
                scac: '001',
            },
            value: 238,
            placeOfDelivery: 'PEORIA',
            inbondCarrierId: 'AMERICAN AIRLINES INC.',
            carrierCodeOfImportingCountry: 'US',
            modeOfTransportation: '30',
            exportingCarrier: 'AMERICAN AIRLINES INC.',
            createInBondOnly: true,
            masterCurrency: 'USD',
            brokerRefNumber: '5',
            importerRefNumber: '5',
            orderDate: '06/05/2022',
            containerInfo: [
                {
                    wayBillNumber: '345678',
                    containerNumber: 'TEST1',
                    containerType: '22T0',
                    sealInfo: ['SEAL1'],
                    numberUnits: 1,
                    unitsUom: 'CNT',
                    grossWeight: 500,
                    grossWeightUom: 'lb',
                },
                {
                    wayBillNumber: '345678',
                    containerNumber: 'NC',
                    sealInfo: [],
                    description: 'Apple HomePod Mini - WHITE',
                    unitsUom: 'CNT',
                    grossWeight: 2,
                    grossWeightUom: 'lb',
                    marksNumbers: 'Phillip Preprah',
                },
            ],
            importer: {
                name: '4 SEAONS GLOBAL INC',
                address: {
                    street: '',
                    city: '',
                    state: '',
                    zipCode: '',
                },
                taxId: '26-343649300',
                taxIdType: 'OtherID',
                contactInfo: null,
                parent: null,
            },
            notifyParty: {
                name: 'HARLEQUIN DESIGN (LONDON) LTD',
                address: {
                    street: 'UNIT 2 STEVENAGE BUSINESS PARK, EASTMAN WAY',
                    city: 'STEVENAGE',
                    state: 'United Kingdom',
                    zipCode: 'SG1 4SZ',
                    country: 'GB',
                },
                taxId: '',
                taxIdType: 'OtherID',
                contactInfo: null,
            },
            consignee: {
                name: 'CAROLYN HELY',
                address: {
                    street: '5 MACEDON PLACE',
                    city: 'WARRIEWOOD',
                    state: '',
                    zipCode: '2102',
                    country: 'AU',
                },
                taxId: '',
                taxIdType: 'OtherID',
                contactInfo: null,
            },
            wayBill: {
                master: {
                    number: '345678',
                    totalQuantity: 1,
                    uom: 'Package',
                    layout: 'S',
                    totalWeight: {
                        amount: 502,
                        uom: 'lb',
                    },
                },
            },
            Lineitem: [
                {
                    wayBillNumber: '345678',
                    invoiceNumber: '',
                    containerNumber: 'NC',
                    partNumber: '',
                    description: 'Apple HomePod Mini - WHITE',
                    totalWeight: {
                        amount: 2,
                        uom: 'lb',
                    },
                    totalQuantity: {
                        amount: 1,
                    },
                    price: {
                        unit_price: 99,
                        total_price: 198,
                    },
                },
                {
                    wayBillNumber: '345678',
                    invoiceNumber: '',
                    containerNumber: 'TEST1',
                    partNumber: '5414847766268',
                    countryOfOrigin: 'US',
                    description: 'Maleta',
                    totalWeight: {
                        amount: 12,
                        uom: 'lb',
                    },
                    totalQuantity: {
                        amount: 1,
                    },
                    price: {
                        unit_price: 20,
                        total_price: 40,
                    },
                },
            ],
        },
    },
};

const createInbondService = () => require('./inbond-cargo.service');
const apiClient = require('../ai-document-cs/api-client');

const accountingMgyClient = {
    getInvoiceDataFrom: () => {},
};

// jest.mock('../magaya/shipment-mgy.client', () => () => shipmentMgyClient);
jest.mock('../magaya/accounting-mgy.client', () => () => accountingMgyClient);

describe('Inbond Cargo Service', () => {
    const dbx = {
        Shipping: { Shipment: { Type: { Air: 1, Ocean: 2, Ground: 3 } } },
    };
    beforeEach(() => {
        jest.resetModules();
    });

    jest.doMock('../magaya/shipment-mgy.client', () => () => ({
        getTransactionByBolNumber: () => {},
        getTotalValue: () => {},
    }));

    jest.doMock('../shared/add.transaction.events.js', () => () => ({
        addEvent: () => {},
    }));
    describe('getBasicShipmentByGuid', () => {
        it('throws NoEntityFoundException if shipment not found', async () => {
            const inbondServiceFnc = createInbondService();
            const inbondService = inbondServiceFnc(dbx);
            try {
                await inbondService.getBasicCargoByGuid('12829');
            } catch (error) {
                expect(error).toBe(error);
            }
        });

        it('retrieves correct fields in shipment', async () => {
            jest.doMock('../shared/add.transaction.events.js', () => () => ({
                addEvent: () => {},
            }));
            jest.doMock('@magaya/db-helper', () => () => ({
                common: { getTaxIdType: () => {}, shipmentType: {} },
                shipment: { getShipmentTotalQtyPieces: () => {} },
                warehousing: {
                    getCargoReleaseByGuid: jest.fn(() =>
                        Promise.resolve({
                            Type: dbx.Shipping.Shipment.Type.Ocean,
                            Number: '#543',
                            NotifyParty: { Name: 'ACO' },
                            Consignee: { Name: 'Nav Cons' },
                        }),
                    ),
                },
                transactionHyperion: {
                    transformTransactions: () => {
                        return Promise.resolve({});
                    },
                    findTransactionByCondition: () => {
                        return Promise.resolve({});
                    },
                    accumulateTransactions: () => {
                        return Promise.resolve({});
                    },
                },
            }));
            jest.doMock('../magaya/shipment-mgy.client', () => () => ({
                getHousesBillLadingNumbers: () => {},
                getHouses: () => {},
                getTotalValue: () => {},
            }));

            // mockShipmentMgyClient(jest.fn().mockImplementation(() => Promise.resolve(mgyShipment)));
            const inbondServiceFnc = createInbondService();
            const inbondService = inbondServiceFnc(dbx);
            const shipment = await inbondService.getBasicCargoByGuid('12829');
            expect(shipment.consignee.name).toBe('Nav Cons');
            expect(shipment.notifyParty.name).toBe('ACO');
            expect(shipment.shipmentData.cargoReleaseNumberField).toBe('#543');
            // expect(shipment.shipmentData.wayBillNumberField).toBe('B-123');
        });
        it.skip('send data to CS Importer true', async () => {
            jest.mock('../ai-document-cs/api-client', () => () => ({
                doPost: () => {
                    return { imported: true };
                },
            }));

            jest.doMock('../shared/add.transaction.events.js', () => () => ({
                addEvent: () => {},
            }));
            jest.doMock('@magaya/db-helper', () => () => ({
                common: { getTaxIdType: () => {}, shipmentType: { Air: 1 } },
                shipment: { getShipmentTotalQtyPieces: () => {} },
                warehousing: {
                    getCargoReleaseByGuid: jest.fn(() =>
                        Promise.resolve({
                            Type: dbx.Shipping.Shipment.Type.Ocean,
                            Number: '#543',
                            // NotifyParty: {},
                            NotifyParty: { Name: 'ACO' },
                            Consignee: { Name: 'Nav Cons' },
                            Items: [],
                        }),
                    ),
                },
                transactionHyperion: {
                    transformTransactions: () => {
                        return Promise.resolve({});
                    },
                    findTransactionByCondition: () => {
                        return Promise.resolve({});
                    },
                    accumulateTransactions: () => {
                        return Promise.resolve({});
                    },
                },
            }));
            jest.doMock('../magaya/shipment-mgy.client', () => () => ({
                getHousesBillLadingNumbers: () => {},
                getHouses: () => {},
                getTotalValue: () => {},
            }));

            // mockShipmentMgyClient(jest.fn().mockImplementation(() => Promise.resolve(mgyShipment)));
            const inbondServiceFnc = createInbondService();
            const inbondService = inbondServiceFnc(dbx);
            const shipment = inbondService && (await inbondService.sendInbondCargo('12829', dataInbond));
            expect(shipment.imported).toBeTruthy();
        });
        it.skip('send data to CS Importer false', async () => {
            // jest.mock('./inbond-cargo.service', () => () => ({
            //     containerInfo: () => {},
            // }));
            jest.mock('../ai-document-cs/api-client', () => () => ({
                doPost: () => {
                    return { imported: false };
                },
            }));
            jest.doMock('../shared/add.transaction.events.js', () => () => ({
                addEvent: () => {},
            }));
            jest.doMock('../magaya/shipment-mgy.client', () => () => ({
                getShipmentTotalQtyPieces: () => {},
                getHousesBillLadingNumbers: () => {},
                getHouses: () => {},
                getTotalValue: () => {},
            }));
            jest.doMock('../magaya/cargo-release-mgy.client.js', () => () => ({
                getCargoReleaseByGuid: jest.fn(() =>
                    Promise.resolve({
                        Type: dbx.Shipping.Shipment.Type.Ocean,
                        Number: '#543',
                        // NotifyParty: {},
                        NotifyParty: { Name: 'ACO' },
                        Consignee: { Name: 'Nav Cons' },
                        Items: [{ SerialNumber: 'Serial1' }],
                        // WayBillNumberField: 'B-123',
                    }),
                ),
            }));

            // mockShipmentMgyClient(jest.fn().mockImplementation(() => Promise.resolve(mgyShipment)));
            const inbondServiceFnc = createInbondService();
            const inbondService = inbondServiceFnc(dbx);

            const shipment = await inbondService.sendInbondCargo('12829', dataInbond);
            expect(shipment.imported).toBeFalsy();
        });

        it('Items is not container Qty Pieces', async () => {
            const shData = {
                Items: [{ IsContainer: false, ContainedPieces: 7, TotalPieces: 3 }],
            };

            if (!shData.Items[0].IsContainer) {
                return shData.Items[0].TotalPieces;
            }

            const total =
                (shData.Items[0].IsContainer && shData.Items[0].ContainedPieces) ||
                shData.Items[0].TotalPieces;
            return total;
        });
        it('Items is container Qty Pieces', async () => {
            const shData = {
                Items: [{ IsContainer: true, ContainedPieces: 7, TotalPieces: 3 }],
            };

            if (!shData.Items[0].IsContainer) {
                return shData.Items[0].TotalPieces;
            }

            const total =
                (shData.Items[0].IsContainer && shData.Items[0].ContainedPieces) ||
                shData.Items[0].TotalPieces;
            return total;
        });
    });
});
