const { Router } = require('express');
const multer = require('multer');
const { randomUUID } = require('node:crypto');

function createDocumentRouter({ controller, storageDirectory, maxFileSize }) {
  const router = Router();
  const upload = multer({
    storage: multer.diskStorage({
      destination: storageDirectory,
      filename(req, file, callback) {
        callback(null, randomUUID());
      },
    }),
    limits: { fileSize: maxFileSize + 1 },
  }).single('file');

  router.post('/upload', controller.validateUser, (req, res, next) => {
    if (!req.is('multipart/form-data')) {
      return next(Object.assign(new Error('Tipo de envio inválido.'), {
        code: 'UNSUPPORTED_MEDIA_TYPE',
      }));
    }
    upload(req, res, (error) => {
      if (!error) return next();
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') error.code = 'FILE_TOO_LARGE';
        else if (error.code === 'LIMIT_UNEXPECTED_FILE') error.code = 'UNEXPECTED_FILE';
        else error.code = 'INVALID_MULTIPART';
      } else if (/^(Multipart:|Unexpected end of (form|file)|Malformed part header)/.test(error.message)) {
        error.code = 'INVALID_MULTIPART';
      }
      controller.handleUploadError(error, req, res, next);
    });
  }, controller.upload);

  router.get('/documents', controller.validateUser, controller.list);
  router.get('/documents/:id/download', controller.validateUser, controller.download);
  router.use(controller.handleError);

  return router;
}

module.exports = { createDocumentRouter };