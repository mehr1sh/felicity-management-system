const express = require("express");
const multer = require("multer");
const { z } = require("zod");
const { Registration } = require("../models/Registration");
const { Event } = require("../models/Event");
const { requireAuth, requireRole } = require("../middleware/auth");
const { generateTicketId, generateQrDataUrl } = require("../utils/ticket");
const { sendMail } = require("../utils/email");
const { config } = require("../config");

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });


router.post("/:registrationId/upload-proof", requireAuth, requireRole("participant"), upload.single("paymentProof"), async (req, res) => {
  const registration = await Registration.findById(req.params.registrationId);
  if (!registration) return res.status(404).json({ error: "Registration not found" });
  if (String(registration.participantId) !== String(req.auth.userId)) {
    return res.status(403).json({ error: "Not your registration" });
  }
  if (registration.eventType !== "merchandise") {
    return res.status(400).json({ error: "Not a merchandise purchase" });
  }

  if (!req.file) return res.status(400).json({ error: "No file uploaded" });


  const base64 = req.file.buffer.toString("base64");
  const dataUrl = `data:${req.file.mimetype};base64,${base64}`;

  registration.purchase.paymentProof = dataUrl;
  registration.purchase.paymentStatus = "pending_approval";
  registration.status = "pending_approval";
  await registration.save();

  return res.json({ ok: true });
});


router.get("/pending", requireAuth, requireRole("organizer"), async (req, res) => {
  const events = await Event.find({ organizerId: req.auth.userId }).select("_id").lean();
  const eventIds = events.map((e) => e._id);

  const registrations = await Registration.find({
    eventId: { $in: eventIds },
    "purchase.paymentStatus": "pending_approval",
    status: "pending_approval",
  })
    .populate("participantId", "firstName lastName email")
    .populate("eventId", "eventName")
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ registrations });
});


router.post("/:registrationId/approve", requireAuth, requireRole("organizer"), async (req, res) => {
  const registration = await Registration.findById(req.params.registrationId);
  if (!registration) return res.status(404).json({ error: "Registration not found" });

  const event = await Event.findById(registration.eventId);
  if (String(event.organizerId) !== String(req.auth.userId)) {
    return res.status(403).json({ error: "Not your event" });
  }

  if (registration.purchase.paymentStatus !== "pending_approval") {
    return res.status(400).json({ error: "Payment already processed" });
  }


  const item = event.merchItems.find((m) => m.itemName === registration.purchase.itemName);
  if (item && item.stockQty < registration.purchase.quantity) {
    return res.status(400).json({ error: "Insufficient stock" });
  }

  item.stockQty -= registration.purchase.quantity;
  event.stats.salesCount += registration.purchase.quantity;
  await event.save();


  if (!registration.qrDataUrl || registration.qrDataUrl === "") {
    const ticketId = registration.ticketId || generateTicketId("MRCH");
    const qrPayload = { ticketId, participantId: String(registration.participantId), eventId: String(event._id) };
    const qrDataUrl = await generateQrDataUrl(qrPayload);
    registration.ticketId = ticketId;
    registration.qrDataUrl = qrDataUrl;
  }

  registration.purchase.paymentStatus = "approved";
  registration.status = "registered";
  await registration.save();

  const participant = await require("../models/User").User.findById(registration.participantId);
  let attachments = [];
  if (registration.qrDataUrl) {
    const base64Data = registration.qrDataUrl.split(',')[1];
    if (base64Data) attachments.push({ filename: `ticket-${registration.ticketId}.png`, content: base64Data, encoding: 'base64' });
  }
  try {
    await sendMail({
      smtp: config.smtp,
      to: participant.email,
      subject: `Purchase Approved: ${event.eventName}`,
      text: `Your payment for ${event.eventName} has been approved!\n\nTicket ID: ${registration.ticketId}\nItem: ${registration.purchase.itemName}\nQuantity: ${registration.purchase.quantity}\n\nPlease find your QR code ticket attached.`,
      attachments,
    });
  } catch (emailErr) {
    console.warn("[email] Payment approval email failed:", emailErr.message);
  }

  return res.json({ ok: true });
});


router.post("/:registrationId/reject", requireAuth, requireRole("organizer"), async (req, res) => {
  const schema = z.object({
    comment: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);

  const registration = await Registration.findById(req.params.registrationId);
  if (!registration) return res.status(404).json({ error: "Registration not found" });

  const event = await Event.findById(registration.eventId);
  if (String(event.organizerId) !== String(req.auth.userId)) {
    return res.status(403).json({ error: "Not your event" });
  }

  registration.purchase.paymentStatus = "rejected";
  registration.purchase.approvalComment = parsed.data?.comment || "";
  registration.status = "payment_rejected";
  await registration.save();

  return res.json({ ok: true });
});

module.exports = router;
