const mongoose = require("mongoose");

const rateCardSchema = new mongoose.Schema(
  {
    orderType: {
      type: String,
      enum: ["B2B", "B2C"],
      required: true,
    },
    fromZone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      required: true,
    },
    toZone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      required: true,
    },
    ratePerKg: {
      type: Number,
      required: true,
      min: 0,
    },
    codSurcharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    minCharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

rateCardSchema.index({ orderType: 1, fromZone: 1, toZone: 1 }, { unique: true });

module.exports = mongoose.model("RateCard", rateCardSchema);
