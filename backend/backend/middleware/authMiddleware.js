const jwt = require("jsonwebtoken");

const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const Admin = require("../models/Admin");

const protect = async (req, res, next) => {

  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {

    try {

      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      /*
        Admin tokens are issued as { role: "admin", email } (and the
        super-admin variant as { id: "super-admin", role: "admin" }).
        They do not reference a Student/Teacher/Admin document, so a
        document lookup by decoded.id would always fail. The JWT itself
        is signed with JWT_SECRET, so the decoded role is authoritative.
        Trust it instead of attempting a user-document lookup.
      */
      if (decoded.role === "admin") {
        req.user = {
          _id: decoded.id || null,
          id: decoded.id || null,
          role: "admin",
          email: decoded.email || null,
        };
        return next();
      }

      let user = null;

      // Student check
      user = await Student.findById(decoded.id).select("-password");

      // Teacher check
      if (!user) {
        user = await Teacher.findById(decoded.id).select("-password");
      }

      // Admin check
      if (!user) {
        user = await Admin.findById(decoded.id).select("-password");
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      req.user = { ...user.toObject(), role: decoded.role };

      next();

    } catch (error) {

      console.log(error);

      // Handle token expired specifically
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token expired, please login again",
        });
      }

      // Handle invalid token
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Invalid token, please login again",
        });
      }

      return res.status(401).json({
        success: false,
        message: "Token failed",
      });
    }
  }

  if (!token) {

    return res.status(401).json({
      success: false,
      message: "No token, please login",
    });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }
  next();
};

module.exports = { protect, requireAdmin };