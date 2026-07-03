const Order = require("../models/Order");
const Tracking = require("../models/TrackingHistory");
const User = require("../models/User");
const calculateCharge = require("../services/rateCalculator");
const { findNearestAvailableAgent } = require("../services/assignmentService");
const { logStatusChange } = require("../services/trackingService");

const orderPopulate = [
  { path: "customer", select: "name email phone" },
  { path: "assignedAgent", select: "name email phone currentLocation isAvailable" },
  { path: "pickupZoneRef", select: "name center" },
  { path: "dropZoneRef", select: "name center" },
];

const quoteOrder = async (payload) => {
  const result = await calculateCharge(payload);

  return {
    pickupZone: result.pickupZone.name,
    dropZone: result.dropZone.name,
    pickupZoneRef: result.pickupZone._id,
    dropZoneRef: result.dropZone._id,
    volumetricWeight: result.volumetricWeight,
    billableWeight: result.billableWeight,
    ratePerKg: result.ratePerKg,
    baseCharge: result.baseCharge,
    codSurcharge: result.codSurcharge,
    deliveryCharge: result.charge,
  };
};

const buildOrderPayload = async (body, customerId) => {
  const quote = await quoteOrder(body);

  return {
    customer: customerId,
    pickupAddress: body.pickupAddress,
    dropAddress: body.dropAddress,
    pickupZone: quote.pickupZone,
    pickupZoneRef: quote.pickupZoneRef,
    dropZone: quote.dropZone,
    dropZoneRef: quote.dropZoneRef,
    length: body.length,
    breadth: body.breadth,
    height: body.height,
    actualWeight: body.actualWeight,
    volumetricWeight: quote.volumetricWeight,
    billableWeight: quote.billableWeight,
    deliveryCharge: quote.deliveryCharge,
    ratePerKg: quote.ratePerKg,
    codSurcharge: quote.codSurcharge,
    orderType: body.orderType,
    paymentType: body.paymentType,
  };
};

exports.getQuote = async (req, res) => {
  try {
    const quote = await quoteOrder(req.body);
    res.json({ success: true, quote });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const orderPayload = await buildOrderPayload(req.body, req.user.id);
    const order = await Order.create(orderPayload);

    await logStatusChange({
      order,
      status: "Created",
      actor: req.user.id,
      note: "Order created after customer confirmation",
    });

    await order.populate(orderPopulate);

    res.status(201).json({
      success: true,
      order,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

exports.listMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user.id }).populate(orderPopulate).sort({ createdAt: -1 });
    res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.user.id }).populate(orderPopulate);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const timeline = await Tracking.find({ order: order._id })
      .populate("actor", "name role")
      .sort({ createdAt: 1 });

    res.json({ success: true, order, timeline });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.rescheduleOrder = async (req, res) => {
  try {
    const { rescheduleDate } = req.body;
    const order = await Order.findOne({ _id: req.params.id, customer: req.user.id }).populate("pickupZoneRef");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status !== "Failed") {
      return res.status(400).json({ success: false, message: "Only failed orders can be rescheduled" });
    }

    order.rescheduleDate = rescheduleDate;
    order.attempts += 1;
    order.assignedAgent = undefined;
    await logStatusChange({
      order,
      status: "Created",
      actor: req.user.id,
      note: `Rescheduled for ${rescheduleDate}`,
    });

    const agent = await findNearestAvailableAgent(order);

    if (agent) {
      order.assignedAgent = agent._id;
      await order.save();
      await User.findByIdAndUpdate(agent._id, { isAvailable: false, activeOrder: order._id });
      await Tracking.create({
        order: order._id,
        status: order.status,
        actor: req.user.id,
        note: `Reassigned to ${agent.name}`,
      });
    }

    await order.populate(orderPopulate);

    res.json({
      success: true,
      message: agent ? "Order rescheduled and agent reassigned" : "Order rescheduled; no available agent found",
      order,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.buildOrderPayload = buildOrderPayload;
exports.orderPopulate = orderPopulate;
