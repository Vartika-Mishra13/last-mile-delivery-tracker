const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const RateCard = require("./models/RateCard");
const User = require("./models/User");
const Zone = require("./models/Zone");

dotenv.config();

const seed = async () => {
  await connectDB();

  const north = await Zone.findOneAndUpdate(
    { name: "North Zone" },
    {
      name: "North Zone",
      areas: ["north", "rohini", "pitampura"],
      pincodes: ["110034", "110085"],
      center: { lat: 28.7041, lng: 77.1025 },
      active: true,
    },
    { upsert: true, new: true }
  );

  const south = await Zone.findOneAndUpdate(
    { name: "South Zone" },
    {
      name: "South Zone",
      areas: ["south", "saket", "hauz khas", "green park"],
      pincodes: ["110016", "110017"],
      center: { lat: 28.5244, lng: 77.1855 },
      active: true,
    },
    { upsert: true, new: true }
  );

  const west = await Zone.findOneAndUpdate(
    { name: "West Zone" },
    {
      name: "West Zone",
      areas: ["west", "dwarka", "janakpuri"],
      pincodes: ["110058", "110075"],
      center: { lat: 28.5921, lng: 77.046 },
      active: true,
    },
    { upsert: true, new: true }
  );

  const zones = [north, south, west];

  for (const orderType of ["B2B", "B2C"]) {
    for (const fromZone of zones) {
      for (const toZone of zones) {
        const intraZone = fromZone._id.equals(toZone._id);
        await RateCard.findOneAndUpdate(
          { orderType, fromZone: fromZone._id, toZone: toZone._id },
          {
            orderType,
            fromZone: fromZone._id,
            toZone: toZone._id,
            ratePerKg: intraZone ? (orderType === "B2B" ? 35 : 45) : orderType === "B2B" ? 55 : 70,
            codSurcharge: orderType === "B2B" ? 40 : 60,
            minCharge: intraZone ? 80 : 120,
            active: true,
          },
          { upsert: true, new: true }
        );
      }
    }
  }

  const password = await bcrypt.hash("Password@123", 10);

  await User.findOneAndUpdate(
    { email: "admin@example.com" },
    { name: "Admin User", email: "admin@example.com", password, role: "admin", phone: "9999999999" },
    { upsert: true, new: true }
  );

  await User.findOneAndUpdate(
    { email: "agent@example.com" },
    {
      name: "Delivery Agent",
      email: "agent@example.com",
      password,
      role: "deliveryAgent",
      phone: "8888888888",
      assignedZone: north._id,
      isAvailable: true,
      currentLocation: { lat: 28.7041, lng: 77.1025, updatedAt: new Date() },
    },
    { upsert: true, new: true }
  );

  await User.findOneAndUpdate(
    { email: "customer@example.com" },
    {
      name: "Customer User",
      email: "customer@example.com",
      password,
      role: "customer",
      phone: "7777777777",
    },
    { upsert: true, new: true }
  );

  console.log("Seed complete");
  process.exit(0);
};

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
