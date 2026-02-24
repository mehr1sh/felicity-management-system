const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
    {
        eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
        participantId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        registrationId: { type: mongoose.Schema.Types.ObjectId, ref: "Registration", index: true },
        ticketId: { type: String, required: true },
        method: { type: String, enum: ["qr_scan", "manual"], default: "qr_scan" },
        markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        notes: { type: String, default: "" },
    },
    { timestamps: true }
);


attendanceSchema.index({ eventId: 1, participantId: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", attendanceSchema);

module.exports = { Attendance };
