function errorHandler(err, req, res, next) {
  console.error(`[${new Date().toISOString()}] ERROR:`, err.message);

  if (err.code === '23505') { // PostgreSQL unique violation
    return res.status(409).json({ error: 'Cet identifiant ou email existe déjà.' });
  }
  if (err.code === '23503') { // Foreign key violation
    return res.status(400).json({ error: 'Référence invalide.' });
  }

  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Erreur serveur interne' : err.message
  });
}

module.exports = { errorHandler };
