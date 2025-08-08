const customFieldFactory = ({ dbx, algorithm, category, objectType }) => {
    const existCustomField = async ({ internalName }) => {
        const definitionsList = dbx.CustomField.Definition.Lists.at(objectType);
        const customField =
            definitionsList &&
            (await algorithm
                .find(dbx.using(definitionsList))
                .where((obj) => obj.InternalName === internalName));

        return !!customField;
    };

    const saveCustomField = async (customField) => {
        try {
            dbx.save(customField);
        } catch (e) {
            console.log(e);
        }
    };

    async function editCustomField({ internalName, newDisplayName, newListItems, isNewReadOnly }) {
        const definitionsList = dbx.CustomField.Definition.Lists.at(objectType);
        const cf =
            definitionsList &&
            (await algorithm.find(dbx.using(definitionsList)).where(function (obj) {
                return obj.InternalName === internalName;
            }));
        if (!cf) {
            // exit if Custom field wasn't found
            return;
        }
        if (
            cf.DisplayName !== newDisplayName ||
            cf.Category !== category ||
            cf.PickItems !== newListItems ||
            cf.IsReadOnly !== isNewReadOnly
        ) {
            try {
                const editableCF = await dbx.edit(cf);
                if (newListItems) {
                    editableCF.PickItems = newListItems;
                }
                if (newDisplayName) {
                    editableCF.DisplayName = newDisplayName;
                }
                if (category) {
                    editableCF.Category = category;
                }
                if (cf.IsReadOnly !== isNewReadOnly) {
                    editableCF.IsReadOnly = isNewReadOnly;
                }
                await dbx.save(editableCF);
            } catch (error) {
                console.log(error.message);
            }
        }
    }

    const createCustomField = async ({
        fieldType,
        internalName,
        newDisplayName,
        displayName,
        description,
        isReadOnly = false,
        isNewReadOnly,
        defaultValue,
        extraOpFn,
        listItems,
        newListItems,
        multiline = false,
        maxLength = 100,
    }) => {
        try {
            if (await existCustomField({ objectType, internalName })) {
                await editCustomField({ objectType, internalName, newDisplayName, newListItems, isNewReadOnly });
                return;
            }

            const newCustomFieldDef = new dbx.DbClass.CustomFieldDefinition();
            newCustomFieldDef.Type = fieldType;
            newCustomFieldDef.ObjectType = objectType;
            newCustomFieldDef.InternalName = internalName;
            newCustomFieldDef.DisplayName = displayName;
            newCustomFieldDef.Description = description;
            newCustomFieldDef.Category = category;
            newCustomFieldDef.IsReadOnly = isReadOnly;
            newCustomFieldDef.IncludesTime = true;
            newCustomFieldDef.IsInternal = false;
            newCustomFieldDef.IsSystemDateTime = true;
            newCustomFieldDef.IsMultiline = multiline;
            newCustomFieldDef.MaximumLength = maxLength;
            if (listItems) {
                newCustomFieldDef.PickItems = listItems;
            }
            if (defaultValue !== undefined || defaultValue != null) {
                newCustomFieldDef.DefaultValue = defaultValue;
            }

            if (extraOpFn) {
                extraOpFn(newCustomFieldDef, dbx);
            }

            await saveCustomField(newCustomFieldDef);
        } catch (ex) {
            console.log(ex);
        }
    };

    return { createCustomField };
};

const saveEntityCustomField = async ({ dbx, dbw, entity, field, value }) => {
    const editEntity = dbx.edit(entity);
    editEntity.CustomFields[field] = value;

    try {
        await dbw.save(editEntity);
        return {
            success: true,
        };
    } catch (error) {
        return {
            error,
            success: false,
        };
    }
};

module.exports = { customFieldFactory, saveEntityCustomField };
