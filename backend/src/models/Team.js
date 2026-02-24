const mongoose = require("mongoose");

const TEAM_STATUS = ["forming", "complete", "cancelled"];

const teamSchema = new mongoose.Schema(
  {
    teamName: { type: String, required: true, trim: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    leaderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    teamSize: { type: Number, required: true, min: 2 },
    inviteCode: { type: String, required: true, unique: true, index: true },
    members: [
      {
        participantId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        joinedAt: { type: Date, default: Date.now },
        status: { type: String, enum: ["pending", "accepted"], default: "pending" },
      },
    ],
    status: { type: String, enum: TEAM_STATUS, default: "forming", index: true },
  },
  { timestamps: true }
);

teamSchema.index({ eventId: 1, leaderId: 1 });
teamSchema.index({ inviteCode: 1 });

const Team = mongoose.model("Team", teamSchema);

module.exports = { Team, TEAM_STATUS };
