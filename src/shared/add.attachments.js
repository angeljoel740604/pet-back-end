const helper = require('@magaya/db-helper');

const fs = require('fs');

const fsPromises = fs.promises;
const path = require('path');
const logger = require('../helpers/extlogger');
const globalContext = require('../global-context');

module.exports = () => {
    const { hyperion } = globalContext.getContext();

    const { saveAttachment } = helper(hyperion).common;

    async function DeleteFile(file) {
        try {
            await fsPromises.unlink(file);
        } catch (e) {
            logger.LogMessage('Problem deleting a file locally!');
        }
    }

    async function saveAttachmentFromBase64(trans, fileAsBase64) {
        const uploadsFolder = path.join('upload');
        // const uploadsFolder = path.join(process.env.ExtensionConfigFolder, '../uploads');
        const fileName = (fileAsBase64.name && fileAsBase64.name.split('&')[1]) || fileAsBase64.path;
        const tempFile = path.join(uploadsFolder, fileName);
        try {
            const buffer = Buffer.from(fileAsBase64.data, 'base64');
            if (!fs.existsSync(uploadsFolder)) {
                fs.mkdirSync(uploadsFolder);
            }
            fs.writeFileSync(tempFile, buffer);
        } catch (error) {
            logger.LogMessage(
                `Unable to save file temporarily before adding it as an attachment. ${fileName}`,
            );
            return false;
        }
        const result = await saveAttachment(trans, tempFile);
        await DeleteFile(tempFile);
        return result;
    }

    async function saveAttachmentFile(sh, file) {
        // check there is a valid file object
        if (!file) {
            return { success: false, error: 'Invalid file' };
        }
        // check it the file exists in the hard drive
        const newFilename = file.path;
        if (!fs.existsSync(newFilename)) {
            return { success: false, error: 'Invalid file' };
        }
        try {
            const edited = hyperion.dbx.edit(sh);
            const att = new hyperion.dbx.DbClass.Attachment(newFilename);
            hyperion.dbx.insert(edited.Attachments, att);
            await hyperion.dbw.save(edited);
            file.close();
            await DeleteFile(newFilename);
        } catch (ex) {
            // remove the temporary file
            file.close();
            await fs.unlink(newFilename);

            return { success: false, error: 'Unexpected error' };
        }

        return { success: true };
    }

    return {
        saveAttachmentFromBase64,
        saveAttachmentFile,
    };
};
