/* eslint-disable no-restricted-syntax */
/* eslint-disable guard-for-in */
const fieldsDefinition = require('./fields-definition');
const { customFieldFactory } = require('./custom-field');

const loadFields = async ({ dbx, algorithm }) => {
    for (const objectType in fieldsDefinition) {
        for (const category in fieldsDefinition[objectType]) {
            const factory = customFieldFactory({
                dbx,
                algorithm,
                category,
                objectType: dbx.Common.DbClassType[objectType],
            });

            for (const field of fieldsDefinition[objectType][category]) {
                const customField = {
                    newDisplayName: field.newDisplayName,
                    displayName: field.displayName,
                    description: field.description,
                    internalName: field.internalName,
                    extraOpFn: field.extraOpFn,
                    fieldType: dbx.CustomField.Definition.DataType[field.fieldType],
                    isNewReadOnly: field.isNewReadOnly,
                    isReadOnly: field.isReadOnly,
                    listItems: field.listItems,
                    newListItems: field.newListItems,
                    multiline: field.multiline,
                    maxLength: field.maxLength,
                };

                if (field.defaultValue !== undefined) {
                    customField.defaultValue = field.defaultValue;
                }

                await factory.createCustomField(customField);
            }
        }
    }
};

module.exports = { loadFields };
