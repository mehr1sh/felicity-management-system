const mongoose = require("mongoose");

const forumMessageSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, required: true, trim: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "ForumMessage", index: true }, 
    isPinned: { type: Boolean, default: false },
    isAnnouncement: { type: Boolean, default: false },
    reactions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String },
      },
    ],
  },
  { timestamps: true }
);

forumMessageSchema.index({ eventId: 1, createdAt: -1 });

const ForumMessage = mongoose.model("ForumMessage", forumMessageSchema);

module.exports = { ForumMessage };
