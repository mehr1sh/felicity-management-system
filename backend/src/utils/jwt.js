const jwt = require("jsonwebtoken");

function signJwt(payload, { secret, expiresIn }) {
  return jwt.sign(payload, secret, { expiresIn });
}

function verifyJwt(token, { secret }) {
  return jwt.verify(token, secret);
}

module.exports = { signJwt, verifyJwt };

