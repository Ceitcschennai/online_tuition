const express = require("express");
const router = express.Router();
const { handleRequest } = require("../services/requestService");
const { KnowledgeAgent } = require("../agents/crewAgents");

// ================= POST /api/crew/request =================
router.post("/request", async (req, res) => {
  try {
    const { input, customerId } = req.body;

    // Validate input
    if (!input || !customerId) {
      return res.status(400).json({
        success: false,
        error: "input and customerId are required",
      });
    }

    const result = await handleRequest(input, customerId);
    res.status(200).json({ success: true, message: result });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ================= GET /api/crew/interactions/:customerId =================
router.get("/interactions/:customerId", async (req, res) => {
  try {
    const interactions = await KnowledgeAgent.searchInteractions(req.params.customerId);
    res.status(200).json({ success: true, data: interactions });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;                         