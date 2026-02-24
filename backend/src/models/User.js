const mongoose = require("mongoose");

const ROLES = ["participant", "organizer", "admin"];
const PARTICIPANT_TYPES = ["iiit", "non_iiit"];

const baseUserSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ROLES, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, discriminatorKey: "role" }
);

const User = mongoose.model("User", baseUserSchema);

const Participant = User.discriminator(
  "participant",
  new mongoose.Schema({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    participantType: { type: String, enum: PARTICIPANT_TYPES, required: true },
    collegeOrOrgName: { type: String, required: true, trim: true },
    contactNumber: { type: String, required: true, trim: true },
    interests: [{ type: String, trim: true }],
    followedOrganizers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  })
);

const Organizer = User.discriminator(
  "organizer",
  new mongoose.Schema({
    organizerName: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    contactNumber: { type: String, default: "", trim: true },
    discordWebhookUrl: { type: String, default: "" },
  })
);

const Admin = User.discriminator("admin", new mongoose.Schema({}));

module.exports = { User, Participant, Organizer, Admin, ROLES, PARTICIPANT_TYPES };

