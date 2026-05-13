const express = require("express");
const router  = express.Router();
const { handlePartialValidation, handleRegistration } = require("../agents/crewAgents");

// ── POST /api/validate/partial — live typing (debounced) ──────────────────────
router.post("/partial", async (req, res) => {
  try {
    const { role, fields, hasFile } = req.body;

    if (!role || !fields) {
      return res.status(400).json({ message: "role and fields are required" });
    }

    const result = await handlePartialValidation(role, fields, !!hasFile);
    return res.json(result);

  } catch (err) {
    // Log the REAL error so you can see it in your terminal
    console.error("❌ Partial validation error:", err.message);
    return res.status(500).json({ message: "Validation service unavailable", detail: err.message });
  }
});

// ── POST /api/validate/full — Validate button ─────────────────────────────────
router.post("/full", async (req, res) => {
  try {
    const { role, payload, hasFile } = req.body;

    if (!role || !payload) {
      return res.status(400).json({ message: "role and payload are required" });
    }

    const result = await handleRegistration(role, payload, !!hasFile);
    return res.json(result);

  } catch (err) {
    console.error("❌ Full validation error:", err.message);
    return res.status(500).json({ message: "Full validation service unavailable", detail: err.message });
  }
});

module.exports = router;