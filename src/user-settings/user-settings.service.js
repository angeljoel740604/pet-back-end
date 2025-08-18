const helper = require('@magaya/db-helper');
const dateFormat = require('dateformat');
const soapApiClient = require('../mgy-soap-client/magaya-soap.client');
const { userSettingsMapper } = require('./user-settings.mapper');

const apiClient = require('../ai-document-cs/api-client');

module.exports = (hyperion) => {
    const api = apiClient();
    const { employeeList } = helper(hyperion).common;
    const { transformTransactions } = helper(hyperion).transactionHyperion;
    const networkId = hyperion.dbx.Company.NetworkID;

    const getMagayaData = async () => {
        const accountingList = hyperion.dbx.Accounting.Account.List;
        const divisionList = hyperion.dbx.Common.Division.List;
        const contactList = employeeList;
        let contact = contactList.map((c) => {
            return c && { name: c.Name, phone: c.Phone, guid: c.Guid };
        });
        let division = await transformTransactions(divisionList, (d) => {
            return d && { name: d.Name, guid: d.GUID };
        });
        let accountReceivable = await transformTransactions(accountingList, (d) => {
            return (d?.Type === 0 && { name: d.Name, guid: d.id }) || null;
        });
        let accountPayable = await transformTransactions(accountingList, (d) => {
            return d?.Type === 1 && { name: d.Name, guid: d.id };
        });
        accountReceivable = accountReceivable.filter((ch) => !!ch);
        accountPayable = accountPayable.filter((ch) => !!ch);
        division = [{ name: 'NONE', guid: '11111' }].concat(division);
        contact = [{ name: 'NONE', phone: '1', guid: '11111' }].concat(contact);
        accountReceivable = [{ name: 'NONE', guid: '11111' }].concat(accountReceivable);
        accountPayable = [{ name: 'NONE', guid: '11111' }].concat(accountPayable);

        return { division, contact, accountReceivable, accountPayable };
    };

    async function getUserFilersSettings() {
        const magayaData = await getMagayaData();
        const data = await api.doGet('RetrieveUsers');
        const dataApi = await api.doGet('RetrieveSoapApiUser');
        const filers = data.map((it) => ({
            ...it,
            lastAuthDate: dateFormat(it.lastAuthDate, 'mm/dd/yyyy HH:MM'),
            contact: magayaData.contact,
            linkAccountingTransactiontoShipmentHouses:
                (it.linkAccountingTransactiontoShipment === false && 'Not Link') ||
                (it.linkAccountingTransactiontoShipmentHouses === true && 'Houses') ||
                'Master',
            accountingTransactiontoOnlyCharges:
                (it.accountingTransactiontoOnlyCharges === false && 'Transaction') || 'Charge',
            zoneIds:
                (it.zoneIds &&
                    it.zoneIds.map((c) => {
                        return c && { name: c, guid: c };
                    })) ||
                [],
            userApi: dataApi.username,
            paymentChange: it.paymentTransaction,
            division: magayaData.division,
            divisionInfo: it.division,
            accountReceivable: magayaData.accountReceivable,
            accountReceivableInfo: { name: it.accountReceivableName, guid: it.accountReceivableName },
            accountPayable: magayaData.accountPayable,
            accountPayableInfo: { name: it.accountPayableName, guid: it.accountPayableName },
        }));

        return filers;
    }

    async function getFilerDetails(filerCode) {
        const data = await api.doGet('RetrieveUserData', { filerId: filerCode });
        return userSettingsMapper().mapFilerDetails(data);
    }

    function removeFiler(filerCode) {
        return api.doDelete('RemoveUserFilerCode', { filerId: filerCode });
    }

    async function saveUserSettings({
        user,
        used,
        psw,
        filerCode,
        subscribe,
        lastAuthDate,
        importDocuments,
        contactInfo,
        zoneIds,
        convertWeight,
        divisionInfo,
    }) {
        const zoneIdList = zoneIds.map((c) => {
            return c && c.name;
        });
        const requestObj = {
            username: user,
            password: psw || '',
            filerId: filerCode,
            EventSubscribed: subscribe,
            ImportDocuments: importDocuments,
            ContactInfo:
                (contactInfo.name === 'NONE' && { name: '', phone: '', guid: '11111' }) || contactInfo,
            ZoneIds: zoneIdList,
            Division: (divisionInfo.name === 'NONE' && { name: 'NONE', guid: '11111' }) || divisionInfo,

            ConvertWeight: convertWeight,
            EntrySummary: used.indexOf('Entry Summary') !== -1,
            FTZ: used.indexOf('FTZ') !== -1,
            InBond: used.indexOf('In-Bond') !== -1,
            ISF: used.indexOf('ISF') !== -1,
            AMS: used.indexOf('AMS') !== -1,
        };

        const endpoint = (lastAuthDate && 'UpdateApiUser') || 'RegisterApiUser';

        const data = await api.doPost(endpoint, requestObj);
        return data;
    }

    async function saveAccountingSettings({
        filerCode,
        importTransactionsAccounting,
        linkAccountingTransactiontoShipmentHouses,
        accountingTransactiontoOnlyCharges,
        paymentTransaction,
        paymentChange,
        accountReceivable,
        accountPayable,
    }) {
        const requestObj = {
            filerId: filerCode,
            ImportTransactionsAccounting: importTransactionsAccounting,
            LinkAccountingTransactiontoShipment: linkAccountingTransactiontoShipmentHouses !== 'Not Link',
            LinkAccountingTransactiontoShipmentHouses: linkAccountingTransactiontoShipmentHouses === 'Houses',
            AccountingTransactiontoOnlyCharges: accountingTransactiontoOnlyCharges !== 'Transaction',
            PaymentTransaction: paymentTransaction,
            AccountReceivableName: accountReceivable?.name || 'Account Receivable',
            AccountPayableName: accountPayable?.name || 'Account Payable',
        };



        const data = await api.doPost('UpdateApiAccountingUser', requestObj);
        return data;
    }

    async function saveSoapCredentials(username, userPassword) {
        await soapApiClient.initSoapClient(username, userPassword);
        const response = await soapApiClient.testAPI(username, userPassword);
        if (response.status !== 200) {
            const msg =
                (response.status === 400 &&
                    'API credentials are not correct or User is not active. Please check and try again later.') ||
                (response.status === 500 &&
                    'There was a problem connecting to the server. Try again later.') ||
                'There was an internal error. To contact Support, call (786)-845-9150.';
            return { status: 400, message: msg };
        }
        const credentials = await api.doPost('RegisterSoapApiUser', { username, userPassword });
        if (credentials && credentials.wsdlUrl) {
            return { message: 'Credentials successfully saved.' };
        }

        return {
            success: false,
            error: 'There was a problem connecting to the server after the credentials were saved. Try again later.',
        };
    }

    return {
        getUserFilersSettings,
        getFilerDetails,
        removeFiler,
        saveUserSettings,
        saveSoapCredentials,
        saveAccountingSettings,
        getMagayaData,
    };
};
