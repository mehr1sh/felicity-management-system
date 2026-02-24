const express = require("express");
const { z } = require("zod");
const { ForumMessage } = require("../models/Forum");
const { Event } = require("../models/Event");
const { Registration } = require("../models/Registration");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();


router.get("/events/:eventId", async (req, res) => {
  const messages = await ForumMessage.find({ eventId: req.params.eventId, parentId: null })
    .populate("authorId", "firstName lastName email organizerName")
    .populate({
      path: "parentId",
      populate: { path: "authorId", select: "firstName lastName email organizerName" },
    })
    .sort({ isPinned: -1, createdAt: -1 })
    .lean();

  
  const messageIds = messages.map((m) => m._id);
  const replies = await ForumMessage.find({ parentId: { $in: messageIds } })
    .populate("authorId", "firstName lastName email organizerName")
    .sort({ createdAt: 1 })
    .lean();

  
  const messagesWithReplies = messages.map((msg) => ({
    ...msg,
    replies: replies.filter((r) => String(r.parentId) === String(msg._id)),
  }));

  return res.json({ messages: messagesWithReplies });
});


router.post("/events/:eventId", requireAuth, async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  if (!event) return res.status(404).json({ error: "Event not found" });

  
  if (req.auth.role === "participant") {
    const registration = await Registration.findOne({
      participantId: req.auth.userId,
      eventId: event._id,
      status: "registered",
    });
    if (!registration) {
      return res.status(403).json({ error: "Must be registered to post" });
    }
  } else if (req.auth.role !== "organizer" || String(event.organizerId) !== String(req.auth.userId)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const schema = z.object({
    content: z.string().min(1),
    parentId: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const message = await ForumMessage.create({
    eventId: event._id,
    authorId: req.auth.userId,
    content: parsed.data.content,
    parentId: parsed.data.parentId || null,
  });

  const populated = await ForumMessage.findById(message._id)
    .populate("authorId", "firstName lastName email organizerName")
    .lean();

  return res.status(201).json({ message: populated });
});


router.post("/messages/:id/pin", requireAuth, requireRole("organizer"), async (req, res) => {
  const message = await ForumMessage.findById(req.params.id);
  if (!message) return res.status(404).json({ error: "Message not found" });

  const event = await Event.findById(message.eventId);
  if (String(event.organizerId) !== String(req.auth.userId)) {
    return res.status(403).json({ error: "Not your event" });
  }

  message.isPinned = !message.isPinned;
  await message.save();

  return res.json({ message });
});


router.delete("/messages/:id", requireAuth, async (req, res) => {
  const message = await ForumMessage.findById(req.params.id);
  if (!message) return res.status(404).json({ error: "Message not found" });

  const event = await Event.findById(message.eventId);
  const isOrganizer = req.auth.role === "organizer" && String(event.organizerId) === String(req.auth.userId);
  const isAuthor = String(message.authorId) === String(req.auth.userId);

  if (!isOrganizer && !isAuthor) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  await ForumMessage.deleteOne({ _id: message._id });
  return res.json({ ok: true });
});


router.post("/messages/:id/reaction", requireAuth, async (req, res) => {
  const schema = z.object({
    emoji: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const message = await ForumMessage.findById(req.params.id);
  if (!message) return res.status(404).json({ error: "Message not found" });

  
  message.reactions = message.reactions.filter((r) => String(r.userId) !== String(req.auth.userId));
  
  message.reactions.push({ userId: req.auth.userId, emoji: parsed.data.emoji });
  await message.save();

  return res.json({ message });
});

module.exports = router;
