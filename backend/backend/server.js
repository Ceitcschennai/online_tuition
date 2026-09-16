require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const connectDB = require("./config/db");

// =========================================================
// ROUTES
// =========================================================

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const studentRoutes = require("./routes/studentRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const teacherPaymentRoutes = require("./routes/teacherPaymentRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const queryRoutes = require("./routes/queryRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const liveClassRoutes = require("./routes/liveClassRoutes");
const classRequestsRoutes = require("./routes/classRequests");
const attendanceRoutes = require("./routes/attendanceRoutes");
const promptRoutes = require("./routes/promptRoutes");
const validateRoutes = require("./routes/validate");
const customerRoutes = require("./routes/customerRoutes");

const app = express();

// =========================================================
// DATABASE CONNECTION
// =========================================================

connectDB()
  .then(() => {
    console.log("✅ MongoDB connection initialized");
  })
  .catch((err) => {
    console.error(
      "❌ MongoDB connection failed:",
      err.message
    );
  });

// =========================================================
// UPLOAD FOLDERS
// LOCAL DEVELOPMENT ONLY
// =========================================================

if (
  process.env.NODE_ENV !== "production" &&
  !process.env.VERCEL
) {
  const uploadsPath = path.join(
    __dirname,
    "uploads"
  );

  const assignmentsPath = path.join(
    uploadsPath,
    "assignments"
  );

  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, {
      recursive: true,
    });
  }

  if (!fs.existsSync(assignmentsPath)) {
    fs.mkdirSync(assignmentsPath, {
      recursive: true,
    });
  }

  console.log("📁 Local upload folders ready");
}

// =========================================================
// CORS
// =========================================================

const allowedOrigins = [
  "https://online-tuition-1wvb.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin)
      ) {
        callback(null, true);
      } else {
        callback(
          new Error("Not allowed by CORS")
        );
      }
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

// =========================================================
// BODY PARSERS
// =========================================================

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

// =========================================================
// STATIC UPLOADS
// =========================================================

app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads")
  )
);

// =========================================================
// BASE ROUTE / HEALTH CHECK
// =========================================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Online Tuition API is running",
    environment:
      process.env.NODE_ENV || "development",
  });
});

// =========================================================
// API ROUTES
// =========================================================

// Authentication
app.use(
  "/api/auth",
  authRoutes
);

// Admin
app.use(
  "/api/admin",
  adminRoutes
);

// Student
app.use(
  "/api/student",
  studentRoutes
);

// Teacher
app.use(
  "/api/teacher",
  teacherRoutes
);

// Payments
app.use(
  "/api/payments",
  paymentRoutes
);

// Teacher Payments
app.use(
  "/api/teacher-payments",
  teacherPaymentRoutes
);

// Subjects
app.use(
  "/api/subjects",
  subjectRoutes
);

// Queries
app.use(
  "/api/queries",
  queryRoutes
);

// Assignments
app.use(
  "/api/assignments",
  assignmentRoutes
);

// Live Classes
app.use(
  "/api/live-classes",
  liveClassRoutes
);

// Class Requests
app.use(
  "/api/class-requests",
  classRequestsRoutes
);

// Attendance
app.use(
  "/api",
  attendanceRoutes
);

// Prompt
app.use(
  "/api/prompt",
  promptRoutes
);

// Validation
app.use(
  "/api/validate",
  validateRoutes
);

// Customer / Crew
app.use(
  "/api/crew",
  customerRoutes
);

// =========================================================
// API NOT FOUND HANDLER
// =========================================================

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message:
      `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

// =========================================================
// GENERAL 404 HANDLER
// =========================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// =========================================================
// GLOBAL ERROR HANDLER
// =========================================================

app.use(
  (err, req, res, next) => {
    console.error(
      "===================================="
    );

    console.error("❌ SERVER ERROR");

    console.error(
      "===================================="
    );

    console.error(err);

    console.error(
      "===================================="
    );

    // Multer upload errors
    if (err.name === "MulterError") {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    // MongoDB duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(
        err.keyValue || {}
      )[0];

      return res.status(400).json({
        success: false,
        message:
          `${field || "Field"} already exists`,
      });
    }

    // Mongoose validation error
    if (
      err.name === "ValidationError"
    ) {
      const errors = Object.values(
        err.errors
      ).map(
        (error) => error.message
      );

      return res.status(400).json({
        success: false,
        message:
          errors.join(", "),
      });
    }

    // CORS error
    if (
      err.message &&
      err.message.includes("CORS")
    ) {
      return res.status(403).json({
        success: false,
        message: "CORS error",
      });
    }

    // General server error
    return res.status(
      err.status || 500
    ).json({
      success: false,
      message:
        err.message ||
        "Internal server error",
    });
  }
);

// =========================================================
// EXPORT EXPRESS APP
// =========================================================

module.exports = app;

// =========================================================
// LOCAL DEVELOPMENT SERVER
// =========================================================

if (
  process.env.NODE_ENV !== "production" &&
  !process.env.VERCEL
) {
  const PORT =
    process.env.PORT || 5000;

  app.listen(
    PORT,
    () => {
      console.log(
        `🚀 Server running on port ${PORT}`
      );

      console.log(
        `🌐 http://localhost:${PORT}`
      );
    }
  );
}