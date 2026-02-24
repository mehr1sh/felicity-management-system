const express = require("express");
const { z } = require("zod");
const { User, Organizer, Participant } = require("../models/User");
const { Event } = require("../models/Event");
const { Registration } = require("../models/Registration");
const { hashPassword } = require("../utils/password");
const { nanoid } = require("nanoid");
const { requireAuth, requireRole } = require("../middleware/auth");
const { sendMail } = require("../utils/email");
const { config } = require("../config");

const router = express.Router();


router.use(requireAuth, requireRole("admin"));


router.get("/stats", async (req, res) => {
  const [participantCount, organizerCount, eventCount, registrations] = await Promise.all([
    Participant.countDocuments(),
    Organizer.countDocuments({ isActive: true }),
    Event.countDocuments(),
    Registration.find({ status: "registered" }).lean(),
  ]);

  
  const events = await Event.find({}, "stats").lean();
  const totalRevenue = events.reduce((sum, e) => sum + (e.stats?.revenue || 0), 0);

  return res.json({
    participants: participantCount,
    organizers: organizerCount,
    events: eventCount,
    revenue: totalRevenue,
    registrations: registrations.length,
  });
});


router.get("/organizers", async (req, res) => {
  const organizers = await Organizer.find()
    .select("organizerName category description contactEmail email isActive createdAt")
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ organizers });
});


router.post("/organizers", async (req, res) => {
  const schema = z.object({
    organizerName: z.string().min(1),
    category: z.string().min(1),
    description: z.string().optional(),
    contactEmail: z.string().email(),
    contactNumber: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  
  const slug = parsed.data.organizerName.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z.]/g, "");
  const loginEmail = `${slug}.${nanoid(4)}@felicity.local`;
  const tempPassword = nanoid(12);

  const passwordHash = await hashPassword(tempPassword);

  const organizer = await Organizer.create({
    role: "organizer",
    email: loginEmail,
    passwordHash,
    organizerName: parsed.data.organizerName,
    category: parsed.data.category,
    description: parsed.data.description || "",
    contactEmail: parsed.data.contactEmail,
    contactNumber: parsed.data.contactNumber || "",
  });

  
  try {
    await sendMail({
      smtp: config.smtp,
      to: config.adminBootstrap.email,
      subject: `New Organizer Account Created: ${parsed.data.organizerName}`,
      text: `Organizer account created.\n\nLogin Email: ${loginEmail}\nPassword: ${tempPassword}\n\nPlease share these credentials with the organizer.`,
    });
  } catch (e) {
    console.warn("[email] Failed to send organizer credentials email:", e.message);
  }

  return res.status(201).json({
    organizer: {
      id: String(organizer._id),
      organizerName: organizer.organizerName,
      email: loginEmail,
      password: tempPassword, 
    },
  });
});


router.delete("/organizers/:id", async (req, res) => {
  const { permanent } = req.query;
  const organizer = await Organizer.findById(req.params.id);
  if (!organizer) return res.status(404).json({ error: "Organizer not found" });

  if (permanent === "true") {
    
    await Event.deleteMany({ organizerId: organizer._id });
    await Organizer.deleteOne({ _id: organizer._id });
    return res.json({ ok: true, action: "deleted" });
  } else {
    organizer.isActive = false;
    await organizer.save();
    return res.json({ ok: true, action: "disabled" });
  }
});


router.get("/password-reset-requests", async (req, res) => {
  const PasswordReset = require("../models/PasswordReset").PasswordReset;
  const requests = await PasswordReset.find()
    .populate("organizerId", "organizerName email")
    .populate("handledBy", "email")
    .sort({ createdAt: -1 })
    .lean();
  return res.json({ requests });
});

module.exports = router;
