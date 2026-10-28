const path = require('node:path');
const fs = require('node:fs');
const { stat, unlink } = require('node:fs/promises');

const storedNamePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createDocumentRepository({
  storageDirectory = path.resolve(__dirname, '../../storage'),
} = {}) {
  const documents = new Map();
  const directory = path.resolve(storageDirectory);

  fs.mkdirSync(directory, { recursive: true });
  fs.accessSync(directory, fs.constants.W_OK | fs.constants.X_OK);

  function getFilePath(storedName) {
    if (!storedNamePattern.test(storedName)) {
      throw new Error('Nome interno de arquivo inválido.');
    }
    return path.join(directory, storedName);
  }

  return {
    storageDirectory: directory,
    async save(document) {
      if (documents.has(document.id)) {
        throw new Error('Identificador de documento já registrado.');
      }
      documents.set(document.id, { ...document });
      return { ...document };
    },
    async findById(id) {
      const document = documents.get(id);
      return document ? { ...document } : null;
    },
    async findByOwner(owner) {
      return [...documents.values()]
        .filter((document) => document.owner === owner)
        .map((document) => ({ ...document }));
    },
    async deleteMetadata(id) {
      documents.delete(id);
    },
    async locateFile(storedName) {
      const filePath = getFilePath(storedName);
      const information = await stat(filePath);
      if (!information.isFile()) {
        const error = new Error('Arquivo não encontrado.');
        error.code = 'ENOENT';
        throw error;
      }
      return filePath;
    },
    async removeFile(storedName) {
      try {
        await unlink(getFilePath(storedName));
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    },
  };
}

module.exports = { createDocumentRepository };