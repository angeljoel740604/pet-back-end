const dateFormat = require('dateformat');
const shipmentMgyClient = require('../magaya/shipment-mgy.client');

module.exports.inbondMapper = (sh, data, SHIPMENT_TYPE) => {
    const { getTotalValue } = shipmentMgyClient();
    const mapShipmentData = async (containerInfoList) => {
        const shipmentData = {
            fileNumber: sh.Number,
            entryType:
                (data.inbondType === 'immediateTransportation' && 61) ||
                (data.inbondType === 'transportationExportation' && 62) ||
                (data.inbondType === 'immediateExportation' && 63),
            carrierCode: sh.Carrier
                ? {
                      scac:
                          sh.Carrier.CarrierTypeCode !== SHIPMENT_TYPE.Air
                              ? sh.Carrier.SCACNumber
                              : sh.Carrier.AirlineCodeNumber,
                  }
                : undefined,
            usPortOfDestination: undefined,
            foreignDestination: undefined,
            exportCountry: undefined,
            estDateOfExport: undefined,
            value: await getTotalValue(sh), // Value sh
            placeOfDelivery: (sh.ReleasedToAddress && sh.ReleasedToAddress.City) || '',
            inbondCarrierId: (sh.Carrier && sh.Carrier.Name) || '',
            carrierCodeOfImportingCountry: 'US',
            modeOfTransportation: '30',
            voyageOrTripNumber: undefined,
            districtOrPortOfImportingConveyanceArrival: undefined,
            estimatedDateOfArrival: undefined,
            exportingCarrier: (sh.Carrier && sh.Carrier.Name) || undefined,
            createInBondOnly: true,
            masterCurrency: (data && data.currency) || 'USD', // (sh.Currency !== null) & (sh.Currency !== undefined) ? sh.Currency.Code : "",
            brokerRefNumber: sh.Number,
            importerRefNumber: sh.Number,
            orderDate:
                (sh.ReleaseDate > 0 &&
                    dateFormat(new Date(sh.ReleaseDate).toLocaleString('en-US'), 'mm/dd/yyyy')) ||
                (sh.CreatedOn > 0 &&
                    dateFormat(new Date(sh.CreatedOn).toLocaleString('en-US'), 'mm/dd/yyyy')) ||
                undefined,
            bookingNumber: undefined,
            containerInfo: containerInfoList,
            firmsCode: data.firmsCodeText,
        };

        return shipmentData;
    };
    const mapLoadingShipmentData = () => {
        const shipmentData = {
            // wayBillNumberField: sh.Number,
            cargoReleaseNumberField: sh.Number,
            shipmentNumber: sh.Number,
            modeOfTransportation: {
                code: '30',
                description: 'Truck',
            },
            carrierCode:
                (sh.Carrier && {
                    scac:
                        sh.Carrier.CarrierTypeCode !== SHIPMENT_TYPE.Air
                            ? sh.Carrier.SCACNumber
                            : sh.Carrier.AirlineCodeNumber,
                }) ||
                undefined,
            carrierCodeOfImportingCountry: 'US',
            inbondCarrierId: (sh.Carrier && sh.Carrier.Name) || '',
            placeOfDelivery: (sh.ReleasedToAddress && sh.ReleasedToAddress.City) || '',
            releaseDate:
                (sh.ReleaseDate > 0 &&
                    dateFormat(new Date(sh.ReleaseDate).toLocaleString('en-US'), 'mm/dd/yyyy')) ||
                undefined,
            createdOn:
                (sh.CreatedOn > 0 &&
                    dateFormat(new Date(sh.CreatedOn).toLocaleString('en-US'), 'mm/dd/yyyy')) ||
                undefined,
            portOfLading: undefined,
            countryOfExport: undefined,
            dateOfArrival: undefined,
            dateOfExport: undefined,
            portOfUnlading: undefined,
            releasePort: undefined,
        };

        return shipmentData;
    };

    return {
        mapShipmentData,
        mapLoadingShipmentData,
    };
};
