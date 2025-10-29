const jwt = require("jsonwebtoken");
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access-secret";

module.exports = function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Missing or invalid Authorization header" });
  }
  try {
    const payload = jwt.verify(token, JWT_ACCESS_SECRET, { issuer: "auth-service" });
    req.auth = { id: payload.sub, phone: payload.phone, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

