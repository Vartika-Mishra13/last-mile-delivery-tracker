const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];

    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid Token",
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      message: "No Token",
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this resource",
      });
    }

    next();
  };
};

module.exports = protect;
module.exports.authorize = authorize;
