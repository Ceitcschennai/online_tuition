require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const connectDB = require("./config/db");

const app = express();

/* =========================================================
   DATABASE CONNECTION
========================================================= */

connectDB()
  .then(() => {
    console.log("✅ MongoDB connection initialized");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
  });

/* =========================================================
   UPLOAD FOLDERS - LOCAL DEVELOPMENT ONLY
========================================================= */

if (process.env.NODE_ENV !== "production") {
  const uploadsPath = path.join(__dirname, "uploads");
  const assignmentsPath = path.join(
    uploadsPath,
    "assignments"
  );

  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }

  if (!fs.existsSync(assignmentsPath)) {
    fs.mkdirSync(assignmentsPath, { recursive: true });
  }

  console.log("📁 Local upload folders ready");
}

/* =========================================================
   CORS
========================================================= */

const allowedOrigins = [
  "http://localhost:3000",
  
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* =========================================================
   BODY PARSERS
========================================================= */

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

/* =========================================================
   STATIC UPLOADS
========================================================= */

app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads")
  )
);

/* =========================================================
   BASE ROUTE / HEALTH CHECK
========================================================= */

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Online Tuition API is running",
    environment:
      process.env.NODE_ENV || "development",
  });
});

/* =========================================================
   ROUTE LOADER
========================================================= */

function loadRoute(routePath) {
  try {
    const route = require(routePath);

    // Normal Express Router
    if (typeof route === "function") {
      return route;
    }

    // { router: router }
    if (
      route &&
      typeof route.router === "function"
    ) {
      return route.router;
    }

    // { default: router }
    if (
      route &&
      typeof route.default === "function"
    ) {
      return route.default;
    }

    console.error(
      `❌ Invalid Express router export: ${routePath}`
    );

    console.error("Received:", route);

    throw new TypeError(
      `Route ${routePath} does not export an Express router`
    );
  } catch (error) {
    console.error(
      `❌ Failed to load route: ${routePath}`
    );

    console.error(error);

    throw error;
  }
}

/* =========================================================
   API ROUTES
========================================================= */

// Authentication
app.use(
  "/api/auth",
  loadRoute("./routes/authRoutes")
);

// Admin
app.use(
  "/api/admin",
  loadRoute("./routes/adminRoutes")
);

// Student
app.use(
  "/api/student",
  loadRoute("./routes/studentRoutes")
);

// Teacher
app.use(
  "/api/teacher",
  loadRoute("./routes/teacherRoutes")
);

// Payments
app.use(
  "/api/payments",
  loadRoute("./routes/paymentRoutes")
);

// Teacher Payments
app.use(
  "/api/teacher-payments",
  loadRoute("./routes/teacherPaymentRoutes")
);

// Subjects
app.use(
  "/api/subjects",
  loadRoute("./routes/subjectRoutes")
);

// Queries
app.use(
  "/api/queries",
  loadRoute("./routes/queryRoutes")
);

// Assignments
app.use(
  "/api/assignments",
  loadRoute("./routes/assignmentRoutes")
);

// Live Classes
app.use(
  "/api/live-classes",
  loadRoute("./routes/liveClassRoutes")
);

// Class Requests
app.use(
  "/api/class-requests",
  loadRoute("./routes/classRequests")
);

// Attendance
app.use(
  "/api",
  loadRoute("./routes/attendanceRoutes")
);

// Prompt
app.use(
  "/api/prompt",
  loadRoute("./routes/promptRoutes")
);

// Validation
app.use(
  "/api/validate",
  loadRoute("./routes/validate")
);

// Customer / Crew
app.use(
  "/api/crew",
  loadRoute("./routes/customerRoutes")
);

/* =========================================================
   API NOT FOUND HANDLER
========================================================= */

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message:
      `API route not found: ${req.method} ${req.originalUrl}`,
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
  console.error("====================================");
  console.error("❌ SERVER ERROR");
  console.error("====================================");
  console.error(err);
  console.error("====================================");

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
  if (err.name === "ValidationError") {
    const errors = Object.values(
      err.errors
    ).map((error) => error.message);

    return res.status(400).json({
      success: false,
      message: errors.join(", "),
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
  return res.status(err.status || 500).json({
    success: false,
    message:
      err.message ||
      "Internal server error",
  });
});

/* =========================================================
   EXPORT EXPRESS APP
========================================================= */

module.exports = app;

/* =========================================================
   LOCAL DEVELOPMENT SERVER
========================================================= */

// Vercel runs the exported Express app as a
// Serverless Function, so app.listen() is NOT used
// in production.

if (
  process.env.NODE_ENV !== "production" &&
  !process.env.VERCEL
) {
  const PORT =
    process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(
      `🚀 Server running on port ${PORT}`
    );

    console.log(
      `🌐 http://localhost:${PORT}`
    );
  });
}