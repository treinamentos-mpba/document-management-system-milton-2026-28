const path = require('node:path');

function documentError(code) {
  return Object.assign(new Error(code), { code });
}

function publicDocument({ id, originalName, size, uploadedAt, owner }) {
  return { id, originalName, size, uploadedAt, owner };
}

function createDocumentService({ repository, maxFileSize = 10485760 }) {
  async function discardUpload(file) {
    if (file?.filename) await repository.removeFile(file.filename);
  }

  return {
    discardUpload,
    async upload(file, owner) {
      if (!file) throw documentError('FILE_REQUIRED');

      try {
        if (file.size === 0) throw documentError('EMPTY_FILE');
        if (file.size > maxFileSize) throw documentError('FILE_TOO_LARGE');

        const originalName = path.posix.basename(file.originalname.replace(/\\/g, '/'))
          .replace(/[\x00-\x1f\x7f]/g, '').trim();
        if (!originalName || originalName === '.' || originalName === '..') {
          throw documentError('INVALID_FILE_NAME');
        }

        const document = {
          id: file.filename,
          originalName,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          owner,
          storedName: file.filename,
        };
        await repository.save(document);
        return publicDocument(document);
      } catch (error) {
        try {
          await repository.deleteMetadata(file.filename);
          await discardUpload(file);
        } catch (cleanupError) {
          console.error('Falha ao limpar upload:', cleanupError);
        }
        throw error;
      }
    },
    async list(owner) {
      const documents = await repository.findByOwner(owner);
      documents.sort((first, second) => {
        if (first.uploadedAt !== second.uploadedAt) {
          return first.uploadedAt > second.uploadedAt ? -1 : 1;
        }
        return first.id < second.id ? -1 : first.id > second.id ? 1 : 0;
      });
      return documents.map(publicDocument);
    },
    async download(id, owner) {
      const document = await repository.findById(id);
      if (!document || document.owner !== owner) {
        throw documentError('DOCUMENT_NOT_FOUND');
      }
      try {
        const filePath = await repository.locateFile(document.storedName);
        return { filePath, originalName: document.originalName };
      } catch (error) {
        if (error.code === 'ENOENT') throw documentError('DOCUMENT_NOT_FOUND');
        throw error;
      }
    },
  };
}

module.exports = { createDocumentService };