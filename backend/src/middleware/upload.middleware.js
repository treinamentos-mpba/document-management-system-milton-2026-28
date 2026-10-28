const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const multer = require('multer');

function createUploadMiddleware(storageDirectory) {
  const resolvedDirectory = path.resolve(storageDirectory);
  const storage = multer.diskStorage({
    destination: (req, file, callback) => {
      fs.mkdir(resolvedDirectory, { recursive: true }, (error) => {
        callback(error, resolvedDirectory);
      });
    },
    filename: (req, file, callback) => {
      callback(null, randomUUID());
    }
  });

  return multer({ storage }).single('file');
}

module.exports = createUploadMiddleware;
