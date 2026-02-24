const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
    {
        eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
        participantId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        rating: { type: Number, min: 1, max: 5, required: true },
        comment: { type: String, default: "", trim: true },
    },
    { timestamps: true }
);


feedbackSchema.index({ eventId: 1, participantId: 1 }, { unique: true });

const Feedback = mongoose.model("Feedback", feedbackSchema);

module.exports = { Feedback };
