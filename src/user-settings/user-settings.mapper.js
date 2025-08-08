const dateFormat = require('dateformat');

module.exports.userSettingsMapper = () => {
    const mapFilerDetails = (data) => {
        const { filerCode } = data;
        const { eventSubscribed } = data;
        const lastAuthDate = dateFormat(data.lastAuthDate, 'mm/dd/yyyy HH:MM');
        const { defaults } = data;

        return {
            filerCode,
            eventSubscribed,
            lastAuthDate,
            defaults,
        };
    };

    return {
        mapFilerDetails,
    };
};
