const express = require("express");
const { z } = require("zod");
const { config } = require("../config");
const { Participant, User } = require("../models/User");
const { hashPassword, verifyPassword } = require("../utils/password");
const { signJwt } = require("../utils/jwt");

const router = express.Router();

const registerParticipantSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  participantType: z.enum(["iiit", "non_iiit"]),
  collegeOrOrgName: z.string().min(1),
  contactNumber: z.string().min(5),
});

const registerParticipantSchemaExtended = registerParticipantSchema.extend({
  interests: z.array(z.string()).optional(),
  followedOrganizers: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
});

router.post("/register-participant", async (req, res) => {
  const parsed = registerParticipantSchemaExtended.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { participantType, email, password, interests, followedOrganizers, ...rest } = parsed.data;
  const emailLower = email.toLowerCase();

  if (participantType === "iiit") {
    const domain = emailLower.split("@")[1] || "";
    if (!config.iiitEmailDomains.includes(domain)) {
      return res.status(400).json({ error: `IIIT participants must use one of these email domains: ${config.iiitEmailDomains.map(d => `@${d}`).join(", ")}` });
    }
  }

  const existing = await User.findOne({ email: emailLower }).lean();
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await hashPassword(password);
  const mongoose = require("mongoose");
  const followedOrgIds = followedOrganizers 
    ? followedOrganizers.map((id) => new mongoose.Types.ObjectId(id)).filter(Boolean)
    : [];
  
  const user = await Participant.create({
    role: "participant",
    email: emailLower,
    passwordHash,
    participantType,
    interests: interests || [],
    followedOrganizers: followedOrgIds,
    ...rest,
  });

  const token = signJwt({ sub: String(user._id), role: user.role }, config.jwt);
  return res.status(201).json({
    token,
    user: { id: String(user._id), role: user.role, email: user.email, firstName: user.firstName, lastName: user.lastName },
  });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const emailLower = parsed.data.email.toLowerCase();
  const user = await User.findOne({ email: emailLower });
  if (!user || !user.isActive) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signJwt({ sub: String(user._id), role: user.role }, config.jwt);
  return res.json({ token, user: { id: String(user._id), role: user.role, email: user.email } });
});

module.exports = { authRouter: router };

