const helper = require("@magaya/db-helper");
const utils = require("./utils");

module.exports.entitiesMapper = (sh, data, hyperion) => {
  const { getTaxIdType } = helper(hyperion).common;
  const { transformTransactions } = helper(hyperion).transactionHyperion;

  const getContactsInfo = async (entities) => {
    if (entities.Contacts) {
      const list = await transformTransactions(entities.Contacts, (imp) => {
        const name = (imp && imp.Name) || undefined;
        const phone = (imp && imp.Phone) || undefined;

        return {
          contactName: name,
          contactPhone: phone,
        };
      });
      await Promise.all(list);
      const result = list.filter((ch) => !!ch);

      return result[0];
    }
    return null;
  };

  const mapShipper = async () => {
    const shipper = sh.Shipper;
    return shipper || (data && data.shipper && data.shipper.name)
      ? {
          guid: shipper && shipper.GUID,
          name:
            (data && data.shipper && data.shipper.name) ||
            (shipper && shipper.Name),
          address:
            (data && data.shipper && data.shipper.address) ||
            (shipper && utils.formatAddress(shipper.Address)),
          phone:
            (data && data.shipper && shipper && shipper.Phone) || undefined,
          email:
            (data && data.shipper && shipper && shipper.Email) || undefined,
          fax: (data && data.shipper && shipper && shipper.Fax) || undefined,
          taxId:
            (data && data.shipper && data.shipper.taxId) ||
            (shipper && shipper.ExporterID),
          taxIdType:
            (data && data.shipper && data.shipper.taxIdType) ||
            (shipper && getTaxIdType(shipper.ExporterIDType)),
          contactInfo: shipper && (await getContactsInfo(shipper)),
          mid: data && data.shipper && data.shipper.mid,

        }
      : undefined;
  };

  const mapNotifyParty = async () => {
    const notifyParty = sh.NotifyParty;
    return notifyParty || (data && data.notifyParty && data.notifyParty.name)
      ? {
          guid: notifyParty && notifyParty.GUID,
          name:
            (data && data.notifyParty && data.notifyParty.name) ||
            (notifyParty && notifyParty.Name),
          address:
            (data && data.notifyParty && data.notifyParty.address) ||
            (notifyParty && utils.formatAddress(notifyParty.Address)),
          phone:
            (data && data.notifyParty && notifyParty && notifyParty.Phone) ||
            undefined,
          email:
            (data && data.notifyParty && notifyParty && notifyParty.Email) ||
            undefined,
          fax:
            (data && data.notifyParty && notifyParty && notifyParty.Fax) ||
            undefined,
          taxId:
            (data && data.notifyParty && data.notifyParty.taxId) ||
            (notifyParty && notifyParty.ExporterID),
          taxIdType:
            (data && data.notifyParty && data.notifyParty.taxIdType) ||
            (notifyParty && getTaxIdType(notifyParty.ExporterIDType)),
          contactInfo: notifyParty && (await getContactsInfo(notifyParty)),
          mid: data && data.notifyParty && data.notifyParty.mid,

        }
      : undefined;
  };

  const mapConsignee = async () => {
    const consignee = sh.Consignee;
    return consignee || (data && data.consignee && data.consignee.name)
      ? {
          guid: consignee && consignee.GUID,
          name:
            (data && data.consignee && data.consignee.name) ||
            (consignee && consignee.Name),
          address:
            (data && data.consignee && data.consignee.address) ||
            (consignee && utils.formatAddress(consignee.Address)),
          phone:
            (data && data.consignee && consignee && consignee.Phone) ||
            undefined,
          email:
            (data && data.consignee && consignee && consignee.Email) ||
            undefined,
          fax:
            (data && data.consignee && consignee && consignee.Fax) || undefined,
          taxId:
            (data && data.consignee && data.consignee.taxId) ||
            (consignee && consignee.ExporterID),
          taxIdType:
            (data && data.consignee && data.consignee.taxIdType) ||
            (consignee && getTaxIdType(consignee.ExporterIDType)),
          contactInfo: consignee && (await getContactsInfo(consignee)),
          mid: data && data.consignee && data.consignee.mid,

        }
      : undefined;
  };

  const mapImporter = async () => {
    const importer = sh.Importer;

    return importer || (data && data.importer && data.importer.name)
      ? {
          guid: importer && importer.GUID,
          name:
            (data && data.importer && data.importer.name) ||
            (importer && importer.Name),
          address:
            (data && data.importer && data.importer.address) ||
            (importer && utils.formatAddress(importer.Address)),
          phone:
            (data && data.importer && importer && importer.Phone) || undefined,
          email:
            (data && data.importer && importer && importer.Email) || undefined,
          fax: (data && data.importer && importer && importer.Fax) || undefined,
          taxId:
            (data && data.importer && data.importer.taxId) ||
            (importer && importer.ExporterID),
          taxIdType:
            (data && data.importer && data.importer.taxIdType) ||
            (importer && getTaxIdType(importer.ExporterIDType)),
          contactInfo: importer && (await getContactsInfo(importer)),
          mid: data && data.importer && data.importer.mid,

          parent:
            (importer &&
              importer.Parent && {
                name: importer.Parent.Name,
                ein: importer.Parent.ExporterID,
              }) ||
            null,
        }
      : undefined;
  };

  const mapShipTo = async () => {
    return data && data.shipTo && data.shipTo.name
      ? {
          guid: data.shipTo.GUID,
          name: data && data.shipTo && data.shipTo.name,
          address: data && data.shipTo && data.shipTo.address,
          phone: (data && data.shipTo) || undefined,
          email: (data && data.shipTo) || undefined,
          fax: (data && data.shipTo) || undefined,
          taxId: data && data.shipTo && data.shipTo.taxId,
          taxIdType: data && data.shipTo && data.shipTo.taxIdType,
          contactInfo:
            data && data.shipTo && (await getContactsInfo(data.shipTo)),
          mid: data && data.shipTo && data.shipTo.mid,

        }
      : undefined;
  };

  const mapBookingParty = () => {
    if (!data || !data.bookingParty || !data.bookingParty.name) {
      return undefined;
    }

    return {
      guid: data.bookingParty.GUID,
      name: data.bookingParty.name,
      address:
        data.bookingParty.address ||
        utils.formatAddress(data.bookingParty.Address),
      phone: data.bookingParty.phone || undefined,
      email: data.bookingParty.email || undefined,
      fax: data.bookingParty.fax || undefined,
      taxId: data.bookingParty.taxId || data.bookingParty.ExporterID,
      accountNumber: undefined,
      mid: data.bookingParty && data.bookingParty.mid

    };
  };

  const mapEntities = (shipperEntryMapping, consigneeEntryMapping) => {
    return [
      {
        entityDefault: "Shipper",
        mappings: {
          buyer: shipperEntryMapping.indexOf("buyer") !== -1,
          seller: shipperEntryMapping.indexOf("seller") !== -1,
          manufacturer: shipperEntryMapping.indexOf("manufacturer") !== -1,
          shipTo: shipperEntryMapping.indexOf("shipTo") !== -1,
          importerOfRecord:
            shipperEntryMapping.indexOf("importerOfRecord") !== -1,
          stuffingLocation:
            shipperEntryMapping.indexOf("stuffingLocation") !== -1,
          consolidator: shipperEntryMapping.indexOf("consolidator") !== -1,
          bookingParty: shipperEntryMapping.indexOf("bookingParty") !== -1,
        },
      },
      {
        entityDefault: "Consignee",
        mappings: {
          buyer: consigneeEntryMapping.indexOf("buyer") !== -1,
          seller: consigneeEntryMapping.indexOf("seller") !== -1,
          manufacturer: consigneeEntryMapping.indexOf("manufacturer") !== -1,
          shipTo: consigneeEntryMapping.indexOf("shipTo") !== -1,
          importerOfRecord:
            consigneeEntryMapping.indexOf("importerOfRecord") !== -1,
          stuffingLocation:
            consigneeEntryMapping.indexOf("stuffingLocation") !== -1,
          consolidator: consigneeEntryMapping.indexOf("consolidator") !== -1,
          bookingParty: shipperEntryMapping.indexOf("bookingParty") !== -1,
        },
      },
    ];
  };

  const mapEntitiesDefaults = (entitiesDefaults) =>
    entitiesDefaults.map((def) => ({
      entityType: def.entityDefault,
      defaults: Object.keys(def.mappings).filter((key) => def.mappings[key]),
    }));

  return {
    mapImporter,
    mapShipTo,
    mapBookingParty,
    mapShipper,
    mapConsignee,
    mapEntities,
    mapEntitiesDefaults,
    mapNotifyParty,
  };
};
