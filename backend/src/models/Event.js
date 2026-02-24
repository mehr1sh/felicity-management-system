const mongoose = require("mongoose");

const EVENT_TYPES = ["normal", "merchandise", "hackathon"];
const EVENT_STATUS = ["draft", "published", "ongoing", "closed", "completed"];

const formFieldSchema = new mongoose.Schema(
  {
    fieldId: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, required: true },
    required: { type: Boolean, default: false },
    options: [{ type: String }],
  },
  { _id: false }
);

const merchVariantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    values: [{ type: String, required: true }],
  },
  { _id: false }
);

const merchItemSchema = new mongoose.Schema(
  {
    itemName: { type: String, required: true },
    variants: [merchVariantSchema],
    stockQty: { type: Number, required: true, min: 0 },
    purchaseLimitPerParticipant: { type: Number, default: 1, min: 1 },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    eventName: { type: String, required: true, trim: true, index: true },
    eventDescription: { type: String, required: true, trim: true },
    eventType: { type: String, enum: EVENT_TYPES, required: true, index: true },
    eligibility: { type: String, required: true, trim: true, index: true },
    registrationDeadline: { type: Date, required: true, index: true },
    eventStartDate: { type: Date, required: true, index: true },
    eventEndDate: { type: Date, required: true, index: true },
    registrationLimit: { type: Number, required: true, min: 1 },
    registrationFee: { type: Number, default: 0, min: 0 },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    eventTags: [{ type: String, trim: true, index: true }],
    status: { type: String, enum: EVENT_STATUS, default: "draft", index: true },


    formSchema: [formFieldSchema],
    formLocked: { type: Boolean, default: false },


    merchItems: [merchItemSchema],


    isTeamEvent: { type: Boolean, default: false },
    minTeamSize: { type: Number, default: 2, min: 1 },
    maxTeamSize: { type: Number, default: 4, min: 1 },

    stats: {
      registrationsCount: { type: Number, default: 0 },
      salesCount: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
      attendanceCount: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

eventSchema.index({ eventName: "text", eventDescription: "text" });

const Event = mongoose.model("Event", eventSchema);

module.exports = { Event, EVENT_TYPES, EVENT_STATUS };

