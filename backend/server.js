require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const connectDB = require("./config/db");
const validateRoute  = require("./routes/validate");

const app = express();

// ================= CONNECT DB =================
connectDB();

// ================= UPLOAD FOLDER (LOCAL ONLY) =================
if (process.env.NODE_ENV !== "production") {
  if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads", { recursive: true });
  }
  if (!fs.existsSync("uploads/assignments")) {
    fs.mkdirSync("uploads/assignments", { recursive: true });
  }
}

// ================= MIDDLEWARE =================
app.use(cors({
  origin: [
    "https://ceitcsacedamy-08-05-2026-main-ksin.vercel.app",
    "https://ceitcsacedamy-08-05-2026-main.vercel.app",
    "http://localhost:3000"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads (only works locally)
app.use("/uploads", express.static("uploads"));

// ================= BASE ROUTE =================
app.get("/", (req, res) => {
  res.send("✅ API is running...");
});

// ================= ROUTES =================
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/student", require("./routes/studentRoutes"));
app.use("/api/students", require("./routes/studentRoutes"));
app.use("/api/teacher", require("./routes/teacherRoutes"));
app.use("/api/teachers", require("./routes/teacherRoutes"));
app.use("/api/subjects", require("./routes/subjectRoutes"));
app.use("/api/queries", require("./routes/queryRoutes"));
app.use("/api/assignments", require("./routes/assignmentRoutes"));
app.use("/api/live-classes", require("./routes/liveClassRoutes"));
app.use("/api", require("./routes/attendanceRoutes"));
app.use("/api/validate",  validateRoute);


// ================= CREW AGENT ROUTE =================
app.use("/api/crew", require("./routes/customerRoutes"));

// ================= EXPORT FOR VERCEL =================
module.exports = app;

// ================= START SERVER (LOCAL ONLY) =================
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}
  