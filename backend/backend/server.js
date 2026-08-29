require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const connectDB = require("./config/db");
const validateRoute = require("./routes/validate");

const app = express();

/* =========================================================
   DATABASE CONNECTION
========================================================= */

connectDB();

/* =========================================================
   UPLOAD FOLDERS - LOCAL DEVELOPMENT
========================================================= */

if (process.env.NODE_ENV !== "production") {
  const uploadsPath = path.join(__dirname, "uploads");
  const assignmentsPath = path.join(uploadsPath, "assignments");

  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }

  if (!fs.existsSync(assignmentsPath)) {
    fs.mkdirSync(assignmentsPath, { recursive: true });
  }
}

/* =========================================================
   CORS
========================================================= */

const allowedOrigins = [
  "http://localhost:3000",
  "https://online-tutor-frontend-gamma.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without an origin
      // Example: Postman, server-to-server requests
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },

    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],

    credentials: true,
  })
);

/* =========================================================
   BODY PARSERS
========================================================= */

app.use(express.json({ limit: "10mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

/* =========================================================
   STATIC UPLOADS
========================================================= */

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

/* =========================================================
   BASE ROUTE
========================================================= */

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
  });
});

/* =========================================================
   API ROUTES
========================================================= */

// Authentication
app.use("/api/auth", require("./routes/authRoutes"));

// Admin
app.use("/api/admin", require("./routes/adminRoutes"));

// Student
app.use("/api/student", require("./routes/studentRoutes"));

// Teacher
app.use("/api/teacher", require("./routes/teacherRoutes"));

// Subjects
app.use("/api/subjects", require("./routes/subjectRoutes"));

// Queries
app.use("/api/queries", require("./routes/queryRoutes"));

// Assignments
app.use("/api/assignments", require("./routes/assignmentRoutes"));

// Live Classes
app.use("/api/live-classes", require("./routes/liveClassRoutes"));

// Class Requests
app.use(
  "/api/class-requests",
  require("./routes/classRequests")
);

// Attendance
app.use("/api", require("./routes/attendanceRoutes"));

// Prompt
app.use("/api/prompt", require("./routes/promptRoutes"));

// Validation
app.use("/api/validate", validateRoute);

// Customer / Crew
app.use("/api/crew", require("./routes/customerRoutes"));

/* =========================================================
   API NOT FOUND HANDLER
========================================================= */

// IMPORTANT:
// If the frontend calls a wrong API URL,
// this returns JSON instead of an HTML page.

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

/* =========================================================
   GENERAL 404 HANDLER
========================================================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use((err, req, res, next) => {
  console.error("Server Error:", err);

  // Multer upload errors
  if (err.name === "MulterError") {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];

    return res.status(400).json({
      success: false,
      message: `${field || "Field"} already exists`,
    });
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map(
      (error) => error.message
    );

    return res.status(400).json({
      success: false,
      message: errors.join(", "),
    });
  }

  // General server error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

/* =========================================================
   EXPORT FOR VERCEL
========================================================= */

module.exports = app;

/* =========================================================
   START SERVER - LOCAL DEVELOPMENT ONLY
========================================================= */

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}