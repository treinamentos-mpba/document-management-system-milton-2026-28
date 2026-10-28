const express = require('express');
const path = require('node:path');
const DocumentsRepository = require('./repositories/documents.repository');
const DocumentFilesRepository = require('./repositories/document-files.repository');
const DocumentsService = require('./services/documents.service');
const createUploadMiddleware = require('./middleware/upload.middleware');
const errorMiddleware = require('./middleware/error.middleware');
const createDocumentsRouter = require('./routes/documents.routes');

function createApp(options = {}) {
const storageDirectory = options.storageDirectory
  || path.resolve(__dirname, '../storage');
const documentsRepository = options.documentsRepository
  || new DocumentsRepository();
const documentFilesRepository = options.documentFilesRepository
  || new DocumentFilesRepository(storageDirectory);
const documentsService = options.documentsService
  || new DocumentsService(documentsRepository, documentFilesRepository);
const uploadMiddleware = options.uploadMiddleware
  || createUploadMiddleware(storageDirectory);

  const app = express();
  app.use(express.json());
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  app.use(createDocumentsRouter(documentsService, uploadMiddleware));
  app.use(errorMiddleware);

  return app;
}

const app = createApp();
const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
module.exports.createApp = createApp;
