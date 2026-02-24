const express = require("express");
const { z } = require("zod");
const { Event, EVENT_TYPES, EVENT_STATUS } = require("../models/Event");
const { Registration } = require("../models/Registration");
const { User, Organizer } = require("../models/User");
const { requireAuth, requireRole } = require("../middleware/auth");
const { generateTicketId, generateQrDataUrl } = require("../utils/ticket");
const { sendMail } = require("../utils/email");
const { config } = require("../config");

const router = express.Router();

function makeFuzzyRegex(query) {
  return query.split('').join('.*');
}

router.get("/", async (req, res) => {
  const {
    eventType,
    eligibility,
    startDate,
    endDate,
    search,
    followedOrganizers,
    status,
    organizerId,
    limit = 50,
    skip = 0,
  } = req.query;

  const query = {};

  if (eventType) query.eventType = eventType;
  if (eligibility) query.eligibility = new RegExp(eligibility, "i");
  if (status) {
    query.status = status;
  } else {
    if (!organizerId) {
      query.status = { $in: ["published", "ongoing"] };
    }
  }
  if (organizerId) query.organizerId = organizerId;

  if (startDate || endDate) {
    query.eventStartDate = {};
    if (startDate) query.eventStartDate.$gte = new Date(startDate);
    if (endDate) query.eventStartDate.$lte = new Date(endDate);
  }

  let userInterests = [];
  const token = req.headers.authorization?.split(" ")[1];
  if (token) {
    try {
      const jwt = require("../utils/jwt");
      const decoded = jwt.verifyJwt(token, config.jwt);
      const userObj = await User.findById(decoded.sub);
      if (userObj?.role === "participant" && userObj.interests) {
        userInterests = userObj.interests.map(i => i.toLowerCase());
      }
    } catch (e) {
    }
  }

  let events;
  if (search) {
    const textResults = await Event.find({ ...query, $text: { $search: search } })
      .populate("organizerId", "organizerName category")
      .sort({ score: { $meta: "textScore" }, createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip))
      .lean();

    const fuzzySearchStr = makeFuzzyRegex(search);

    const matchingOrganizers = await Organizer.find({
      organizerName: { $regex: fuzzySearchStr, $options: "i" },
    }).select("_id").lean();
    const orgIds = matchingOrganizers.map((o) => o._id);

    let orgResults = [];
    if (orgIds.length > 0) {
      orgResults = await Event.find({ ...query, organizerId: { $in: orgIds } })
        .populate("organizerId", "organizerName category")
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .lean();
    }

    const regexResults = await Event.find({
      ...query,
      eventName: { $regex: fuzzySearchStr, $options: "i" },
    })
      .populate("organizerId", "organizerName category")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    const seen = new Set();
    events = [...textResults, ...regexResults, ...orgResults].filter((e) => {
      if (seen.has(String(e._id))) return false;
      seen.add(String(e._id));
      return true;
    });
  } else {
    if (followedOrganizers === "true" && token) {
      try {
        const jwt = require("../utils/jwt");
        const decoded = jwt.verifyJwt(token, config.jwt);
        const user = await User.findById(decoded.sub);
        if (user && user.followedOrganizers && user.followedOrganizers.length > 0) {
          query.organizerId = { $in: user.followedOrganizers };
        } else {
          query.organizerId = { $in: [] };
        }
      } catch (e) {
      }
    }

    events = await Event.find(query)
      .populate("organizerId", "organizerName category")
      .sort({ createdAt: -1 })
      .lean();
  }

  if (userInterests.length > 0) {
    events.forEach(e => {
      let score = 0;
      if (e.eventTags && Array.isArray(e.eventTags)) {
        e.eventTags.forEach(tag => {
          if (userInterests.includes(tag.toLowerCase())) score += 1;
        });
      }
      e.preferenceScore = score;
    });

    events.sort((a, b) => {
      if (b.preferenceScore !== a.preferenceScore) {
        return b.preferenceScore - a.preferenceScore;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }

  if (!search) {
    events = events.slice(Number(skip), Number(skip) + Number(limit));
  }

  return res.json({ events });
});

router.get("/trending", async (req, res) => {
  const { followedOrganizers } = req.query;
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const token = req.headers.authorization?.split(" ")[1];
  let followedOrgIds = null;
  if (followedOrganizers === "true" && token) {
    try {
      const jwt = require("../utils/jwt");
      const decoded = jwt.verifyJwt(token, config.jwt);
      const user = await User.findById(decoded.sub);
      if (user && user.followedOrganizers) {
        followedOrgIds = user.followedOrganizers;
      } else {
        followedOrgIds = [];
      }
    } catch (e) {
    }
  }

  const matchStage = {
    createdAt: { $gte: oneDayAgo },
    status: "registered",
  };

  const regCounts = await Registration.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$eventId",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 20 }, 
  ]);

  let eventIds = regCounts.map((r) => r._id);

  let eventsQuery = { status: { $in: ["published", "ongoing"] } };

  if (followedOrgIds !== null) {
    if (followedOrgIds.length === 0) {
      return res.json({ events: [] });
    }
    eventsQuery.organizerId = { $in: followedOrgIds };
  }

  if (eventIds.length === 0) {
    const events = await Event.find(eventsQuery)
      .populate("organizerId", "organizerName category")
      .sort({ "stats.registrationsCount": -1 })
      .limit(5)
      .lean();
    return res.json({ events });
  }

  eventsQuery._id = { $in: eventIds };
  let events = await Event.find(eventsQuery)
    .populate("organizerId", "organizerName category")
    .lean();

  const countMap = Object.fromEntries(regCounts.map((r) => [String(r._id), r.count]));
  events.sort((a, b) => (countMap[String(b._id)] || 0) - (countMap[String(a._id)] || 0));
  events.forEach((e) => { e.trendingCount = countMap[String(e._id)] || 0; });

  return res.json({ events: events.slice(0, 5) });
});

router.get("/:id", async (req, res) => {
  const event = await Event.findById(req.params.id).populate("organizerId").lean();
  if (!event) return res.status(404).json({ error: "Event not found" });

  const regCount = await Registration.countDocuments({ eventId: event._id, status: "registered" });
  event.currentRegistrations = regCount;

  return res.json({ event });
});

router.post("/", requireAuth, requireRole("organizer"), async (req, res) => {
  const schema = z.object({
    eventName: z.string().min(1),
    eventDescription: z.string().min(1),
    eventType: z.enum(EVENT_TYPES),
    eligibility: z.string().min(1),
    registrationDeadline: z.string().datetime(),
    eventStartDate: z.string().datetime(),
    eventEndDate: z.string().datetime(),
    registrationLimit: z.number().min(1),
    registrationFee: z.number().min(0).optional(),
    eventTags: z.array(z.string()).optional(),
    formSchema: z.array(z.any()).optional(),
    merchItems: z.array(z.any()).optional(),
    isTeamEvent: z.boolean().optional(),
    minTeamSize: z.number().min(1).optional(),
    maxTeamSize: z.number().min(1).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const event = await Event.create({
    ...parsed.data,
    organizerId: req.auth.userId,
    status: "draft",
    registrationDeadline: new Date(parsed.data.registrationDeadline),
    eventStartDate: new Date(parsed.data.eventStartDate),
    eventEndDate: new Date(parsed.data.eventEndDate),
  });

  return res.status(201).json({ event });
});

router.post("/:id/publish", requireAuth, requireRole("organizer"), async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found" });
  if (String(event.organizerId) !== String(req.auth.userId)) {
    return res.status(403).json({ error: "Not your event" });
  }
  if (event.status !== "draft") {
    return res.status(400).json({ error: "Only draft events can be published" });
  }
  event.status = "published";
  await event.save();

  const organizer = await Organizer.findById(req.auth.userId);
  if (organizer && organizer.discordWebhookUrl) {
    try {
      const fetch = require("node-fetch");
      await fetch(organizer.discordWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [{
            title: event.eventName,
            description: event.eventDescription.slice(0, 300),
            color: 0x5865F2,
            fields: [
              { name: "Date", value: new Date(event.eventStartDate).toLocaleDateString(), inline: true },
              { name: "Type", value: event.eventType, inline: true },
              { name: "Eligibility", value: event.eligibility, inline: true },
            ],
          }],
        }),
      });
    } catch (e) {
      console.warn("[discord] Webhook failed:", e.message);
    }
  }

  return res.json({ event });
});

router.patch("/:id", requireAuth, requireRole("organizer"), async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found" });
  if (String(event.organizerId) !== String(req.auth.userId)) {
    return res.status(403).json({ error: "Not your event" });
  }

  const schema = z.object({
    eventName: z.string().min(1).optional(),
    eventDescription: z.string().min(1).optional(),
    eligibility: z.string().min(1).optional(),
    registrationDeadline: z.string().datetime().optional(),
    eventStartDate: z.string().datetime().optional(),
    eventEndDate: z.string().datetime().optional(),
    registrationLimit: z.number().min(1).optional(),
    registrationFee: z.number().min(0).optional(),
    eventTags: z.array(z.string()).optional(),
    formSchema: z.array(z.any()).optional(),
    merchItems: z.array(z.any()).optional(),
    status: z.enum(EVENT_STATUS).optional(),
    discordWebhookUrl: z.string().url().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (event.status === "draft") {
  } else if (event.status === "published") {
    const allowed = ["eventDescription", "registrationDeadline", "registrationLimit", "status"];
    const updates = Object.keys(parsed.data);
    if (updates.some((k) => !allowed.includes(k))) {
      return res.status(400).json({ error: "Limited edits allowed for published events (description, deadline, limit, status)" });
    }
    if (parsed.data.registrationLimit && parsed.data.registrationLimit < event.registrationLimit) {
      return res.status(400).json({ error: "Cannot decrease registration limit" });
    }
    if (parsed.data.registrationDeadline) {
      const newDeadline = new Date(parsed.data.registrationDeadline);
      if (newDeadline < new Date()) {
        return res.status(400).json({ error: "New deadline must be in the future" });
      }
    }
  } else if (["ongoing", "completed"].includes(event.status)) {
    if (Object.keys(parsed.data).some((k) => k !== "status")) {
      return res.status(400).json({ error: "Only status change allowed for ongoing/completed events" });
    }
  } else if (event.status === "closed") {
    return res.status(400).json({ error: "Closed events cannot be edited" });
  }

  if (event.formSchema && parsed.data.formSchema) {
    const hasRegs = await Registration.exists({ eventId: event._id });
    if (hasRegs) {
      const regCount = await Registration.countDocuments({ eventId: event._id });
      return res.status(400).json({ error: `Form locked: ${regCount} registration(s) received` });
    }
  }

  Object.assign(event, parsed.data);
  if (parsed.data.registrationDeadline) event.registrationDeadline = new Date(parsed.data.registrationDeadline);
  if (parsed.data.eventStartDate) event.eventStartDate = new Date(parsed.data.eventStartDate);
  if (parsed.data.eventEndDate) event.eventEndDate = new Date(parsed.data.eventEndDate);

  await event.save();
  return res.json({ event });
});

router.delete("/:id", requireAuth, requireRole("organizer"), async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found" });
  if (String(event.organizerId) !== String(req.auth.userId)) {
    return res.status(403).json({ error: "Not your event" });
  }
  if (event.status !== "draft") {
    return res.status(400).json({ error: "Only draft events can be deleted" });
  }
  await Event.deleteOne({ _id: event._id });
  return res.json({ ok: true });
});

router.get("/:id/registrations", requireAuth, requireRole("organizer"), async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found" });
  if (String(event.organizerId) !== String(req.auth.userId)) {
    return res.status(403).json({ error: "Not your event" });
  }

  const { search, status, paymentStatus } = req.query;
  const query = { eventId: event._id };
  if (status) query.status = status;
  if (paymentStatus) query["purchase.paymentStatus"] = paymentStatus;

  let registrations = await Registration.find(query)
    .populate("participantId", "firstName lastName email contactNumber")
    .sort({ createdAt: -1 })
    .lean();

  if (search) {
    const searchLower = search.toLowerCase();
    registrations = registrations.filter(
      (r) =>
        r.participantId?.firstName?.toLowerCase().includes(searchLower) ||
        r.participantId?.lastName?.toLowerCase().includes(searchLower) ||
        r.participantId?.email?.toLowerCase().includes(searchLower)
    );
  }

  return res.json({ registrations });
});

router.get("/:id/registrations/export", requireAuth, requireRole("organizer"), async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found" });
  if (String(event.organizerId) !== String(req.auth.userId)) {
    return res.status(403).json({ error: "Not your event" });
  }

  const registrations = await Registration.find({ eventId: event._id })
    .populate("participantId", "firstName lastName email contactNumber")
    .sort({ createdAt: -1 })
    .lean();

  const csvRows = ["Name,Email,Contact,Registration Date,Status,Ticket ID"];
  registrations.forEach((r) => {
    const name = `${r.participantId?.firstName || ""} ${r.participantId?.lastName || ""}`;
    const email = r.participantId?.email || "";
    const contact = r.participantId?.contactNumber || "";
    const date = new Date(r.createdAt).toISOString();
    csvRows.push(`"${name}","${email}","${contact}","${date}","${r.status}","${r.ticketId}"`);
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="event-${event._id}-registrations.csv"`);
  return res.send(csvRows.join("\n"));
});

module.exports = router;
