const dotenv = require("dotenv");

dotenv.config();

function required(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

const config = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/felicity",
  jwt: {
    secret: process.env.JWT_SECRET || "dev-only-secret-change-me",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  adminBootstrap: {
    email: process.env.ADMIN_EMAIL || "admin@felicity.local",
    password: process.env.ADMIN_PASSWORD || "ChangeThisAdminPassword123!",
  },

  iiitEmailDomains: (process.env.IIIT_EMAIL_DOMAINS || "iiit.ac.in,students.iiit.ac.in,research.iiit.ac.in")
    .split(",")
    .map(domain => domain.trim().toLowerCase()),
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 0,
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "Felicity EMS <no-reply@felicity.local>",
  },
};

module.exports = { config, required };

