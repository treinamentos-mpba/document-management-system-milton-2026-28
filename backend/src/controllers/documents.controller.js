function createDocumentsController(documentsService) {
  return {
    upload(req, res, next) {
      if (!req.file) {
        return res.status(400).json({ error: 'É necessário enviar um arquivo.' });
      }

      const requestedOwner = req.body.owner;
      const owner = typeof requestedOwner === 'string' ? requestedOwner.trim() : '';

      try {
        return res.status(201).json(
          documentsService.createDocument(req.file, owner || 'anonymous')
        );
      } catch (error) {
        return next(error);
      }
    },

    list(req, res, next) {
      try {
        return res.json(documentsService.listDocuments(req.query.owner));
      } catch (error) {
        return next(error);
      }
    },

    download(req, res, next) {
      let download;
      try {
        download = documentsService.getDocumentForDownload(req.params.id);
      } catch (error) {
        return next(error);
      }

      return res.download(download.filePath, download.document.originalName, (error) => {
        if (error && !res.headersSent) {
          next(error);
        }
      });
    }
  };
}

module.exports = createDocumentsController;
