const fsHelper = require('@magaya/extension-fs-helper');
const path = require('path');
const fs = require('fs');

function GetSetExtensionFolders (id, networkId){
    const extensionDataFolder = fsHelper.GetExtensionDataFolder(id, networkId);
    process.env.ExtensionDataFolder = extensionDataFolder;
    let extensionConfigFolder =  path.join(extensionDataFolder, 'config');
    if (!fs.existsSync(extensionConfigFolder)){
        fs.mkdirSync(extensionConfigFolder);
    }
    process.env.ExtensionConfigFolder = extensionConfigFolder;
}
module.exports = {
    GetSetExtensionFolders : GetSetExtensionFolders
}