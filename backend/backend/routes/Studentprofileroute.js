/**
 * Add this route to your existing student routes file
 * File: /routes/studentRoutes.js  (or wherever your student routes live)
 *
 * This endpoint returns the FULL student profile including panNumber
 * Used by the student dashboard to always show correct profile data
 */

const express = require('express');
const router  = express.Router();
const Student = require('../models/Student');
const { protect } = require('../middleware/authMiddleware');

// GET /api/student/:id/profile
// Returns full student profile (excluding password)
// Student can only fetch their own profile
router.get('/:id/profile', protect, async (req, res) => {
  try {
    const requestedId     = req.params.id;
    const authenticatedId = req.user._id.toString();

    // Security: students can only view their own profile
    if (req.user.role === 'student' && requestedId !== authenticatedId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own profile.',
      });
    }

    const student = await Student.findById(requestedId).select('-password');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    return res.status(200).json({
      success: true,
      student: student.toObject(),
    });

  } catch (err) {
    console.error('Student profile fetch error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;

/*
 ─── HOW TO USE ────────────────────────────────────────────────────────────────
 If you already have a student router, just ADD this one route to it:

   // In your existing studentRoutes.js:
   router.get('/:id/profile', protect, async (req, res) => { ... });

 Make sure your main app.js mounts the student router at /api/student:
   app.use('/api/student', studentRoutes);

 The dashboard calls:  GET /api/student/:id/profile
 ───────────────────────────────────────────────────────────────────────────────
*/