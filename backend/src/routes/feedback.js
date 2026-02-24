const express = require("express");
const { z } = require("zod");
const { Feedback } = require("../models/Feedback");
const { Registration } = require("../models/Registration");
const { Event } = require("../models/Event");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();


router.post("/events/:eventId", requireAuth, requireRole("participant"), async (req, res) => {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });

    const registered = await Registration.findOne({
        eventId: event._id,
        participantId: req.auth.userId,
        status: "registered",
    });
    if (!registered) {
        return res.status(403).json({ error: "Must be registered for the event to leave feedback" });
    }


    const existing = await Feedback.findOne({
        eventId: event._id,
        participantId: req.auth.userId,
    });
    if (existing) {
        return res.status(409).json({ error: "Feedback already submitted" });
    }

    const schema = z.object({
        rating: z.number().int().min(1).max(5),
        comment: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const feedback = await Feedback.create({
        eventId: event._id,
        participantId: req.auth.userId,
        rating: parsed.data.rating,
        comment: parsed.data.comment || "",
    });

    return res.status(201).json({ ok: true, feedback: { rating: feedback.rating } });
});


router.get("/events/:eventId", requireAuth, requireRole("organizer"), async (req, res) => {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (String(event.organizerId) !== String(req.auth.userId)) {
        return res.status(403).json({ error: "Not your event" });
    }

    const feedbacks = await Feedback.find({ eventId: event._id })
        .select("rating comment createdAt")
        .lean();

    const total = feedbacks.length;
    const avg = total > 0 ? feedbacks.reduce((s, f) => s + f.rating, 0) / total : 0;
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    feedbacks.forEach((f) => { distribution[f.rating] = (distribution[f.rating] || 0) + 1; });

    return res.json({
        average: Math.round(avg * 10) / 10,
        total,
        distribution,
        comments: feedbacks.map((f) => ({ rating: f.rating, comment: f.comment, date: f.createdAt })),
    });
});

module.exports = router;
