const express = require("express");
const { z } = require("zod");
const { Attendance } = require("../models/Attendance");
const { Registration } = require("../models/Registration");
const { Event } = require("../models/Event");
const { User } = require("../models/User");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();


router.post("/events/:eventId/scan", requireAuth, requireRole("organizer"), async (req, res) => {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (String(event.organizerId) !== String(req.auth.userId)) {
        return res.status(403).json({ error: "Not your event" });
    }

    const schema = z.object({
        ticketId: z.string().min(1),
        participantId: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    
    const registration = await Registration.findOne({
        ticketId: parsed.data.ticketId,
        eventId: event._id,
        status: "registered",
    }).populate("participantId", "firstName lastName email");

    if (!registration) {
        return res.status(404).json({ error: "Ticket not found or not registered for this event" });
    }

    
    const existing = await Attendance.findOne({
        eventId: event._id,
        participantId: registration.participantId._id,
    });
    if (existing) {
        return res.status(409).json({
            error: `Already marked present at ${new Date(existing.createdAt).toLocaleString()}`,
            attendance: existing,
        });
    }

    const attendance = await Attendance.create({
        eventId: event._id,
        participantId: registration.participantId._id,
        registrationId: registration._id,
        ticketId: registration.ticketId,
        method: "qr_scan",
        markedBy: req.auth.userId,
    });

    
    await Event.findByIdAndUpdate(eventId, { $inc: { "stats.attendanceCount": 1 } });

    return res.json({
        ok: true,
        attendance,
        participant: registration.participantId,
    });
});


router.post("/events/:eventId/manual", requireAuth, requireRole("organizer"), async (req, res) => {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (String(event.organizerId) !== String(req.auth.userId)) {
        return res.status(403).json({ error: "Not your event" });
    }

    const schema = z.object({
        participantId: z.string().min(1),
        notes: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    
    const registration = await Registration.findOne({
        participantId: parsed.data.participantId,
        eventId: event._id,
    });
    if (!registration) {
        return res.status(404).json({ error: "Not registered for this event" });
    }

    
    const existing = await Attendance.findOne({
        eventId: event._id,
        participantId: parsed.data.participantId,
    });
    if (existing) {
        return res.status(409).json({ error: "Already marked present" });
    }

    const attendance = await Attendance.create({
        eventId: event._id,
        participantId: parsed.data.participantId,
        registrationId: registration._id,
        ticketId: registration.ticketId,
        method: "manual",
        markedBy: req.auth.userId,
        notes: parsed.data.notes || "",
    });

    await Event.findByIdAndUpdate(eventId, { $inc: { "stats.attendanceCount": 1 } });

    return res.json({ ok: true, attendance });
});


router.get("/events/:eventId", requireAuth, requireRole("organizer"), async (req, res) => {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (String(event.organizerId) !== String(req.auth.userId)) {
        return res.status(403).json({ error: "Not your event" });
    }

    const scanned = await Attendance.find({ eventId: event._id })
        .populate("participantId", "firstName lastName email")
        .sort({ createdAt: -1 })
        .lean();

    
    const allRegistrations = await Registration.find({
        eventId: event._id,
        status: "registered",
    })
        .populate("participantId", "firstName lastName email")
        .lean();

    const scannedIds = new Set(scanned.map((a) => String(a.participantId._id)));
    const notScanned = allRegistrations.filter(
        (r) => !scannedIds.has(String(r.participantId?._id))
    );

    return res.json({
        scanned,
        notScanned: notScanned.map((r) => ({ ...r.participantId, ticketId: r.ticketId })),
        totalRegistered: allRegistrations.length,
        totalScanned: scanned.length,
    });
});


router.get("/events/:eventId/export", requireAuth, requireRole("organizer"), async (req, res) => {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (String(event.organizerId) !== String(req.auth.userId)) {
        return res.status(403).json({ error: "Not your event" });
    }

    const attendance = await Attendance.find({ eventId: event._id })
        .populate("participantId", "firstName lastName email")
        .lean();

    const rows = ["Ticket ID,Name,Email,Check-in Time,Method,Notes"];
    attendance.forEach((a) => {
        const name = `${a.participantId?.firstName || ""} ${a.participantId?.lastName || ""}`.trim();
        rows.push(
            `"${a.ticketId}","${name}","${a.participantId?.email || ""}","${new Date(a.createdAt).toISOString()}","${a.method}","${a.notes}"`
        );
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="attendance-${eventId}.csv"`);
    return res.send(rows.join("\n"));
});

module.exports = router;
