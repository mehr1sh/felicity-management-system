const express = require("express");
const { z } = require("zod");
const { Team, TEAM_STATUS } = require("../models/Team");
const { Event } = require("../models/Event");
const { Registration } = require("../models/Registration");
const { User } = require("../models/User");
const { requireAuth, requireRole } = require("../middleware/auth");
const { nanoid } = require("nanoid");
const { generateTicketId, generateQrDataUrl } = require("../utils/ticket");
const { sendMail } = require("../utils/email");
const { config } = require("../config");

const router = express.Router();


router.post("/", requireAuth, requireRole("participant"), async (req, res) => {
  const schema = z.object({
    teamName: z.string().min(1),
    eventId: z.string(),
    teamSize: z.number().min(2),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const event = await Event.findById(parsed.data.eventId);
  if (!event) return res.status(404).json({ error: "Event not found" });
  if (!event.isTeamEvent) return res.status(400).json({ error: "Not a team event" });
  if (parsed.data.teamSize > event.teamSize) {
    return res.status(400).json({ error: `Team size cannot exceed ${event.teamSize}` });
  }

  
  const existingTeam = await Team.findOne({
    eventId: event._id,
    $or: [
      { leaderId: req.auth.userId },
      { "members.participantId": req.auth.userId },
    ],
    status: { $ne: "cancelled" },
  });
  if (existingTeam) return res.status(409).json({ error: "Already in a team for this event" });

  const inviteCode = nanoid(8).toUpperCase();
  const team = await Team.create({
    teamName: parsed.data.teamName,
    eventId: event._id,
    leaderId: req.auth.userId,
    teamSize: parsed.data.teamSize,
    inviteCode,
    members: [{ participantId: req.auth.userId, status: "accepted" }],
  });

  return res.status(201).json({ team });
});


router.post("/join", requireAuth, requireRole("participant"), async (req, res) => {
  const schema = z.object({
    inviteCode: z.string().min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const team = await Team.findOne({ inviteCode: parsed.data.inviteCode, status: "forming" });
  if (!team) return res.status(404).json({ error: "Team not found or already complete" });

  
  if (String(team.leaderId) === String(req.auth.userId)) {
    return res.status(400).json({ error: "You are the team leader" });
  }
  if (team.members.some((m) => String(m.participantId) === String(req.auth.userId))) {
    return res.status(409).json({ error: "Already in this team" });
  }

  
  if (team.members.length >= team.teamSize) {
    return res.status(400).json({ error: "Team is full" });
  }

  team.members.push({ participantId: req.auth.userId, status: "accepted" });
  
  
  if (team.members.length >= team.teamSize) {
    team.status = "complete";
    
    
    const event = await Event.findById(team.eventId);
    const registrations = [];
    
    for (const member of team.members) {
      const ticketId = generateTicketId();
      const qrPayload = { ticketId, participantId: String(member.participantId), eventId: String(event._id), teamId: String(team._id) };
      const qrDataUrl = await generateQrDataUrl(qrPayload);
      
      const registration = await Registration.create({
        ticketId,
        qrDataUrl,
        participantId: member.participantId,
        eventId: event._id,
        eventType: event.eventType,
        status: "registered",
        teamName: team.teamName,
        teamId: team._id,
      });
      
      registrations.push(registration);
      
      
      const participant = await User.findById(member.participantId);
      await sendMail({
        smtp: config.smtp,
        to: participant.email,
        subject: `Team Registration Confirmed: ${event.eventName}`,
        text: `Your team "${team.teamName}" registration for ${event.eventName} is confirmed.\n\nTicket ID: ${ticketId}`,
      });
    }
    
    
    event.stats.registrationsCount += team.members.length;
    await event.save();
  }
  
  await team.save();
  return res.json({ team });
});


router.get("/my", requireAuth, requireRole("participant"), async (req, res) => {
  const teams = await Team.find({
    $or: [{ leaderId: req.auth.userId }, { "members.participantId": req.auth.userId }],
  })
    .populate("eventId", "eventName eventType eventStartDate")
    .populate("leaderId", "firstName lastName email")
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ teams });
});


router.get("/:id", requireAuth, async (req, res) => {
  const team = await Team.findById(req.params.id)
    .populate("eventId", "eventName eventType")
    .populate("leaderId", "firstName lastName email")
    .populate("members.participantId", "firstName lastName email")
    .lean();

  if (!team) return res.status(404).json({ error: "Team not found" });

  return res.json({ team });
});

module.exports = router;
