const bcrypt = require("bcrypt");
const Order = require("../models/Order");
const RateCard = require("../models/RateCard");
const Tracking = require("../models/TrackingHistory");
const User = require("../models/User");
const Zone = require("../models/Zone");
const { findNearestAvailableAgent } = require("../services/assignmentService");
const { logStatusChange } = require("../services/trackingService");
const { buildOrderPayload, orderPopulate } = require("./orderController");
const { publicUser } = require("./authController");

const assignAgentToOrder = async (order, agentId, actorId, note = "Agent assigned") => {
  const agent = await User.findOne({ _id: agentId, role: "deliveryAgent" });

  if (!agent) {
    throw new Error("Delivery agent not found");
  }

  if (order.assignedAgent) {
    await User.findByIdAndUpdate(order.assignedAgent, {
      isAvailable: true,
      $unset: { activeOrder: "" },
    });
  }

  order.assignedAgent = agent._id;
  await order.save();

  await User.findByIdAndUpdate(agent._id, {
    isAvailable: false,
    activeOrder: order._id,
  });

  await Tracking.create({
    order: order._id,
    status: order.status,
    actor: actorId,
    note,
  });

  return agent;
};

exports.createZone = async (req, res) => {
  try {
    const zone = await Zone.create(req.body);
    res.status(201).json({ success: true, zone });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.listZones = async (req, res) => {
  const zones = await Zone.find().sort({ name: 1 });
  res.json({ success: true, count: zones.length, zones });
};

exports.updateZone = async (req, res) => {
  try {
    const zone = await Zone.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    if (!zone) {
      return res.status(404).json({ success: false, message: "Zone not found" });
    }

    res.json({ success: true, zone });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.createRateCard = async (req, res) => {
  try {
    const rateCard = await RateCard.findOneAndUpdate(
      {
        orderType: req.body.orderType,
        fromZone: req.body.fromZone,
        toZone: req.body.toZone,
      },
      req.body,
      { new: true, upsert: true, runValidators: true }
    ).populate("fromZone toZone", "name");

    res.status(201).json({ success: true, rateCard });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.listRateCards = async (req, res) => {
  const rateCards = await RateCard.find().populate("fromZone toZone", "name").sort({ orderType: 1 });
  res.json({ success: true, count: rateCards.length, rateCards });
};

exports.createStaffUser = async (req, res) => {
  try {
    const { name, email, password, role, phone, assignedZone } = req.body;

    if (!["admin", "deliveryAgent"].includes(role)) {
      return res.status(400).json({ success: false, message: "Role must be admin or deliveryAgent" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword, role, phone, assignedZone });

    res.status(201).json({ success: true, user: publicUser(user) });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateAgent = async (req, res) => {
  try {
    const agent = await User.findOneAndUpdate(
      { _id: req.params.id, role: "deliveryAgent" },
      req.body,
      { new: true, runValidators: true }
    );

    if (!agent) {
      return res.status(404).json({ success: false, message: "Agent not found" });
    }

    res.json({ success: true, agent: publicUser(agent) });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.listOrders = async (req, res) => {
  const query = {};

  if (req.query.status) query.status = req.query.status;
  if (req.query.agent) query.assignedAgent = req.query.agent;
  if (req.query.zone) query.$or = [{ pickupZoneRef: req.query.zone }, { dropZoneRef: req.query.zone }];

  const orders = await Order.find(query).populate(orderPopulate).sort({ createdAt: -1 });
  res.json({ success: true, count: orders.length, orders });
};

exports.createOrderForCustomer = async (req, res) => {
  try {
    const customer = await User.findOne({ _id: req.body.customer, role: "customer" });

    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    const orderPayload = await buildOrderPayload(req.body, customer._id);
    const order = await Order.create(orderPayload);

    await logStatusChange({
      order,
      status: "Created",
      actor: req.user.id,
      note: `Created by admin for ${customer.name}`,
    });

    await order.populate(orderPopulate);

    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.assignOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const agent = await assignAgentToOrder(order, req.body.agentId, req.user.id, "Manually assigned by admin");
    await order.populate(orderPopulate);

    res.json({ success: true, agent: publicUser(agent), order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.autoAssignOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("pickupZoneRef");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const agent = await findNearestAvailableAgent(order);

    if (!agent) {
      return res.status(404).json({ success: false, message: "No available delivery agent found" });
    }

    await assignAgentToOrder(order, agent._id, req.user.id, "Auto-assigned nearest available agent");
    await order.populate(orderPopulate);

    res.json({ success: true, agent: publicUser(agent), order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.overrideOrderStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    await logStatusChange({
      order,
      status: req.body.status,
      actor: req.user.id,
      note: req.body.note || "Status overridden by admin",
    });

    await order.populate(orderPopulate);
    res.json({ success: true, order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
