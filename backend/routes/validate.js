const express = require("express");
const router  = express.Router();

const {
  handlePartialValidation,
  handleRegistration,
  detectRoleViolations,
} = require("../agents/crewAgents");

// ── POST /api/validate/partial — live typing (debounced) ──────────────────────
router.post("/partial", async (req, res) => {
  try {
    const { role, fields, hasFile } = req.body;

    if (!role || !fields) {
      return res
        .status(400)
        .json({ message: "role and fields are required" });
    }

    // ✅ GUARDRAIL 3: Detect role violations before anything runs.
    // If a teacher tries to submit panNumber → rejected immediately with 403.
    const violations = detectRoleViolations(fields, role);
    if (violations.length > 0) {
      console.warn(
        `🚫 Role violation attempt — role: "${role}", fields: ${violations.join(", ")}`
      );
      return res.status(403).json({
        message: `Access denied: fields [${violations.join(", ")}] are not allowed for role "${role}"`,
        violations,
      });
    }

    const result = await handlePartialValidation(role, fields, !!hasFile);
    return res.json(result);

  } catch (err) {
    console.error("❌ Partial validation error:", err.message);
    return res
      .status(500)
      .json({ message: "Validation service unavailable", detail: err.message });
  }
});

// ── POST /api/validate/full — Validate button ─────────────────────────────────
router.post("/full", async (req, res) => {
  try {
    const { role, payload, hasFile } = req.body;

    if (!role || !payload) {
      return res
        .status(400)
        .json({ message: "role and payload are required" });
    }

    // ✅ GUARDRAIL 3: Detect role violations before anything runs.
    // If someone bypasses the UI and sends panNumber for teacher → blocked here.
    const violations = detectRoleViolations(payload, role);
    if (violations.length > 0) {
      console.warn(
        `🚫 Role violation attempt — role: "${role}", fields: ${violations.join(", ")}`
      );
      return res.status(403).json({
        message: `Access denied: fields [${violations.join(", ")}] are not allowed for role "${role}"`,
        violations,
      });
    }

    const result = await handleRegistration(role, payload, !!hasFile);
    return res.json(result);

  } catch (err) {
    console.error("❌ Full validation error:", err.message);
    return res
      .status(500)
      .json({ message: "Full validation service unavailable", detail: err.message });
  }
});

module.exports = router;