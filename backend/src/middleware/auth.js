const { User } = require("../models/User");
const { config } = require("../config");
const { verifyJwt } = require("../utils/jwt");

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [, token] = header.split(" ");
    if (!token) return res.status(401).json({ error: "Missing Authorization Bearer token" });

    const decoded = verifyJwt(token, { secret: config.jwt.secret });
    const user = await User.findById(decoded.sub).lean();
    if (!user || !user.isActive) return res.status(401).json({ error: "Invalid session" });

    req.auth = { userId: String(user._id), role: user.role, email: user.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) return res.status(401).json({ error: "Unauthorized" });
    if (!roles.includes(req.auth.role)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

module.exports = { requireAuth, requireRole };

