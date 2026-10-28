const errors = {
  INVALID_USER: [400, 'Informe um usuário válido.'],
  INVALID_MULTIPART: [400, 'O formulário de envio é inválido.'],
  FILE_REQUIRED: [400, 'Selecione um arquivo para enviar.'],
  EMPTY_FILE: [400, 'O arquivo não pode estar vazio.'],
  UNEXPECTED_FILE: [400, 'Envie apenas um arquivo no campo file.'],
  INVALID_FILE_NAME: [400, 'O nome do arquivo é inválido.'],
  INVALID_DOCUMENT_ID: [400, 'O identificador do documento é inválido.'],
  FILE_TOO_LARGE: [413, 'O arquivo excede o limite permitido.'],
  UNSUPPORTED_MEDIA_TYPE: [415, 'Envie o arquivo como multipart/form-data.'],
  DOCUMENT_NOT_FOUND: [404, 'Documento não encontrado.'],
  INTERNAL_ERROR: [500, 'Não foi possível concluir a operação.'],
};

const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createDocumentController({ service }) {
  function handleError(error, req, res, next) {
    if (res.headersSent) return next(error);

    const code = Object.hasOwn(errors, error.code) ? error.code : 'INTERNAL_ERROR';
    const [status, message] = errors[code];
    if (status === 500) console.error('Falha na operação de documentos:', error);
    return res.status(status).json({ error: { code, message } });
  }

  return {
    handleError,
    validateUser(req, res, next) {
      const userHeaders = req.rawHeaders.filter((header, index) =>
        index % 2 === 0 && header.toLowerCase() === 'x-user-id');
      const owner = req.get('X-User-Id')?.trim();
      if (userHeaders.length !== 1 || !owner || !/^[A-Za-z0-9_-]{1,128}$/.test(owner)) {
        return next(Object.assign(new Error('Usuário inválido.'), { code: 'INVALID_USER' }));
      }
      res.locals.owner = owner;
      next();
    },
    async handleUploadError(error, req, res, next) {
      try {
        await service.discardUpload(req.file);
      } catch (cleanupError) {
        console.error('Falha ao limpar upload:', cleanupError);
      }
      next(error);
    },
    async upload(req, res) {
      const document = await service.upload(req.file, res.locals.owner);
      res.status(201).json(document);
    },
    async list(req, res) {
      res.json(await service.list(res.locals.owner));
    },
    async download(req, res, next) {
      if (!idPattern.test(req.params.id)) {
        throw Object.assign(new Error('Identificador inválido.'), { code: 'INVALID_DOCUMENT_ID' });
      }
      const document = await service.download(req.params.id.toLowerCase(), res.locals.owner);
      res.download(document.filePath, document.originalName, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Content-Type-Options': 'nosniff',
        },
      }, (error) => {
        if (!error) return;
        if (error.code === 'ENOENT') error.code = 'DOCUMENT_NOT_FOUND';
        if (res.headersSent) {
          console.error('Falha durante o download:', error);
          res.destroy(error);
          return;
        }
        next(error);
      });
    },
  };
}

module.exports = { createDocumentController };