const bcrypt = require("bcrypt");

async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

async function verifyPassword(password, passwordHash) {
  return await bcrypt.compare(password, passwordHash);
}

module.exports = { hashPassword, verifyPassword };

