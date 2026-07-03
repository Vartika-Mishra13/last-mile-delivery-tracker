const bcrypt = require("bcrypt");
const validator = require("validator");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  assignedZone: user.assignedZone,
  isAvailable: user.isAvailable,
  currentLocation: user.currentLocation,
});

exports.register = async (req, res) => {
  try {
    const { name, email, password, role = "customer", phone, address } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: "Please provide a valid email" });
    }

    if (role !== "customer" && process.env.ALLOW_ROLE_REGISTRATION !== "true") {
      return res.status(403).json({
        success: false,
        message: "Only customer self-registration is enabled",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      phone,
      address,
    });
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      token,
      user: publicUser(user),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      token,
      user: publicUser(user),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.publicUser = publicUser;
