const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");
const agentRoutes = require("./routes/agentRoutes");

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/agent", agentRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Last Mile Delivery Tracker API is running",
    docs: "/api/docs",
  });
});

app.get("/api/docs", (req, res) => {
  res.json({
    success: true,
    endpoints: {
      auth: ["POST /api/auth/register", "POST /api/auth/login", "GET /api/auth/profile"],
      customer: [
        "POST /api/orders/quote",
        "POST /api/orders",
        "GET /api/orders",
        "GET /api/orders/:id",
        "POST /api/orders/:id/reschedule",
      ],
      admin: [
        "POST /api/admin/zones",
        "GET /api/admin/zones",
        "PUT /api/admin/zones/:id",
        "POST /api/admin/rate-cards",
        "GET /api/admin/rate-cards",
        "GET /api/admin/orders",
        "POST /api/admin/orders",
        "PATCH /api/admin/orders/:id/assign",
        "POST /api/admin/orders/:id/auto-assign",
        "PATCH /api/admin/orders/:id/status",
        "PATCH /api/admin/agents/:id",
      ],
      agent: [
        "GET /api/agent/orders",
        "PATCH /api/agent/location",
        "PATCH /api/agent/availability",
        "PATCH /api/agent/orders/:id/status",
      ],
    },
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
