const fs = require('node:fs');
const path = require('node:path');

class DocumentFilesRepository {
  constructor(storageDirectory) {
    this.storageDirectory = path.resolve(storageDirectory);
  }

  getPath(storageName) {
    return path.join(this.storageDirectory, storageName);
  }

  exists(storageName) {
    return fs.existsSync(this.getPath(storageName));
  }
}

module.exports = DocumentFilesRepository;
