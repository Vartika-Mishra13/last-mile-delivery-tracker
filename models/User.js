const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["customer", "admin", "deliveryAgent"],
      default: "customer",
    },
    phone: String,
    address: String,
    assignedZone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    activeOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    currentLocation: {
      lat: Number,
      lng: Number,
      updatedAt: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
