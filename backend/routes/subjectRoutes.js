const express = require("express");
const router = express.Router();
const Subject = require("../models/Subject");

// ✅ Get all subjects
router.get("/", async (req, res) => {
  try {
    const { class: studentClass } = req.query;

    // ❌ If no class provided → return empty
    if (!studentClass) {
      return res.json({
        success: true,
        subjects: []
      });
    }

    const subjects = await Subject.find({
      isActive: true,
      classes: studentClass
    });

    res.json({
      success: true,
      subjects
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch subjects" });
  }
});

router.get("/id/:id", async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate("teacher", "firstName lastName email");

    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    res.json({ success: true, subject });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


// ✅ Get subject by name (🔥 ADDED - DO NOT MOVE THIS)
router.get("/:name", async (req, res) => {
  try {
    const subject = await Subject.findOne({
      name: { $regex: req.params.name, $options: "i" }
    }).populate("teacher", "firstName lastName email");

    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    // Only send useful data
    res.json({
      subject: {
        name: subject.name,
        teacher: subject.teacher
          ? {
              firstName: subject.teacher.firstName,
              lastName: subject.teacher.lastName,
              email: subject.teacher.email
            }
          : null
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


// ✅ Create subject
router.post("/", async (req, res) => {
  try {
    const { name, category, price, classes } = req.body;

    const exists = await Subject.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") }
    });

    if (exists) {
      return res.status(400).json({ message: "Subject already exists" });
    }

    const subject = new Subject({
      name: name.trim(),
      category,
      price,
      classes: Array.isArray(classes) ? classes : [classes]
    });

    await subject.save();

    res.status(201).json({ success: true, subject });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create subject" });
  }
});

// ✅ Update subject
router.put("/:id", async (req, res) => {
  try {
    const updated = await Subject.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Subject not found" });
    }

    res.json({ success: true, subject: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update subject" });
  }
});

// ✅ Delete subject
router.delete("/:id", async (req, res) => {
  try {
    await Subject.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Subject deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete subject" });
  }
});

module.exports = router;