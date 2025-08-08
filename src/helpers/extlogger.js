const dateFormat = require('dateformat');

function FormatMessage(mesage) {
    let fecha = new Date();
    let isoDate = dateFormat(fecha.toLocaleString('es-ES'), "yyyy-mm-dd HH:MM:ss.") + fecha.getMilliseconds();
    return isoDate + ': ' + mesage + '\n';
}

function LogMessage(message, type) {
    console.log(FormatMessage(message, type));
}

module.exports = {
    LogMessage : LogMessage
}