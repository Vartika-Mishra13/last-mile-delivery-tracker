const Tracking = require("../models/TrackingHistory");
const User = require("../models/User");
const { sendStatusNotification } = require("./notificationService");

const terminalStatuses = ["Delivered", "Failed"];

const logStatusChange = async ({ order, status, actor, note }) => {
  order.status = status;

  if (status === "Failed" && note) {
    order.failedReason = note;
  }

  await order.save();

  const tracking = await Tracking.create({
    order: order._id,
    status,
    actor,
    note,
  });

  await sendStatusNotification(order, status, note);

  if (terminalStatuses.includes(status) && order.assignedAgent) {
    await User.findByIdAndUpdate(order.assignedAgent, {
      isAvailable: true,
      $unset: { activeOrder: "" },
    });
  }

  return tracking;
};

module.exports = {
  logStatusChange,
};
