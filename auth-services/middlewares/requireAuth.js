const jwt = require('jsonwebtoken');
const Auth = require('../models/auth'); // import model
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access-secret';

module.exports = async function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const [scheme, token] = auth.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Missing or invalid Authorization header' });
  }

  try {
    const payload = jwt.verify(token, JWT_ACCESS_SECRET, { issuer: 'auth-service' });

    // 🔑 fetch user trực tiếp từ DB
    const user = await Auth.findById(payload.sub);
    if (!user) return res.status(401).json({ message: 'User not found' });

    req.auth = user; // gắn full document 
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
