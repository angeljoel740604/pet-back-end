const { authenticate } = require("@magaya/extension-check-updates");

const express = require("express");
require("express-async-errors");

const router = express.Router();
const documentsService = require("../documents/documents.services");

const globalContext = require("../global-context");
const logger = require("../logger");

router.post(
  "/addDocumentsTransaction",
  authenticate,
  async (request, response) => {
    const { hyperion } = globalContext.getContext();

    const documentsList = request.files;
    const bills = request.body.bols;
    const modeT = request.body.mot;
    // const isInternal = request.body.Internal;
    const result = await documentsService(hyperion).addDocumentsTransaction(
      documentsList,
      bills,
      modeT
    );
    if (result) {
      response.json(result);
    } else {
      response.status(400).json({ message: result.message });
      logger.error(result.message);
    }
  }
);

router.post(
  "/addDocumentsTransactionOverSize5",
  authenticate,
  async (request, response) => {
    const { hyperion } = globalContext.getContext();

    const documentsList = request.body.documents;
    const bols = request.body.billOfLading.mastersBill;
    const modeT = request.body.mot;
    const result = await documentsService(
      hyperion
    ).addDocumentsTransactionOverSize5(documentsList, bols, modeT);
    if (result && result[0].status === "400") {
      response.status(400).json({ message: result.message });
      logger.error(result.message);
    } else {
      logger.info(result);
      response.json(result);
    }
  }
);

router.get("/retrieveDocuments", authenticate, async (request, response) => {
  const { hyperion } = globalContext.getContext();

  const result = await documentsService(hyperion).retrieveDocuments();
  if (result) {
    response.json(result);
  } else {
    response.status(400).json({ message: result.message });
    logger.error(result.message);
  }
});

router.get(
  "/retrieveDownloadDocuments",
  authenticate,
  async (request, response) => {
    const { hyperion } = globalContext.getContext();

    const result = await documentsService(hyperion).retrieveDownloadDocuments();
    if (result) {
      response.json(result);
    } else {
      response.status(400).json({ message: result.message });
      logger.error(result.message);
    }
  }
);

router.get("/downloadDocuments", authenticate, async (request, response) => {
  const { hyperion } = globalContext.getContext();

  const result = await documentsService(hyperion).downloadDocuments();
  if (result) {
    response.json(result);
  } else {
    response.status(400).json({ message: result.message });
    logger.error(result.message);
  }
});

router.delete(
  "/deleteDocuments/:id",
  authenticate,
  async (request, response) => {
    const { hyperion } = globalContext.getContext();

    const sId = request.params.id;
    const result = await documentsService(hyperion).deleteDocuments(sId);
    if (result) {
      response.json(result);
    } else {
      response.status(400).json({ message: result.message });
      logger.error(result.message);
    }
  }
);

router.post(
  "/transactionAttachments/:id",
  authenticate,
  async (request, response) => {
    const { hyperion } = globalContext.getContext();
    const guid = request.params.id;

    const result = await documentsService(hyperion).transactionAttachments(
      guid
    );
    if (result) {
      response.json(result);
    } else {
      response.status(400).json({ message: result.message });
      logger.error(result.message);
    }
  }
);

router.post("/sendAttachments/:id", authenticate, async (request, response) => {
  const { hyperion } = globalContext.getContext();
  const attach = request.body;
  const sId = request.params.id;
  try {
    const result = await documentsService(hyperion).sendAttachments(
      sId,
      attach
    );
    if (result) {
      response.json(result);
    } else {
      response
        .status(400)
        .json({ message: result || "No attachments documents!" });
      logger.error(result || "No attachments documents!");
    }
  } catch (error) {
    response
      .status(400)
      .json({ message: error.message || "Failed attachments documents!" });
    logger.error(error.message || "Failed attachments documents!");
  }
});

router.post("/AutomaticDocStatus", async (req, res) => {
  const { hyperion } = globalContext.getContext();
  const data = req.body;
  const result = await documentsService(hyperion).automaticDocStatus(data);
  req.io.sockets.emit("listen_status", { result });
  res.send(data);
});

module.exports = router;
