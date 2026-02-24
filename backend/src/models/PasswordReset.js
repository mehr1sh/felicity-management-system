const mongoose = require("mongoose");

const RESET_STATUS = ["pending", "approved", "rejected"];

const passwordResetSchema = new mongoose.Schema(
  {
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: RESET_STATUS, default: "pending", index: true },
    adminComment: { type: String, default: "" },
    newPassword: { type: String, default: "" }, 
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    handledAt: { type: Date },
  },
  { timestamps: true }
);

passwordResetSchema.index({ organizerId: 1, status: 1 });

const PasswordReset = mongoose.model("PasswordReset", passwordResetSchema);

module.exports = { PasswordReset, RESET_STATUS };
