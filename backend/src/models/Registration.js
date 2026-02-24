const mongoose = require("mongoose");

const REG_STATUS = ["registered", "cancelled", "rejected", "completed", "pending_approval", "approved", "payment_rejected"];

const registrationSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true, unique: true, index: true },
    qrDataUrl: { type: String, default: "" },
    participantId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    eventType: { type: String, required: true },
    status: { type: String, enum: REG_STATUS, default: "registered", index: true },
    teamMembers: [{ type: String }],
    teamName: { type: String, default: "" },


    formResponse: { type: Object, default: {} },


    purchase: {
      itemName: { type: String, default: "" },
      variantSelection: { type: Object, default: {} },
      quantity: { type: Number, default: 1, min: 1 },
      paymentProof: { type: String, default: "" },
      paymentStatus: { type: String, enum: ["pending_approval", "approved", "rejected"], default: "pending_approval" },
      approvalComment: { type: String, default: "" },
    },


    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", index: true },
  },
  { timestamps: true }
);

registrationSchema.index({ participantId: 1, eventId: 1 }, { unique: true });

const Registration = mongoose.model("Registration", registrationSchema);

module.exports = { Registration, REG_STATUS };

