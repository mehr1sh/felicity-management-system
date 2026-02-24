const express = require("express");
const { z } = require("zod");
const { User } = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const { hashPassword, verifyPassword } = require("../utils/password");

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  const user = await User.findById(req.auth.userId).lean();
  if (!user) return res.status(404).json({ error: "Not found" });

  const safe = { ...user };
  safe.id = String(user._id);
  delete safe._id;
  delete safe.__v;
  delete safe.passwordHash;
  return res.json({ user: safe });
});

const participantUpdateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  contactNumber: z.string().min(5).optional(),
  college: z.string().min(1).optional(),
  collegeOrOrgName: z.string().min(1).optional(),
  interests: z.array(z.string().min(1)).optional(),
  followedOrganizers: z.array(z.string()).optional(),
});

const organizerUpdateSchema = z.object({
  organizerName: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  description: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactNumber: z.string().optional(),
  discordWebhookUrl: z.string().url().optional().or(z.literal("")),
});

router.patch("/", requireAuth, async (req, res) => {
  const user = await User.findById(req.auth.userId);
  if (!user) return res.status(404).json({ error: "Not found" });

  const schema = user.role === "participant" ? participantUpdateSchema : user.role === "organizer" ? organizerUpdateSchema : null;
  if (!schema) return res.status(400).json({ error: "Admin profile not editable here" });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  Object.assign(user, parsed.data);
  await user.save();

  return res.json({ ok: true });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

router.post("/change-password", requireAuth, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await User.findById(req.auth.userId);
  if (!user) return res.status(404).json({ error: "Not found" });

  const ok = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Current password incorrect" });

  user.passwordHash = await hashPassword(parsed.data.newPassword);
  await user.save();
  return res.json({ ok: true });
});

module.exports = { meRouter: router };

