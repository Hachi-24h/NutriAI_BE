// middlewares/requireAuth.js
const jwt = require('jsonwebtoken');
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access-secret';

module.exports = function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const [scheme, token] = auth.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Missing or invalid Authorization header' });
  }
  try {
    const payload = jwt.verify(token, JWT_ACCESS_SECRET, { issuer: 'auth-service' });
    // payload.sub = _id của Auth (bên auth service)
    req.auth = { id: payload.sub, role: payload.role, email: payload.email, phone: payload.phone, emailVerified: payload.emailVerified };
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
