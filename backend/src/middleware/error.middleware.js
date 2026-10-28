const multer = require('multer');

function errorMiddleware(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: 'Não foi possível processar o arquivo enviado.' });
  }

  const statusCode = error.statusCode || 500;
  const message = statusCode >= 500 ? 'Erro interno do servidor.' : error.message;
  return res.status(statusCode).json({ error: message });
}

module.exports = errorMiddleware;
