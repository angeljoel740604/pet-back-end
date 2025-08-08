const helper = require("@magaya/db-helper");

const fs = require("fs");

const fsPromises = fs.promises;
const path = require("path");
const shipmentMgyClient = require("../magaya/shipment-mgy.client");

const globalContext = require("../global-context");

module.exports = () => {
  const { hyperion } = globalContext.getContext();

  const { saveAttachment } = helper(hyperion).common;

  const addDocumentsToTransaction = async ({
    files,
    wayBillNumber,
    scac,
    modeOfTransportation,
    masterNumber,
  }) => {
    const sh = await shipmentMgyClient().getTransactionByBolNumber(
      wayBillNumber,
      scac,
      modeOfTransportation
    );

    if (sh) {
      const tempDir = await fsPromises.mkdtemp("mgy-ai-document");
      const promResponses = files.map(async (file) => {
        const [id, fileName] = file.name.split("&");
        const tempFile = path.join(tempDir, fileName || file.path);

        const buffer = Buffer.from(file.data, "base64");
        fs.writeFileSync(tempFile, buffer);

        const result = await saveAttachment(sh, tempFile);

        const responseObj = {
          fileName,
          id,
          uploadMgy: true,
          error: "",
        };
        return (
          (result && responseObj) || {
            ...responseObj,
            uploadMgy: false,
            error: "Error adding the file",
          }
        );
      });

      const filesResponses = await Promise.all(promResponses);
      await fsPromises.rm(tempDir, { recursive: true });
      return { Number: masterNumber, filesResponses };
    }

    return {
      status: 400,
      message: "Cannot import document. No action required for the user",
    };
  };

  const addDocumentsToTransactionOverSize5 = async ({
    documents,
    scac,
    wayBillNumber,
    modeOfTransportation,
    downloadFn,
    masterNumber,
  }) => {
    const sh = await shipmentMgyClient().getTransactionByBolNumber(
      wayBillNumber,
      scac,
      modeOfTransportation
    );

    if (sh) {
      const tempDir = await fsPromises.mkdtemp("mgy-ai-document");
      const promResponses = documents.map(async (doc) => {
        const tempFile = path.join(tempDir, `${doc.fileName}`);
        const isDown = await downloadFn(tempFile, doc.sasUrl);
        if (isDown) {
          const result = await saveAttachment(sh, tempFile);
          return {
            fileName: doc.fileName,
            id: doc.transactionId,
            uploadMgy: result,
            error: (!result && "Error adding the file") || "",
          };
        }

        return null;
      });

      const filesResp = await Promise.all(promResponses);
      await fsPromises.rm(tempDir, { recursive: true });
      const filesResponses = filesResp.filter((r) => !!r);
      return { Number: masterNumber, filesResponses };
    }

    return {
      status: 400,
      message: "Cannot import document. No action required for the user",
    };
  };

  const addDocumentsToInvoiceTransaction = async ({
    transaction,
    documents,
    downloadFn,
    isInv,
    scac,
    wayBillNumber,
    modeOfTransportation,
  }) => {
    const sh =
      (isInv && transaction) ||
      (await shipmentMgyClient().getTransactionByBolNumber(
        wayBillNumber,
        scac,
        modeOfTransportation
      ));
    if (sh) {
      const tempDir = await fsPromises.mkdtemp("mgy-ai-document");
      const promResponses = documents.map(async (doc) => {
        const tempFile = path.join(tempDir, `${doc.FileName}`);
        const isDown = await downloadFn(tempFile, doc.SasUrl);
        if (isDown) {
          const result = await saveAttachment(sh, tempFile);
          return {
            fileName: doc.FileName,
            uploadMgy: result,
            error: (!result && "Error adding the file") || "",
          };
        }

        return null;
      });

      const filesResp = await Promise.all(promResponses);
      await fsPromises.rm(tempDir, { recursive: true });
      const filesResponses = filesResp.filter((r) => !!r);
      return { filesResponses };
    }

    return {
      status: 400,
      message: "Cannot import document. No action required for the user",
    };
  };

  return {
    addDocumentsToTransaction,
    addDocumentsToTransactionOverSize5,
    addDocumentsToInvoiceTransaction,
  };
};
