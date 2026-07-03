const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pickupAddress: {
      type: String,
      required: true,
    },
    dropAddress: {
      type: String,
      required: true,
    },
    pickupZone: String,
    pickupZoneRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
    },
    dropZone: String,
    dropZoneRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
    },
    length: Number,
    breadth: Number,
    height: Number,
    actualWeight: Number,
    volumetricWeight: Number,
    billableWeight: Number,
    orderType: {
      type: String,
      enum: ["B2B", "B2C"],
      required: true,
    },
    paymentType: {
      type: String,
      enum: ["Prepaid", "COD"],
      required: true,
    },
    deliveryCharge: Number,
    ratePerKg: Number,
    codSurcharge: Number,
    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["Created", "Picked Up", "In Transit", "Out for Delivery", "Delivered", "Failed"],
      default: "Created",
    },
    failedReason: String,
    rescheduleDate: Date,
    attempts: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
