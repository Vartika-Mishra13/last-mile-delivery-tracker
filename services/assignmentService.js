const User = require("../models/User");

const distanceInKm = (first, second) => {
  if (!first?.lat || !first?.lng || !second?.lat || !second?.lng) {
    return Number.POSITIVE_INFINITY;
  }

  const radius = 6371;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const latDistance = toRadians(second.lat - first.lat);
  const lngDistance = toRadians(second.lng - first.lng);
  const a =
    Math.sin(latDistance / 2) * Math.sin(latDistance / 2) +
    Math.cos(toRadians(first.lat)) *
      Math.cos(toRadians(second.lat)) *
      Math.sin(lngDistance / 2) *
      Math.sin(lngDistance / 2);

  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const findNearestAvailableAgent = async (order) => {
  const pickupZoneId = order.pickupZoneRef?._id || order.pickupZoneRef;
  const agents = await User.find({
    role: "deliveryAgent",
    isAvailable: true,
    $and: [
      { $or: [{ activeOrder: { $exists: false } }, { activeOrder: null }] },
      { $or: [{ assignedZone: pickupZoneId }, { assignedZone: { $exists: false } }, { assignedZone: null }] },
    ],
  });

  if (!agents.length) {
    return null;
  }

  const pickupCenter = order.pickupZoneRef?.center;

  return agents
    .map((agent) => ({
      agent,
      distance: distanceInKm(agent.currentLocation, pickupCenter),
      zoneMatch: agent.assignedZone?.toString() === pickupZoneId?.toString(),
    }))
    .sort((left, right) => {
      if (left.zoneMatch !== right.zoneMatch) return left.zoneMatch ? -1 : 1;
      return left.distance - right.distance;
    })[0].agent;
};

module.exports = {
  distanceInKm,
  findNearestAvailableAgent,
};
