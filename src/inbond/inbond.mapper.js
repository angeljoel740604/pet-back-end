const dateFormat = require('dateformat');
const shipmentMgyClient = require('../magaya/shipment-mgy.client');

module.exports.inbondMapper = (sh, data, SHIPMENT_TYPE) => {
    const { getTotalValue } = shipmentMgyClient();
    const mapShipmentData = async (containerInfoList) => {
        const shipmentData = {
            fileNumber: sh.Name,
            entryType:
                (data.inbondType === 'immediateTransportation' && 61) ||
                (data.inbondType === 'transportationExportation' && 62) ||
                (data.inbondType === 'immediateExportation' && 63),
            carrierCode:
                (sh.Type === SHIPMENT_TYPE.Ocean &&
                    sh.OnCarriageByEntity &&
                    sh.OnCarriageByEntity.SCACNumber !== '' && { scac: sh.OnCarriageByEntity.SCACNumber }) ||
                (sh.Type === SHIPMENT_TYPE.Ocean &&
                    sh.Carrier &&
                    sh.Carrier.SCACNumber !== '' && { scac: sh.Carrier.SCACNumber }) ||
                (sh.Type === SHIPMENT_TYPE.Air &&
                    sh.Carrier &&
                    sh.Carrier.AirlineCodeNumber !== '' && { scac: sh.Carrier.AirlineCodeNumber }) ||
                (sh.Type === SHIPMENT_TYPE.Ground &&
                    sh.Carrier &&
                    sh.Carrier.SCACNumber !== '' && { scac: sh.Carrier.SCACNumber }) ||
                undefined,
            usPortOfDestination: sh.DestinationPort
                ? {
                      code: sh.DestinationPortSchedule,
                      countryCode: sh.DestinationPort.Country ? sh.DestinationPort.Country.Code : undefined,
                  }
                : undefined,
            foreignDestination: sh.DestinationPort
                ? {
                      code: sh.DestinationPortSchedule,
                      countryCode: sh.DestinationPort.Country ? sh.DestinationPort.Country.Code : undefined,
                  }
                : undefined,
            exportCountry:
                sh.OriginPort && sh.OriginPort.Country
                    ? {
                          name: sh.OriginPort.Country.Name,
                          code: sh.OriginPort.Country.Code,
                      }
                    : undefined,
            estDateOfExport: {
                date:
                    (sh.ActualDepartureDate > 0 &&
                        dateFormat(new Date(sh.ActualDepartureDate).toLocaleString('en-US'), 'mm/dd/yyyy')) ||
                    (sh.EstimatedDepartureDate > 0 &&
                        dateFormat(
                            new Date(sh.EstimatedDepartureDate).toLocaleString('en-US'),
                            'mm/dd/yyyy',
                        )) ||
                    undefined,
                time:
                    (sh.ActualDepartureDate > 0 &&
                        dateFormat(new Date(sh.ActualDepartureDate).toLocaleString('en-US'), 'HH:MM')) ||
                    (sh.EstimatedDepartureDate > 0 &&
                        dateFormat(new Date(sh.EstimatedDepartureDate).toLocaleString('en-US'), 'HH:MM')) ||
                    undefined,
            },
            // value: 0,
            value: await getTotalValue(sh), // Value sh
            placeOfDelivery:
                (data && data.placeOfDelivery) ||
                (sh.Type === SHIPMENT_TYPE.Ocean && sh.DeliveryPort && sh.DeliveryPort.Name) ||
                (sh.Type === SHIPMENT_TYPE.Ground && sh.DestinationPort && sh.DestinationPort.Name) ||
                (sh.Type === SHIPMENT_TYPE.Air && sh.DestinationPort && sh.DestinationPort.Name) ||
                undefined,
            inbondCarrierId:
                (data && data.inbondCarrierId) ||
                (sh.Type === SHIPMENT_TYPE.Ocean &&
                    sh.OnCarriageByEntity &&
                    sh.OnCarriageByEntity.ExporterID) ||
                (sh.Type === SHIPMENT_TYPE.Ground && sh.Carrier && sh.Carrier.ExporterID) ||
                (sh.Type === SHIPMENT_TYPE.Air && sh.Carrier && sh.Carrier.ExporterID) ||
                undefined,
            carrierCodeOfImportingCountry: 'US',
            // modeOfTransportation: sh.ModeOfTransportation ? sh.ModeOfTransportation.Code : undefined,
            modeOfTransportation:
                (sh.Type === SHIPMENT_TYPE.Air && sh.ModeOfTransportation && sh.ModeOfTransportation.Code) ||
                '30',
            voyageOrTripNumber:
                (sh.Type === SHIPMENT_TYPE.Air && sh.FlightNumber && sh.FlightNumber.substring(0, 5)) ||
                (sh.Type === SHIPMENT_TYPE.Ocean &&
                    sh.VoyageIdentification &&
                    sh.VoyageIdentification.substring(0, 5)) ||
                undefined,
            districtOrPortOfImportingConveyanceArrival: sh.DestinationPort
                ? {
                      code: sh.DestinationPortSchedule,
                      countryCode: sh.DestinationPort.Country ? sh.DestinationPort.Country.Code : undefined,
                  }
                : undefined,
            estimatedDateOfArrival: {
                date:
                    (sh.ActualArrivalDate > 0 &&
                        dateFormat(new Date(sh.ActualArrivalDate).toLocaleString('en-US'), 'mm/dd/yyyy')) ||
                    (sh.EstimatedArrivalDate > 0 &&
                        dateFormat(
                            new Date(sh.EstimatedArrivalDate).toLocaleString('en-US'),
                            'mm/dd/yyyy',
                        )) ||
                    undefined,
            },
            exportingCarrier: (sh.Carrier && sh.Carrier.Name) || undefined,
            createInBondOnly: true,

            masterCurrency: (data && data.currency) || 'USD', // (sh.Currency !== null) & (sh.Currency !== undefined) ? sh.Currency.Code : "",
            brokerRefNumber: sh.Name,
            importerRefNumber: sh.Name,
            orderDate:
                (sh.CreatedOn > 0 &&
                    dateFormat(new Date(sh.CreatedOn).toLocaleString('en-US'), 'mm/dd/yyyy')) ||
                undefined,
            bookingNumber: sh.BookingNumer,
            containerInfo: containerInfoList,
            firmsCode: sh.FIRMSCodeText,
        };

        return shipmentData;
    };
    const mapLoadingShipmentData = () => {
        const shipmentData = {
            wayBillNumberField: sh.Type === SHIPMENT_TYPE.Air ? sh.AirWaybillNumber : sh.BillOfLadingNumber,
            shipmentNumber: sh.Name,
            // modeOfTransportation: {
            //     code: '30',
            //     description: 'Truck',
            // },
            modeOfTransportation: (sh.Type === SHIPMENT_TYPE.Air &&
                sh.ModeOfTransportation && {
                    code: sh.ModeOfTransportation.Code,
                    description: sh.ModeOfTransportation.Description,
                }) || {
                code: '30',
                description: 'Truck',
            },
            portOfLading: sh.OriginPort
                ? {
                      code: sh.OriginPortSchedule,
                      name: sh.OriginPort.Name,
                  }
                : undefined,
            countryOfExport:
                sh.OriginPort && sh.OriginPort.Country
                    ? {
                          name: sh.OriginPort.Country.Name,
                          code: sh.OriginPort.Country.Code,
                      }
                    : undefined,
            dateOfArrival: {
                date:
                    (sh.ActualArrivalDate > 0 &&
                        dateFormat(new Date(sh.ActualArrivalDate).toLocaleString('en-US'), 'mm/dd/yyyy')) ||
                    (sh.EstimatedArrivalDate > 0 &&
                        dateFormat(
                            new Date(sh.EstimatedArrivalDate).toLocaleString('en-US'),
                            'mm/dd/yyyy',
                        )) ||
                    undefined,
            },
            dateOfExport: {
                date:
                    (sh.ActualDepartureDate > 0 &&
                        dateFormat(new Date(sh.ActualDepartureDate).toLocaleString('en-US'), 'mm/dd/yyyy')) ||
                    (sh.EstimatedDepartureDate > 0 &&
                        dateFormat(
                            new Date(sh.EstimatedDepartureDate).toLocaleString('en-US'),
                            'mm/dd/yyyy',
                        )) ||
                    undefined,
            },
            portOfUnlading: sh.DestinationPort
                ? {
                      code: sh.DestinationPortSchedule,
                      name: sh.DestinationPort.Name,
                  }
                : undefined,
            releasePort:
                (sh.DeliveryPort && {
                    code: sh.DeliveryPort.Code,
                    name: sh.DeliveryPort.Name,
                }) ||
                (sh.DestinationPort && {
                    code: sh.DestinationPortSchedule,
                    name: sh.DestinationPort.Name,
                }),
            // Carrier if TRUCK
            inbondCarrierId:
                (sh.Type === SHIPMENT_TYPE.Ocean &&
                    sh.OnCarriageByEntity &&
                    sh.OnCarriageByEntity.ExporterID) ||
                (sh.Type === SHIPMENT_TYPE.Ground && sh.Carrier && sh.Carrier.ExporterID) ||
                (sh.Type === SHIPMENT_TYPE.Air && sh.Carrier && sh.Carrier.ExporterID) ||
                undefined,
            // arrive to TRUCK
            placeOfDelivery:
                (sh.Type === SHIPMENT_TYPE.Ocean && sh.DeliveryPort && sh.DeliveryPort.Name) ||
                (sh.Type === SHIPMENT_TYPE.Ground && sh.DestinationPort && sh.DestinationPort.Name) ||
                (sh.Type === SHIPMENT_TYPE.Air && sh.DestinationPort && sh.DestinationPort.Name) ||
                undefined,
        };

        return shipmentData;
    };

    return {
        mapShipmentData,
        mapLoadingShipmentData,
    };
};
