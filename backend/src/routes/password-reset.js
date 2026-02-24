const express = require("express");
const { z } = require("zod");
const { PasswordReset, RESET_STATUS } = require("../models/PasswordReset");
const { User, Organizer } = require("../models/User");
const { requireAuth, requireRole } = require("../middleware/auth");
const { hashPassword } = require("../utils/password");
const { nanoid } = require("nanoid");
const { sendMail } = require("../utils/email");
const { config } = require("../config");

const router = express.Router();


router.post("/request", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    reason: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const organizer = await Organizer.findOne({ email: parsed.data.email.toLowerCase() });
  if (!organizer) return res.status(404).json({ error: "Organizer not found" });

  const existing = await PasswordReset.findOne({
    organizerId: organizer._id,
    status: "pending",
  });
  if (existing) {
    return res.status(409).json({ error: "You already have a pending request" });
  }

  const resetRequest = await PasswordReset.create({
    organizerId: organizer._id,
    reason: parsed.data.reason,
    status: "pending",
  });

  return res.status(201).json({ request: resetRequest });
});


router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  const requests = await PasswordReset.find()
    .populate("organizerId", "organizerName email")
    .populate("handledBy", "email")
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ requests });
});


router.post("/:id/approve", requireAuth, requireRole("admin"), async (req, res) => {
  const schema = z.object({
    comment: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);

  const request = await PasswordReset.findById(req.params.id);
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (request.status !== "pending") {
    return res.status(400).json({ error: "Request already processed" });
  }


  const newPassword = nanoid(12);
  const passwordHash = await hashPassword(newPassword);


  const organizer = await Organizer.findById(request.organizerId);
  organizer.passwordHash = passwordHash;
  await organizer.save();


  request.status = "approved";
  request.adminComment = parsed.data?.comment || "";
  request.newPassword = newPassword;
  request.handledBy = req.auth.userId;
  request.handledAt = new Date();
  await request.save();


  await sendMail({
    smtp: config.smtp,
    to: config.adminBootstrap.email,
    subject: `Password Reset Approved: ${organizer.organizerName}`,
    text: `Password reset request approved for ${organizer.organizerName}.\n\nNew Password: ${newPassword}\n\nPlease share this with the organizer.`,
  });

  return res.json({ ok: true, password: newPassword });
});


router.post("/:id/reject", requireAuth, requireRole("admin"), async (req, res) => {
  const schema = z.object({
    comment: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const request = await PasswordReset.findById(req.params.id);
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (request.status !== "pending") {
    return res.status(400).json({ error: "Request already processed" });
  }

  request.status = "rejected";
  request.adminComment = parsed.data.comment;
  request.handledBy = req.auth.userId;
  request.handledAt = new Date();
  await request.save();

  return res.json({ ok: true });
});

module.exports = router;
