const helper = require('@magaya/db-helper');
const globalContext = require('../global-context');

module.exports = () => {
    const { hyperion } = globalContext.getContext();
    const { getChargeByCode } = helper(hyperion).accounting;
    const { findTransactionByCondition } = helper(hyperion).transactionHyperion;

    async function getInvoiceDataFrom(accountTransactions) {
        const invoice = await findTransactionByCondition(
            accountTransactions,
            (trans) => trans.Type === hyperion.dbx.Accounting.TransactionType.Invoice,
        );
        return (
            invoice && {
                invoiceNumber: invoice.Number,
                currency: (invoice.Currency && invoice.Currency.Code) || 'USD',
            }
        );
    }

    const getChargesData = async (dataCharges, type) => {
        const listNotFound = [];
        const promCharges = dataCharges.map(async (dataCharge) => {
            const transaction = await getChargeByCode(dataCharge.magaya_reference_code);
            if (!transaction) {
                listNotFound.push(dataCharge.Code);
                return null;
            }

            const result = {
                transaction,
                amount: dataCharge.Amount,
                // description: dataCharge.Description,
            };
            if (type === 'charges') {
                result.applyTo = dataCharge.Vendor_Name;
            }

            return result;
        });

        const charges = await Promise.all(promCharges);
        const result = charges.filter((ch) => !!ch);
        return { found: (result.length === dataCharges.length && result) || [], notFound: listNotFound };
    };

    return {
        getInvoiceDataFrom,
        getChargesData,
    };
};
