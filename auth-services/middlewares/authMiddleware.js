// middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

module.exports = (req, res, next) => {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ message: 'Missing Authorization header' });

  const token = header.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Invalid Authorization header' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
