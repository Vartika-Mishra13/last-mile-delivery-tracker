const express = require("express");
const protect = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authMiddleware");
const {
  assignOrder,
  autoAssignOrder,
  createOrderForCustomer,
  createRateCard,
  createStaffUser,
  createZone,
  listOrders,
  listRateCards,
  listZones,
  overrideOrderStatus,
  updateAgent,
  updateZone,
} = require("../controllers/adminController");

const router = express.Router();

router.use(protect, authorize("admin"));

router.post("/zones", createZone);
router.get("/zones", listZones);
router.put("/zones/:id", updateZone);

router.post("/rate-cards", createRateCard);
router.get("/rate-cards", listRateCards);

router.post("/staff", createStaffUser);
router.patch("/agents/:id", updateAgent);

router.get("/orders", listOrders);
router.post("/orders", createOrderForCustomer);
router.patch("/orders/:id/assign", assignOrder);
router.post("/orders/:id/auto-assign", autoAssignOrder);
router.patch("/orders/:id/status", overrideOrderStatus);

module.exports = router;
