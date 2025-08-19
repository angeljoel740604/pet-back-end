const helper = require("@magaya/db-helper");
const dateFormat = require("dateformat");
const utils = require("./utils");
const shipmentMgyClient = require("../magaya/shipment-mgy.client");

module.exports.lineItemsMapper = (
  sh,
  SHIPMENT_TYPE,
  entitieManufacturer,
  wayNumber,
  hyperion,
  isConvertWeight
) => {
  const { getTaxIdType } = helper(hyperion).common;
  const { transformTransactions } = helper(hyperion).transactionHyperion;
  const { convertItemTo } = shipmentMgyClient();

  const getItemsData = async (item, containerNo) => {
    const manufacturer = (item.Manufacturer && {
      manufacturer: {
        name: item.Manufacturer.Name,
        address:
          (item.Manufacturer.Address &&
            utils.formatAddress(item.Manufacturer.Address)) ||
          undefined,
        phone: item.Manufacturer.Phone || undefined,
        taxId: item.Manufacturer.ExporterID || undefined,
        taxIdType: getTaxIdType(item.Manufacturer.ExporterIDType),
        dateOfBirth:
          (item.Manufacturer.DateOfBirth &&
            dateFormat(
              new Date(item.Manufacturer.DateOfBirth).toLocaleString("en-US"),
              "mm/dd/yyyy"
            )) ||
          undefined,
        mid: undefined,
      },
    }) || {
      manufacturer:
        (entitieManufacturer && {
          name: entitieManufacturer.name,
          address: entitieManufacturer.address || undefined,
        }) ||
        undefined,
    };
    const htsData =
      // (item.AMSData &&
      //   item.AMSData.HarmonizedTariff &&
      //   item.AMSData.HarmonizedTariff.Code) ||
      undefined;
    const countryOrigin =
      (item.AMSData && item.AMSData.Country && item.AMSData.Country.Code) ||
      undefined;
    const totalWeight = !isConvertWeight
      ? (item.Weight && item.Weight.magnitude) || 0
      : item.Weight && convertItemTo(item.Weight, "kg");
    const weight = totalWeight.toFixed(2);
    const dataItems = {
      wayBillNumber: wayNumber,
      invoiceNumber: item.SupplierInvoiceNumber || "",
      containerNumber: containerNo || "NC",
      partNumber: item.PartNumber,
      tariff: htsData && [{ number: htsData }],
      countryOfOrigin: countryOrigin,
      ...manufacturer,
      description: item.Description,
      totalWeight: item.Weight && { amount: weight, uom: "kg" },
      totalQuantity: { amount: item.Pieces },
      currency: item?.TotalValue?.currencyCode || "USD",
      price: {
        unit_price: item.UnitaryValue && item.UnitaryValue.amount,
        total_price: item.TotalValue && item.TotalValue.amount,
      },
    };

    return dataItems;
  };

  const lineItem = async () => {
    const arrayItems = [];

    const listCommodities =
      (sh.PackingList && sh.PackingList.Items) || sh.Items || undefined;
    if (listCommodities) {
      const itemList = await transformTransactions(
        listCommodities,
        async (it) => {
          if (!it.IsContainer) {
            const dt = await getItemsData(it);
            arrayItems.push(dt);
            return dt;
          }
          if (it.ContainedItems) {
            const itemL = await transformTransactions(
              it.ContainedItems,
              async (itm) => {
                const dt = await getItemsData(itm, it.SerialNumber);
                arrayItems.push(dt);
                return dt;
              }
            );

            return itemL;
          }
          return null;
        }
      );
      await Promise.all(itemList);
      const result = arrayItems;

      // const result = itemResult.filter((it) => !!it);
      return result;
    }
    return null;
  };

  return {
    lineItem,
  };
};
