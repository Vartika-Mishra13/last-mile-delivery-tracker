const RateCard = require("../models/RateCard");
const Zone = require("../models/Zone");

const normalizeAddress = (address = "") => address.toLowerCase();

const detectZone = async (address) => {
  const normalizedAddress = normalizeAddress(address);
  const pincode = normalizedAddress.match(/\b\d{5,6}\b/)?.[0];
  const zones = await Zone.find({ active: true });

  return zones.find((zone) => {
    const pincodeMatch = pincode && zone.pincodes.includes(pincode);
    const areaMatch = zone.areas.some((area) => normalizedAddress.includes(area));
    const nameMatch = normalizedAddress.includes(zone.name.toLowerCase());

    return pincodeMatch || areaMatch || nameMatch;
  });
};

const calculateCharge = async ({
  pickupAddress,
  dropAddress,
  length,
  breadth,
  height,
  actualWeight,
  orderType,
  paymentType,
}) => {
  const numericLength = Number(length);
  const numericBreadth = Number(breadth);
  const numericHeight = Number(height);
  const numericWeight = Number(actualWeight);

  if (
    [numericLength, numericBreadth, numericHeight, numericWeight].some(
      (value) => Number.isNaN(value) || value <= 0
    )
  ) {
    throw new Error("Package dimensions and weight must be positive numbers");
  }

  const pickupZone = await detectZone(pickupAddress);
  const dropZone = await detectZone(dropAddress);

  if (!pickupZone || !dropZone) {
    throw new Error("Unable to detect pickup or drop zone from address");
  }

  const rateCard = await RateCard.findOne({
    orderType,
    fromZone: pickupZone._id,
    toZone: dropZone._id,
    active: true,
  });

  if (!rateCard) {
    throw new Error("No active rate card configured for this route and order type");
  }

  const volumetricWeight = (numericLength * numericBreadth * numericHeight) / 5000;
  const billableWeight = Math.max(numericWeight, volumetricWeight);
  const baseCharge = Math.max(billableWeight * rateCard.ratePerKg, rateCard.minCharge);
  const codSurcharge = paymentType === "COD" ? rateCard.codSurcharge : 0;
  const charge = baseCharge + codSurcharge;

  return {
    volumetricWeight,
    billableWeight,
    baseCharge,
    codSurcharge,
    charge,
    ratePerKg: rateCard.ratePerKg,
    pickupZone,
    dropZone,
    rateCard,
  };
};

module.exports = calculateCharge;
module.exports.detectZone = detectZone;
