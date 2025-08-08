const path = require('path');
const logger = require('./extlogger');
const fs = require('fs');

async function SaveCustomFieldValue(transaction, hyperion, internal_name, value) {
    try {
        const interf = await hyperion.dbw.edit(transaction);
        interf.CustomFields[internal_name] = value;
        await hyperion.dbw.save(interf);
        return true;
    } catch (error) {
        logger.LogMessage(error);
        return false;
    }
}
async function SaveTransactionEvent(transaction, hyperion, event_name, details, date) {
    const interf = await hyperion.dbw.edit(transaction);
    const list = hyperion.dbx.Common.Event.EventDefinition.List;
    const foundEvent =
        list &&
        (await hyperion.algorithm
            .find(hyperion.dbx.using(list))
            .where((current) => current.Name === event_name));

    const newEvent = new hyperion.dbx.DbClass.Event();
    if (foundEvent) newEvent.EventDefinition = foundEvent;

    newEvent.Date = date;
    newEvent.Details = details;
    try {
        hyperion.dbx.insert(interf.Events, newEvent);
        await hyperion.dbw.save(interf);
        return true;
    } catch (error) {
        logger.LogMessage(error);
        return false;
    }
}

function DeleteFile(file) {
    fs.unlink(file, function (err) {
        if (err) {
            logger.LogMessage('Problem deleting a file locally!');
        }
    });
}

async function SaveAttachment(trans, hyperion, file) {
    try {
        const editTrans = await hyperion.dbw.edit(trans);
        const att = new hyperion.dbx.DbClass.Attachment(file);
        hyperion.dbx.insert(editTrans.Attachments, att);
        await hyperion.dbw.save(editTrans);
        //Log succesful insertion Trans type and number
        return true;
    } catch (ex) {
        logger.LogMessage('Error saving the attachment to transaction.');
        return false;
    }
}

async function SaveAttachmentFromBase64(trans, hyperion, fileAsBase64) {
    const uploadsFolder = path.join(process.env.ExtensionConfigFolder, '../uploads');
    const tempFile = path.join(uploadsFolder, fileAsBase64.fileName);
    try {
        const buffer = Buffer.from(fileAsBase64.content, 'base64');
        if (!fs.existsSync(uploadsFolder)) {
            fs.mkdirSync(uploadsFolder);
        }
        fs.writeFileSync(tempFile, buffer);
    } catch (error) {
        logger.LogMessage(
            `Unable to save file temporarily before adding it as an attachment. ${fileAsBase64.fileName}`,
        );
        return false;
    }
    const result = await SaveAttachment(trans, hyperion, tempFile);
    DeleteFile(tempFile);
    return result;
}

function AddCustomFieldValueToEditTrans(editTrans, internal_name, value) {
    try {
        editTrans.CustomFields[internal_name] = value;
        return true;
    } catch (error) {
        logger.LogMessage('Error while adding Custom Field value to an editable Transaction.');
        logger.LogMessage('Error message: ' + error);
        return false;
    }
}

async function AddEventToEditTransaction(editTrans, hyperion, event_name, details) {
    const list = hyperion.dbx.Common.Event.EventDefinition.List;
    const foundEvent = await hyperion.algorithm
        .find(hyperion.dbx.using(list))
        .where((current) => current.Name === event_name);

    let newEvent = new hyperion.dbx.DbClass.Event();

    if (foundEvent) newEvent.EventDefinition = foundEvent;

    newEvent.Details = details;
    try {
        hyperion.dbx.insert(editTrans.Events, newEvent);
        return true;
    } catch (error) {
        logger.LogMessage(error);
        return false;
    }
}

async function AddAttachmentFromBase64ToEditTrans(editTrans, hyperion, fileAsBase64) {
    let uploadsFolder = path.join(process.env.ExtensionConfigFolder, '../uploads');
    let tempFile = path.join(uploadsFolder, fileAsBase64.fileName);
    try {
        let buffer = Buffer.from(fileAsBase64.content, 'base64');
        if (!fs.existsSync(uploadsFolder)) fs.mkdirSync(uploadsFolder);
        fs.writeFileSync(tempFile, buffer);
    } catch (error) {
        logger.LogMessage(
            'Unable to save file temporarily before adding it as an atachment.' + fileAsBase64.fileName,
        );
        return false;
    }
    let result = await AddAttachmentToEditTrans(editTrans, hyperion, tempFile);
    DeleteFile(tempFile);
    return result;
}

async function AddAttachmentToEditTrans(editTrans, hyperion, file) {
    try {
        let att = new hyperion.dbx.DbClass.Attachment(file);
        hyperion.dbx.insert(editTrans.Attachments, att);
        return true;
    } catch (ex) {
        logger.LogMessage('Error adding the attachment to transaction in edit Mode.');
        return false;
    }
}

async function GetTransactionForEdit(trans, hyperion) {
    try {
        let editTrans = await hyperion.dbw.edit(trans);
        return editTrans;
    } catch (ex) {
        logger.LogMessage('Error retreiving Transaction for edition.');
        logger.LogMessage('Error Message: ' + error);
        return null;
    }
}

async function CommitTransaction(editedRecord, hyperion) {
    try {
        await hyperion.dbw.save(editedRecord);
        //Log succesful insertion Trans type and number
        return true;
    } catch (error) {
        logger.LogMessage('Error saving Transacion in Magaya.');
        logger.LogMessage('Error Message: ' + error);
        return false;
    }
}

function DateToSATString(date) {
    function pad(number) {
        if (number < 10) {
            return '0' + number;
        }
        return number;
    }
    return (
        date.getFullYear().toString() +
        '-' +
        pad(date.getMonth() + 1) +
        '-' +
        pad(date.getDate()) +
        'T' +
        pad(date.getHours()) +
        ':' +
        pad(date.getMinutes()) +
        ':' +
        pad(date.getSeconds())
    );
}

function DateToSATStringNoTime(date) {
    function pad(number) {
        if (number < 10) {
            return '0' + number;
        }
        return number;
    }
    return (
        date.getFullYear().toString() +
        '-' +
        pad(date.getMonth() + 1) +
        '-' +
        pad(date.getDate()) +
        'T00:00:00'
    );
}

async function IsHomeCurrency(currencyCode, hyp) {
    const alg = hyp.algorithm;
    const dbx = hyp.dbx;
    let currencies = dbx.Common.Currency.List;
    let hc = await alg.find(dbx.using(currencies)).where(function (obj) {
        return obj.Code === currencyCode && obj.IsHomeCurrency;
    });
    return hc;
}

function formatAddress(address) {
    if (address == null) return '';
    return {
        Street: address.Street,
        City: address.City,
        State: address.State,
        ZipCode: address.ZipCode,
        Country: address.CountryName,
    };
}

function getPackageType(hyperionObj) {
    var typeArr = [
        'Container', //0
        'Other', //1
        'Pallet', //2
        'Box', //3
        'Bag', //4
        'Drum', //5
        'Skid', //6
        'Tank', //7
        'Crate', //8
        'Barrel', //9
        'Bottle', //10
        'Basket', //11
        'Cabinet', //12
        'Cones', //13
        'Cylinder', //14
        'Envelope', //15
        'Frame', //16
        'Gallon', //17
        'Parcel', //18
        'Pieces', //19
        'Package', //20
        'Rack', //21
        'Roll', //22
        'Sheet', //23
        'Tube', //24
        'Tray', //25
        'Vehicles', //26
        'Wrapped', //27
        'Bundle', //28
        'BingChest', //29
        'Bin', //30
        'Bucket', //31
        'Bale', //32
        'Can', //33
        'Carcass', //34
        'Case', //35
        'Carboy', //36
        'ContainerBulkCargo', //37
        'CanCase', //38
        'Chest', //39
        'Coil', //40
        'Cord', //41
        'Cask', //42
        'Carton', //43
        'DryBulk', //44
        'HeadOfBeef', //45
        'Hamper', //46
        'Keg', //47
        'LiquidBulk', //48
        'Log', //49
        'Lug', //50
        'LiftVan', //51
        'Pail', //52
        'PrivatelyOwnedVehicle', //53
        'QuarterOfBeef', //54
        'ToteBin', //55
        'Tin', //56
        'Unit', //57
        'Pack', //58
        'WoodenCase', //59
    ];
    return hyperionObj ? typeArr[hyperionObj.Type] : '';
}



function getInvoice(hyperionObj) {
    var transactions = hyperionObj.AccountTransactions;
    if (!transactions || transactions.Count == 0) {
        return null;
    }
    var invoice = null;
    dbx.using(transactions).iterate(function (transaction) {
        if (transaction.Type != dbx.Accounting.TransactionType.Invoice) return true;
        else {
            invoice = transaction;
            return false;
        }
    });
    return invoice;
}

module.exports = {
    // GetCompanyLogo : GetCompanyLogo,
    SaveCustomFieldValue: SaveCustomFieldValue,
    SaveTransactionEvent: SaveTransactionEvent,
    SaveAttachmentFromBase64: SaveAttachmentFromBase64,
    AddCustomFieldValueToEditTrans: AddCustomFieldValueToEditTrans,
    AddEventToEditTransaction: AddEventToEditTransaction,
    AddAttachmentFromBase64ToEditTrans: AddAttachmentFromBase64ToEditTrans,
    AddAttachmentToEditTrans: AddAttachmentToEditTrans,
    GetTransactionForEdit: GetTransactionForEdit,
    CommitTransaction: CommitTransaction,
    DateToSATString: DateToSATString,
    DateToSATStringNoTime: DateToSATStringNoTime,
    IsHomeCurrency: IsHomeCurrency,
    formatAddress,
    getPackageType,
    getPackageTypeAbi,
    getInvoice,
};
