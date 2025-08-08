const helper = require('@magaya/db-helper');
const globalContext = require('../global-context');

const shipmentMgyClient = require('../magaya/shipment-mgy.client');

module.exports.containerData = (sh, wayBillNumberUI) => {
    const { hyperion } = globalContext.getContext();
    const { transformTransactions } = helper(hyperion).transactionHyperion;

    const { getWaybillNumber, convertItemTo } = shipmentMgyClient();

    async function containerInfo(shipmentType, transactionType, wayBlNumber, isConvertWeight) {
        const listItems = (sh.PackingList && sh.PackingList.Items) || sh.Items || undefined;
        if (listItems) {
            const itemList = await transformTransactions(listItems, async (it) => {
                if (it.IsContainer || it.UpItem || transactionType === 'inbond') {
                    const listSeal = [];
                    const cntNumber =
                        (it.UpItem && it.UpItem.SerialNumber) ||
                        (it.SerialNumber !== '' && it.SerialNumber) ||
                        (transactionType === 'inbond' && 'NC') ||
                        undefined;
                    const cntSize =
                        (it.UpItem && it.UpItem.Package && it.UpItem.Package.ContainerCode) ||
                        (it.Package && it.Package.ContainerCode) ||
                        undefined;
                    const cntType =
                        (it.UpItem && it.UpItem.Package && it.UpItem.Package.ContainerEquipType) ||
                        (it.Package && it.Package.ContainerEquipType) ||
                        undefined;
                    const seal1 =
                        (it.UpItem && it.UpItem.PartNumber) || (it.PartNumber && it.PartNumber) || undefined;
                    if (seal1) {
                        listSeal.push(seal1);
                    }
                    const seal2 =
                        (it.UpItem && it.UpItem.LotNumber) || (it.LotNumber && it.LotNumber) || undefined;
                    if (seal2) {
                        listSeal.push(seal2);
                    }
                    const seal = listSeal;
                    const desc =
                        (it.UpItem && it.UpItem.Description) ||
                        (it.Description && it.Description) ||
                        undefined;
                    const numbersUnit =
                        (transactionType === 'entry' && 1) ||
                        (it.UpItem && it.UpItem.ContainedPieces) ||
                        (it.ContainedPieces !== '' && it.ContainedPieces) ||
                        undefined;

                    const unitUom = 'CNT';
                    const weightUom =
                        (isConvertWeight && 'kg') ||
                        (it.UpItem && it.UpItem.Weight && it.UpItem.Weight.unitSymbol) ||
                        (it.Weight !== '' && it.Weight.unitSymbol) ||
                        'lb';
                    const contWeight =
                        (it.ContainedWeight && convertItemTo(it.ContainedWeight, weightUom)) || 0;
                    const wght =
                        (it.UpItem && it.UpItem.Weight && convertItemTo(it.UpItem.Weight, weightUom)) ||
                        (it.Weight && convertItemTo(it.Weight, weightUom)) ||
                        0;

                    let weight = (it.IsWeightCalculated && contWeight + wght) || (wght !== 0 && wght) || 0;
                    weight = (transactionType === 'entry' && weight.toFixed(2)) || weight;
                    const note = (it.UpItem && it.UpItem.Notes) || (it.Notes !== '' && it.Notes) || undefined;
                    const haz =
                        (it.Hazardous && {
                            hazardous: {
                                code: it.Hazardous.MaterialCode,
                                class: it.Hazardous.MaterialClass,
                                description: it.Hazardous.ClassDescription,
                                contact: it.Hazardous.EmergencyContact,
                                contactPhone:
                                    it.Hazardous.EmergencyEntity !== undefined
                                        ? it.Hazardous.EmergencyEntity.Phone
                                        : undefined,
                                flashpointTemp: it.Hazardous.FlashpointTemp,
                            },
                        }) ||
                        (it.UpItem &&
                            it.UpItem.Hazardous && {
                                hazardous: {
                                    code: it.UpItem.Hazardous.MaterialClass,
                                    description: it.UpItem.Hazardous.ClassDescription,
                                    contact: it.UpItem.Hazardous.EmergencyContact,
                                    contactPhone:
                                        it.UpItem.Hazardous.EmergencyEntity !== undefined
                                            ? it.UpItem.Hazardous.EmergencyEntity.Phone
                                            : undefined,
                                    flashpointTemp: it.UpItem.Hazardous.FlashpointTemp,
                                },
                            }) ||
                        undefined;
                    const htsData =
                        (it.UpItem &&
                            it.UpItem.AMSData &&
                            it.UpItem.AMSData.HarmonizedTariff &&
                            it.UpItem.AMSData.HarmonizedTariff.Code) ||
                        (it.AMSData && it.AMSData.HarmonizedTariff && it.AMSData.HarmonizedTariff.Code) ||
                        undefined;
                    const countryOrigin =
                        (it.UpItem &&
                            it.UpItem.AMSData &&
                            it.UpItem.AMSData.Country &&
                            it.UpItem.AMSData.Country.Code) ||
                        (it.AMSData && it.AMSData.Country && it.AMSData.Country.Code) ||
                        undefined;
                    const manufacture =
                        (it.UpItem && it.UpItem.Manufacturer) ||
                        (it.Manufacturer && it.Manufacturer.Name) ||
                        undefined;
                    const val =
                        (it.UpItem && it.UpItem.AMSData && it.UpItem.AMSData.Value) ||
                        (it.AMSData && it.AMSData.Value) ||
                        undefined;
                    const wayNumber =
                        (transactionType === 'inbond' && wayBlNumber) ||
                        wayBillNumberUI ||
                        (await getWaybillNumber(it, shipmentType));
                    return (
                        cntNumber && {
                            wayBillNumber: wayNumber,
                            containerNumber: cntNumber,
                            containerSize: cntSize,
                            containerType: cntType,
                            sealInfo: seal,
                            description: desc,
                            numberUnits: numbersUnit,
                            unitsUom: unitUom,
                            grossWeight: weight,
                            grossWeightUom: weightUom,
                            marksNumbers: note,
                            ...haz,
                            hts: htsData,
                            countryofOrigin: countryOrigin,
                            manufacturer: manufacture,
                            value: val,
                        }
                    );
                }
                return null;
            });
            const resultPro = await Promise.all(itemList);
            const result = resultPro.filter((it) => !!it);
            return result;
        }
        return null;
    }

    return {
        containerInfo,
    };
};
