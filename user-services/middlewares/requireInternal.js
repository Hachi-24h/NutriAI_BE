module.exports = function requireInternal(req, res, next) {
  const secret = req.headers['x-internal-secret'];
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};
