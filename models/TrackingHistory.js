const mongoose = require("mongoose");

const trackingSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    note: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("TrackingHistory", trackingSchema);
