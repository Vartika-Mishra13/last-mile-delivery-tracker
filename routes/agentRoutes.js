const express = require("express");
const protect = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authMiddleware");
const {
  listAssignedOrders,
  updateAvailability,
  updateLocation,
  updateOrderStatus,
} = require("../controllers/agentController");

const router = express.Router();

router.use(protect, authorize("deliveryAgent"));

router.get("/orders", listAssignedOrders);
router.patch("/location", updateLocation);
router.patch("/availability", updateAvailability);
router.patch("/orders/:id/status", updateOrderStatus);

module.exports = router;
