const express = require("express");
const protect = require("../middleware/authMiddleware");
const { register, login } = require("../controllers/authController");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.get("/profile", protect, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

module.exports = router;
