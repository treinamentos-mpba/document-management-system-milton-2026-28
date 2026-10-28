const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDocumentService } = require('../src/services/documents.service');

test('a falha ao salvar metadados limpa os metadados e o arquivo enviado', async () => {
  const cleanupCalls = [];
  const saveError = new Error('falha ao salvar');
  const repository = {
    async save() {
      throw saveError;
    },
    async deleteMetadata(id) {
      cleanupCalls.push(['metadata', id]);
    },
    async removeFile(filename) {
      cleanupCalls.push(['file', filename]);
    },
  };
  const service = createDocumentService({ repository });
  const file = {
    filename: 'document-id',
    originalname: 'document.txt',
    size: 1,
  };

  await assert.rejects(service.upload(file, 'owner'), (error) => error === saveError);
  assert.deepEqual(cleanupCalls, [
    ['metadata', 'document-id'],
    ['file', 'document-id'],
  ]);
});

test('cleanupUpload continua a limpeza quando metadados não podem ser removidos', async () => {
  const cleanupCalls = [];
  const repository = {
    async deleteMetadata(id) {
      cleanupCalls.push(['metadata', id]);
      throw new Error('falha ao remover metadados');
    },
    async removeFile(filename) {
      cleanupCalls.push(['file', filename]);
    },
  };
  const service = createDocumentService({ repository });
  const loggedErrors = [];
  const originalConsoleError = console.error;
  console.error = (...args) => loggedErrors.push(args);

  try {
    await service.cleanupUpload({ filename: 'document-id' });
    await service.cleanupUpload(undefined);
  } finally {
    console.error = originalConsoleError;
  }

  assert.deepEqual(cleanupCalls, [
    ['metadata', 'document-id'],
    ['file', 'document-id'],
  ]);
  assert.equal(loggedErrors.length, 1);
});
