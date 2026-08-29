/**
 * File: /routes/promptRoute.js
 */

const express = require("express");
const router  = express.Router();

const { runPromptPipeline } = require("../agents/promptOrchestrator");
const { protect }           = require("../middleware/authMiddleware");

// ─────────────────────────────────────────────
// RATE LIMITER
// ─────────────────────────────────────────────
const rateLimitMap = new Map();

function rateLimit(req, res, next) {
  const key      = req.user?._id?.toString() || req.ip;
  const now      = Date.now();
  const windowMs = 60 * 1000;
  const maxReqs  = 15;

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, start: now });
    return next();
  }

  const entry = rateLimitMap.get(key);

  if (now - entry.start > windowMs) {
    rateLimitMap.set(key, { count: 1, start: now });
    return next();
  }

  if (entry.count >= maxReqs) {
    return res.status(429).json({
      success: false,
      blocked: true,
      message: "Too many requests. Please wait before trying again.",
      trace: ["RateLimit"],
    });
  }

  entry.count++;
  next();
}

// ─────────────────────────────────────────────
// POST /api/prompt
// ─────────────────────────────────────────────
router.post("/", protect, rateLimit, async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return res.status(400).json({ success: false, blocked: true, message: "Prompt is required." });
    }

    if (prompt.trim().length > 500) {
      return res.status(400).json({ success: false, blocked: true, message: "Prompt too long." });
    }

    // ✅ authMiddleware may NOT include panNumber by default if your
    //    Student model has select:false on panNumber.
    //    We pass the user ID + role to the orchestrator so it can
    //    re-fetch panNumber directly from DB with "+panNumber".
    //    Do NOT rely on req.user.panNumber — it may be undefined.
    const authenticatedUser = {
      id:   req.user._id,
      role: req.user.role || "student",

      // Identity (for AI greeting context only)
      name:       `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() || "User",
      salutation: req.user.salutation || "",
      firstName:  req.user.firstName  || "",
      lastName:   req.user.lastName   || "",

      // Contact
      email:    req.user.email    || "",
      mobile:   req.user.mobile   || "",
      timezone: req.user.timezone || "",

      // Student fields for AI context
      // panNumber is intentionally NOT passed here —
      // SecureDataAgent fetches it fresh from DB with "+panNumber"
      class:          req.user.class          || "",
      syllabus:       req.user.syllabus        || "",
      group:          req.user.group           || "",
      emisNumber:     req.user.emisNumber      || "",
      status:         req.user.status          || "",
      approvalStatus: req.user.approvalStatus  || "",

      // Teacher fields
      qualification:   req.user.qualification   || "",
      preferredSubject: req.user.preferredSubject || "",
      subjects:         req.user.subjects         || [],
      classesAssigned:  req.user.classesAssigned  || [],
    };

    console.log("✅ Prompt request — user:", {
      id:   authenticatedUser.id,
      role: authenticatedUser.role,
      name: authenticatedUser.name,
    });

    const result = await runPromptPipeline(prompt.trim(), authenticatedUser);

    return res.status(result.blocked ? 403 : 200).json(result);

  } catch (err) {
    console.error("❌ Prompt Route Error:", err);
    return res.status(500).json({
      success: false,
      blocked: true,
      message: "The AI assistant encountered an error.",
    });
  }
});

module.exports = router;