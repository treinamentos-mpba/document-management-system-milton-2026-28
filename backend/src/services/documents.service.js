const { randomUUID } = require('node:crypto');

class DocumentsService {
  constructor(documentsRepository, documentFilesRepository) {
    this.documentsRepository = documentsRepository;
    this.documentFilesRepository = documentFilesRepository;
  }

  createDocument(file, owner) {
    const document = {
      id: randomUUID(),
      originalName: file.originalname,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      owner: owner || 'anonymous',
      storageName: file.filename
    };

    this.documentsRepository.create(document);
    return this.toPublicDocument(document);
  }

  listDocuments(owner) {
    return this.documentsRepository
      .findAll(owner)
      .map((document) => this.toPublicDocument(document));
  }

  getDocumentForDownload(id) {
    const document = this.documentsRepository.findById(id);

    if (!document || !this.documentFilesRepository.exists(document.storageName)) {
      const error = new Error('Documento não encontrado.');
      error.statusCode = 404;
      throw error;
    }

    return {
      document: this.toPublicDocument(document),
      filePath: this.documentFilesRepository.getPath(document.storageName)
    };
  }

  toPublicDocument(document) {
    const { storageName, ...publicDocument } = document;
    return publicDocument;
  }
}

module.exports = DocumentsService;
