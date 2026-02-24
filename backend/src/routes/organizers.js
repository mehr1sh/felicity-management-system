const express = require("express");
const { z } = require("zod");
const { User, Organizer } = require("../models/User");
const { Event } = require("../models/Event");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Get all organizers (public)
router.get("/", async (req, res) => {
  const organizers = await Organizer.find({ isActive: true })
    .select("organizerName category description contactEmail")
    .lean();

  return res.json({ organizers });
});

// Get single organizer with events
router.get("/:id", async (req, res) => {
  const organizer = await Organizer.findById(req.params.id).lean();
  if (!organizer || !organizer.isActive) return res.status(404).json({ error: "Organizer not found" });

  const now = new Date();
  const upcoming = await Event.find({
    organizerId: organizer._id,
    eventStartDate: { $gte: now },
    status: { $in: ["published", "ongoing"] },
  })
    .select("eventName eventType eventStartDate eventEndDate eligibility registrationFee registrationLimit")
    .sort({ eventStartDate: 1 })
    .lean();

  const past = await Event.find({
    organizerId: organizer._id,
    eventEndDate: { $lt: now },
    status: { $in: ["completed", "closed"] },
  })
    .select("eventName eventType eventStartDate eventEndDate")
    .sort({ eventEndDate: -1 })
    .limit(10)
    .lean();

  return res.json({
    organizer: {
      id: String(organizer._id),
      organizerName: organizer.organizerName,
      category: organizer.category,
      description: organizer.description,
      contactEmail: organizer.contactEmail,
      contactNumber: organizer.contactNumber,
    },
    upcomingEvents: upcoming,
    pastEvents: past,
  });
});

// Follow/Unfollow organizer (participant only)
router.post("/:id/follow", requireAuth, async (req, res) => {
  const user = await User.findById(req.auth.userId);
  if (!user || user.role !== "participant") return res.status(403).json({ error: "Participants only" });

  const organizer = await Organizer.findById(req.params.id);
  if (!organizer || !organizer.isActive) return res.status(404).json({ error: "Organizer not found" });

  if (!user.followedOrganizers) user.followedOrganizers = [];
  const alreadyFollowing = user.followedOrganizers.some(
    (id) => String(id) === String(organizer._id)
  );
  if (!alreadyFollowing) {
    user.followedOrganizers.push(organizer._id);
    await user.save();
  }

  return res.json({ ok: true, following: true });
});

router.delete("/:id/follow", requireAuth, async (req, res) => {
  const user = await User.findById(req.auth.userId);
  if (!user || user.role !== "participant") return res.status(403).json({ error: "Participants only" });

  if (!user.followedOrganizers) user.followedOrganizers = [];
  user.followedOrganizers = user.followedOrganizers.filter(
    (id) => String(id) !== String(req.params.id)
  );
  await user.save();

  return res.json({ ok: true, following: false });
});

// Get organizer analytics (organizer only)
router.get("/:id/analytics", requireAuth, async (req, res) => {
  const organizer = await Organizer.findById(req.params.id);
  if (!organizer) return res.status(404).json({ error: "Organizer not found" });
  if (String(organizer._id) !== String(req.auth.userId)) {
    return res.status(403).json({ error: "Not your organizer account" });
  }

  const allEvents = await Event.find({ organizerId: organizer._id }).lean();
  const completedEvents = allEvents.filter((e) => e.status === "completed");

  const analytics = {
    totalEvents: allEvents.length,
    completedEvents: completedEvents.length,
    totalRegistrations: 0,
    totalSales: 0,
    totalRevenue: 0,
    totalAttendance: 0,
  };

  allEvents.forEach((event) => {
    analytics.totalRegistrations += event.stats.registrationsCount || 0;
    analytics.totalSales += event.stats.salesCount || 0;
    analytics.totalRevenue += event.stats.revenue || 0;
    analytics.totalAttendance += event.stats.attendanceCount || 0;
  });

  return res.json({ analytics });
});

// Update Discord webhook URL (organizer only)
router.patch("/:id/discord", requireAuth, async (req, res) => {
  const organizer = await Organizer.findById(req.params.id);
  if (!organizer) return res.status(404).json({ error: "Organizer not found" });
  if (String(organizer._id) !== String(req.auth.userId)) {
    return res.status(403).json({ error: "Not your organizer account" });
  }

  const schema = z.object({
    discordWebhookUrl: z.string().url().or(z.literal("")),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  organizer.discordWebhookUrl = parsed.data.discordWebhookUrl;
  await organizer.save();
  return res.json({ ok: true });
});

// Test Discord webhook
router.post("/:id/discord/test", requireAuth, async (req, res) => {
  const organizer = await Organizer.findById(req.params.id);
  if (!organizer) return res.status(404).json({ error: "Organizer not found" });
  if (String(organizer._id) !== String(req.auth.userId)) {
    return res.status(403).json({ error: "Not your organizer account" });
  }
  if (!organizer.discordWebhookUrl) {
    return res.status(400).json({ error: "No webhook URL configured" });
  }

  try {
    const fetch = require("node-fetch");
    const resp = await fetch(organizer.discordWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `✅ Test webhook from Felicity EMS - ${organizer.organizerName}`,
      }),
    });
    if (!resp.ok) {
      return res.status(400).json({ error: "Webhook test failed: Discord returned " + resp.status });
    }
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ error: "Webhook test failed: " + e.message });
  }
});

module.exports = router;
