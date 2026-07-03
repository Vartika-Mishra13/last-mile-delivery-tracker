const Order = require("../models/Order");
const User = require("../models/User");
const { logStatusChange } = require("../services/trackingService");
const { orderPopulate } = require("./orderController");

const allowedAgentStatuses = ["Picked Up", "In Transit", "Out for Delivery", "Delivered", "Failed"];

exports.listAssignedOrders = async (req, res) => {
  const orders = await Order.find({ assignedAgent: req.user.id }).populate(orderPopulate).sort({ createdAt: -1 });
  res.json({ success: true, count: orders.length, orders });
};

exports.updateLocation = async (req, res) => {
  const { lat, lng } = req.body;
  const agent = await User.findByIdAndUpdate(
    req.user.id,
    { currentLocation: { lat, lng, updatedAt: new Date() } },
    { new: true }
  );

  res.json({ success: true, agent });
};

exports.updateAvailability = async (req, res) => {
  const agent = await User.findByIdAndUpdate(
    req.user.id,
    { isAvailable: req.body.isAvailable },
    { new: true }
  );

  res.json({ success: true, agent });
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, note } = req.body;

    if (!allowedAgentStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status for delivery agent" });
    }

    const order = await Order.findOne({ _id: req.params.id, assignedAgent: req.user.id });

    if (!order) {
      return res.status(404).json({ success: false, message: "Assigned order not found" });
    }

    await logStatusChange({ order, status, actor: req.user.id, note });
    await order.populate(orderPopulate);

    res.json({ success: true, order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
