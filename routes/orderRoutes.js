const express = require("express");
const protect = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authMiddleware");
const {
  createOrder,
  getMyOrder,
  getQuote,
  listMyOrders,
  rescheduleOrder,
} = require("../controllers/orderController");

const router = express.Router();

router.post("/quote", protect, authorize("customer", "admin"), getQuote);
router.post("/", protect, authorize("customer"), createOrder);
router.get("/", protect, authorize("customer"), listMyOrders);
router.get("/:id", protect, authorize("customer"), getMyOrder);
router.post("/:id/reschedule", protect, authorize("customer"), rescheduleOrder);

module.exports = router;
