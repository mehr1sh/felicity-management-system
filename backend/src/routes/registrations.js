const express = require("express");
const { z } = require("zod");
const { Event, EVENT_TYPES } = require("../models/Event");
const { Registration, REG_STATUS } = require("../models/Registration");
const { User, Participant } = require("../models/User");
const { requireAuth, requireRole } = require("../middleware/auth");
const { generateTicketId, generateQrDataUrl } = require("../utils/ticket");
const { sendMail } = require("../utils/email");
const { config } = require("../config");

const router = express.Router();

// Register for normal event
router.post("/normal/:eventId", requireAuth, requireRole("participant"), async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.eventType !== "normal") return res.status(400).json({ error: "Not a normal event" });

    if (event.status !== "published" && event.status !== "ongoing") {
      return res.status(400).json({ error: "Event not open for registration" });
    }
    if (new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({ error: "Registration deadline passed" });
    }

    const regCount = await Registration.countDocuments({ eventId: event._id, status: "registered" });
    if (regCount >= event.registrationLimit) {
      return res.status(400).json({ error: "Registration limit reached" });
    }

    const existing = await Registration.findOne({ participantId: req.auth.userId, eventId: event._id });
    if (existing) return res.status(409).json({ error: "Already registered" });

    // Extract formResponse manually (avoids Zod v4 record/preprocess issues)
    const formResponse = (req.body.formResponse && typeof req.body.formResponse === "object" && !Array.isArray(req.body.formResponse))
      ? req.body.formResponse : {};

    // Generate ticket
    const ticketId = generateTicketId();
    const qrPayload = { ticketId, participantId: String(req.auth.userId), eventId: String(event._id) };
    const qrDataUrl = await generateQrDataUrl(qrPayload);

    const registration = await Registration.create({
      ticketId,
      qrDataUrl,
      participantId: req.auth.userId,
      eventId: event._id,
      eventType: "normal",
      status: "registered",
      formResponse,
    });

    // Update event stats safely
    if (!event.stats) event.stats = {};
    event.stats.registrationsCount = (event.stats.registrationsCount || 0) + 1;
    event.stats.revenue = (event.stats.revenue || 0) + (event.registrationFee || 0);
    await event.save();

    // Send email (non-blocking)
    try {
      const participant = await Participant.findById(req.auth.userId);
      let attachments = [];
      if (qrDataUrl) {
        const base64Data = qrDataUrl.split(',')[1];
        if (base64Data) attachments.push({ filename: `ticket-${ticketId}.png`, content: base64Data, encoding: 'base64' });
      }
      await sendMail({
        smtp: config.smtp,
        to: participant.email,
        subject: `Registration Confirmed: ${event.eventName}`,
        text: `Your registration for ${event.eventName} is confirmed.\n\nTicket ID: ${ticketId}\n\nEvent Details:\n${event.eventDescription}\n\nStart: ${event.eventStartDate}\nEnd: ${event.eventEndDate}\n\nPlease find your Ticket QR Code attached to this email.`,
        attachments,
      });
    } catch (emailErr) {
      console.warn("[email] Registration email failed:", emailErr.message);
    }

    return res.status(201).json({ registration });
  } catch (err) {
    console.error("[normal-register] Error:", err);
    return res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// Purchase merchandise
router.post("/merchandise/:eventId", requireAuth, requireRole("participant"), async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.eventType !== "merchandise") return res.status(400).json({ error: "Not a merchandise event" });

    if (event.status !== "published" && event.status !== "ongoing") {
      return res.status(400).json({ error: "Event not open for purchase" });
    }
    if (new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({ error: "Purchase deadline passed" });
    }

    // Validate fields manually (avoids Zod v4 record/preprocess issues)
    const itemName = req.body.itemName;
    const quantity = Number(req.body.quantity);
    const variantSelection = (req.body.variantSelection && typeof req.body.variantSelection === "object" && !Array.isArray(req.body.variantSelection))
      ? req.body.variantSelection : {};

    if (!itemName || typeof itemName !== "string") return res.status(400).json({ error: "itemName is required" });
    if (!quantity || quantity < 1 || quantity > 10) return res.status(400).json({ error: "quantity must be between 1 and 10" });

    // Find item and check stock
    const item = event.merchItems.find((m) => m.itemName === itemName);
    if (!item) return res.status(404).json({ error: "Item not found" });

    // Check purchase limit
    const userPurchases = await Registration.countDocuments({
      participantId: req.auth.userId,
      eventId: event._id,
      "purchase.itemName": itemName,
      status: "registered",
    });
    if (userPurchases >= item.purchaseLimitPerParticipant) {
      return res.status(400).json({ error: "Purchase limit reached for this item" });
    }

    // Check stock
    if (item.stockQty < quantity) {
      return res.status(400).json({ error: "Insufficient stock" });
    }

    // Create order WITHOUT QR – QR is only generated on payment approval
    const ticketId = generateTicketId("MRCH");

    const registration = await Registration.create({
      ticketId,
      participantId: req.auth.userId,
      eventId: event._id,
      eventType: "merchandise",
      status: "registered",
      purchase: {
        itemName,
        variantSelection,
        quantity,
        paymentStatus: "pending_approval",
      },
    });

    // Send pending acknowledgement email (non-blocking)
    try {
      const participant = await Participant.findById(req.auth.userId);
      await sendMail({
        smtp: config.smtp,
        to: participant.email,
        subject: `Order Placed: ${event.eventName}`,
        text: `Your order for ${event.eventName} has been placed.\n\nOrder ID: ${ticketId}\nItem: ${itemName}\nQuantity: ${quantity}\n\nPlease upload your payment proof to complete the order. A ticket QR code will be sent upon approval.`,
      });
    } catch (emailErr) {
      console.warn("[email] Merch order email failed:", emailErr.message);
    }

    return res.status(201).json({ registration });
  } catch (err) {
    console.error("[merch-purchase] Error:", err);
    return res.status(500).json({ error: "Purchase failed. Please try again." });
  }
});

// Register for hackathon (team event)
router.post("/hackathon/:eventId", requireAuth, requireRole("participant"), async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.eventType !== "hackathon") return res.status(400).json({ error: "Not a hackathon event" });

    if (event.status !== "published" && event.status !== "ongoing") {
      return res.status(400).json({ error: "Event not open for registration" });
    }
    if (new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({ error: "Registration deadline passed" });
    }

    const regCount = await Registration.countDocuments({ eventId: event._id, status: "registered" });
    if (regCount >= event.registrationLimit) {
      return res.status(400).json({ error: "Registration limit reached" });
    }

    const existing = await Registration.findOne({ participantId: req.auth.userId, eventId: event._id });
    if (existing) return res.status(409).json({ error: "Already registered" });

    const minSize = event.minTeamSize || 1;
    const maxSize = event.maxTeamSize || 4;

    // Validate and extract manually (avoids Zod v4 record/preprocess issues)
    const teamMembers = Array.isArray(req.body.teamMembers) ? req.body.teamMembers.filter(m => typeof m === "string" && m.trim()) : [];
    const formResponse = (req.body.formResponse && typeof req.body.formResponse === "object" && !Array.isArray(req.body.formResponse))
      ? req.body.formResponse : {};

    if (teamMembers.length < minSize) return res.status(400).json({ error: `Team must have at least ${minSize} members` });
    if (teamMembers.length > maxSize) return res.status(400).json({ error: `Team cannot exceed ${maxSize} members` });

    const ticketId = generateTicketId("HACK");
    const qrPayload = { ticketId, participantId: String(req.auth.userId), eventId: String(event._id) };
    const qrDataUrl = await generateQrDataUrl(qrPayload);

    const registration = await Registration.create({
      ticketId,
      qrDataUrl,
      participantId: req.auth.userId,
      eventId: event._id,
      eventType: "hackathon",
      status: "registered",
      teamMembers,
      formResponse,
    });

    if (!event.stats) event.stats = {};
    event.stats.registrationsCount = (event.stats.registrationsCount || 0) + 1;
    await event.save();

    // Send email (non-blocking — don't let email failure break registration)
    try {
      const participant = await Participant.findById(req.auth.userId);
      let attachments = [];
      if (qrDataUrl) {
        const base64Data = qrDataUrl.split(',')[1];
        if (base64Data) attachments.push({ filename: `ticket-${ticketId}.png`, content: base64Data, encoding: 'base64' });
      }
      await sendMail({
        smtp: config.smtp,
        to: participant.email,
        subject: `Hackathon Registration Confirmed: ${event.eventName}`,
        text: `Your hackathon registration for ${event.eventName} is confirmed.\n\nTicket ID: ${ticketId}\nTeam Members: ${teamMembers.join(", ")}\n\nPlease find your Ticket QR Code attached.`,
        attachments,
      });
    } catch (emailErr) {
      console.warn("[email] Hackathon registration email failed:", emailErr.message);
    }

    return res.status(201).json({ registration });
  } catch (err) {
    console.error("[hackathon-register] Error:", err);
    return res.status(500).json({ error: "Registration failed. Please try again." });
  }
});


// Get user's registrations
router.get("/my", requireAuth, requireRole("participant"), async (req, res) => {
  const { type, status, eventId } = req.query;
  const query = { participantId: req.auth.userId };
  if (type) query.eventType = type;
  if (status) query.status = status;
  if (eventId) query.eventId = eventId;

  const registrations = await Registration.find(query)
    .populate({
      path: "eventId",
      select: "eventName eventType eventStartDate eventEndDate organizerId registrationFee",
      populate: { path: "organizerId", select: "organizerName category" },
    })
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ registrations });
});

// Get single registration/ticket
router.get("/:id", requireAuth, async (req, res) => {
  const registration = await Registration.findById(req.params.id)
    .populate("participantId", "firstName lastName email")
    .populate("eventId", "eventName eventType eventStartDate eventEndDate")
    .lean();

  if (!registration) return res.status(404).json({ error: "Registration not found" });

  // Check access
  if (req.auth.role === "participant" && String(registration.participantId._id) !== String(req.auth.userId)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  return res.json({ registration });
});

module.exports = router;
