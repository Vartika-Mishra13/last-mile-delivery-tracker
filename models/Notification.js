const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    channel: {
      type: String,
      enum: ["email", "sms"],
      required: true,
    },
    recipient: String,
    subject: String,
    message: String,
    status: {
      type: String,
      enum: ["queued", "sent", "failed"],
      default: "queued",
    },
    providerResponse: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
