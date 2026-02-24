const QRCode = require("qrcode");
const { nanoid } = require("nanoid");

function generateTicketId(prefix = "TKT") {
  return `${prefix}-${nanoid(10)}`.toUpperCase();
}

async function generateQrDataUrl(payloadObj) {
  const payload = JSON.stringify(payloadObj);
  return await QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 1, width: 300 });
}

module.exports = { generateTicketId, generateQrDataUrl };

