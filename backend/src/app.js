// Seed do servidor backend do Document Management System.
//
// Este arquivo é apenas um ponto de partida mínimo. Ao longo do workshop você
// vai usar o Agent Mode do GitHub Copilot para construir as camadas:
//   - routes/       (definição das rotas)
//   - controllers/  (entrada HTTP e validação)
//   - services/     (regras de negócio)
//   - repositories/ (persistência: arquivos locais + metadados em memória)
//
// Restrição do projeto: uploads são gravados no filesystem local da aplicação
// usando multer com diskStorage. Não utilize provedores externos.

const express = require('express');
const { createDocumentRepository } = require('./repositories/documents.repository');
const { createDocumentService } = require('./services/documents.service');
const { createDocumentController } = require('./controllers/documents.controller');
const { createDocumentRouter } = require('./routes/documents.routes');

function readPositiveInteger(value, defaultValue, maximum, name) {
  const number = value === undefined ? defaultValue : Number(value);
  if ((value !== undefined && !/^\d+$/.test(value)) ||
    !Number.isSafeInteger(number) || number < 1 || number > maximum) {
    throw new Error(`Configuração inválida: ${name}.`);
  }
  return number;
}

const PORT = readPositiveInteger(process.env.PORT, 3000, 65535, 'PORT');
const MAX_FILE_SIZE = readPositiveInteger(
  process.env.MAX_FILE_SIZE_BYTES, 10485760, Number.MAX_SAFE_INTEGER, 'MAX_FILE_SIZE_BYTES',
);

function createApp({ storageDirectory, maxFileSize = MAX_FILE_SIZE } = {}) {
  const app = express();
  const repository = createDocumentRepository({ storageDirectory });
  const service = createDocumentService({ repository, maxFileSize });
  const controller = createDocumentController({ service });

  app.use(express.json());
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  app.use(createDocumentRouter({
    controller,
    storageDirectory: repository.storageDirectory,
    maxFileSize,
  }));

  return app;
}

const app = createApp();

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
module.exports.createApp = createApp;
