const dateFormat = require('dateformat');
const apiClient = require('../ai-document-cs/api-client');

module.exports = (dbx) => {
    async function getConfigurations(token) {
        const response = await apiClient().getConfigurations(token);
        let listData = [];
        response.data.forEach((li) => {
            li.lastAuthDate = dateFormat(li.lastAuthDate, 'mm/dd/yyyy HH:MM');
            listData.push(li);
        });
        return listData;
    }
    async function RemoveUserFilerCode(token, filerCode) {
        const resp = await apiClient().RemoveUserFilerCode(token, filerCode);
        return resp;
    }

    async function RetrieveUserData(token, filer) {
        const resp = await apiClient().RetrieveUserData(token, filer);

        let obj = {};

        const dateFormat = require('dateformat');
        let filerCode = resp.data.filerCode;
        let eventSubscribed = resp.data.eventSubscribed;
        let lastAuthDate = dateFormat(resp.data.lastAuthDate, 'mm/dd/yyyy HH:MM');
        let defaults = resp.data.defaults;

        obj = {
            filerCode: filerCode,
            eventSubscribed: eventSubscribed,
            lastAuthDate: lastAuthDate,
            defaults: defaults,
        };

        return obj;
    }

    async function SaveApiUsers(token, data) {
        let username = data.user;
        let used = data.used;
        let password = data.psw;
        let filerId = data.filerCode;
        let EventSubscribed = data.subscribe;
        let authDate = data.lastAuthDate;

        const options = {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        };
        let dataJson = {
            username: username,
            password: password,
            filerId: filerId,
            EventSubscribed: EventSubscribed,
            EntrySummary: used.indexOf('Entry Summary') !== -1 ? true : false,
            FTZ: used.indexOf('FTZ') !== -1 ? true : false,
            InBond: used.indexOf('Inbond') !== -1 ? true : false,
            ISF: used.indexOf('ISF') !== -1 ? true : false,
        };
        const jsonToSend = JSON.stringify(dataJson);
        const apiUser = authDate === undefined || authDate === '' ? 'RegisterApiUser' : 'UpdateApiUser';

        const response = await apiClient().SaveApiUsers(token, jsonToSend, apiUser);
        // handle response
        return response;
    }

    return {
        getConfigurations,
        RetrieveUserData,
        SaveApiUsers,
        RemoveUserFilerCode,
    };
};
