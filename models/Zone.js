const mongoose = require("mongoose");

const zoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    areas: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
    pincodes: [
      {
        type: String,
        trim: true,
      },
    ],
    center: {
      lat: Number,
      lng: Number,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Zone", zoneSchema);
