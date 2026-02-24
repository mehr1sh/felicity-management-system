const nodemailer = require("nodemailer");
const dns = require("dns");
const { promisify } = require("util");

const resolve4 = promisify(dns.resolve4);

function isSmtpConfigured(smtp) {
  return Boolean(smtp.host && smtp.port && smtp.user && smtp.pass);
}

async function sendMail({ smtp, to, subject, text, attachments }) {
  if (!isSmtpConfigured(smtp)) {
    console.log("[email:dev]", { to, subject, text, hasAttachments: !!attachments });
    return { messageId: "dev-log" };
  }

  // Force IPv4 by pre-resolving the host — Render free tier doesn't support IPv6
  let smtpHost = smtp.host;
  try {
    const addresses = await resolve4(smtp.host);
    if (addresses && addresses.length > 0) {
      smtpHost = addresses[0];
      console.log(`[email] Resolved ${smtp.host} -> ${smtpHost} (IPv4)`);
    }
  } catch (dnsErr) {
    console.warn("[email] DNS resolve4 failed, using hostname:", dnsErr.message);
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
    connectionTimeout: 10000,
    socketTimeout: 10000,
    greetingTimeout: 10000,
  });

  return await transporter.sendMail({
    from: smtp.from,
    to,
    subject,
    text,
    attachments,
  });
}

module.exports = { sendMail };
