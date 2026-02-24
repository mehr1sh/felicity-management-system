const nodemailer = require("nodemailer");

function isSmtpConfigured(smtp) {
  return Boolean(smtp.host && smtp.port && smtp.user && smtp.pass);
}

async function sendMail({ smtp, to, subject, text, attachments }) {
  if (!isSmtpConfigured(smtp)) {
    console.log("[email:dev]", { to, subject, text, hasAttachments: !!attachments });
    return { messageId: "dev-log" };
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
    connectionTimeout: 5000,
    socketTimeout: 5000,
    greetingTimeout: 5000,
    family: 4,  // Force IPv4 — Render free tier doesn't support IPv6
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
