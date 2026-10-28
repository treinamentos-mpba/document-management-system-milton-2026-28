const express = require('express');
const createDocumentsController = require('../controllers/documents.controller');

function createDocumentsRouter(documentsService, uploadMiddleware) {
  const router = express.Router();
  const controller = createDocumentsController(documentsService);

  router.post('/upload', uploadMiddleware, controller.upload);
  router.get('/documents', controller.list);
  router.get('/documents/:id/download', controller.download);

  return router;
}

module.exports = createDocumentsRouter;
