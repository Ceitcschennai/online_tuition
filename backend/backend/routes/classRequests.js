// const express      = require('express');
// const router       = express.Router();
// const ClassRequest = require('../models/ClassRequest');

// // POST /api/class-requests — Student submits a class request
// router.post('/', async (req, res) => {
//   try {
//     const {
//       studentId, studentName, studentClass,
//       teacherId, teacherName,
//       subject, preferredDate, preferredTime, reason,
//     } = req.body;

//     if (!studentId || !teacherId || !subject || !preferredDate || !preferredTime) {
//       return res.status(400).json({ message: 'Missing required fields' });
//     }

//     const classRequest = new ClassRequest({
//       studentId, studentName, studentClass,
//       teacherId, teacherName,
//       subject,
//       preferredDate: new Date(preferredDate),
//       preferredTime,
//       reason: reason || '',
//     });

//     await classRequest.save();
//     res.status(201).json({ message: 'Class request submitted successfully', classRequest });
//   } catch (err) {
//     console.error('Error creating class request:', err);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// // GET /api/class-requests/student/:studentId — Student's own requests
// router.get('/student/:studentId', async (req, res) => {
//   try {
//     const classRequests = await ClassRequest
//       .find({ studentId: req.params.studentId })
//       .sort({ createdAt: -1 });
//     res.status(200).json({ classRequests: classRequests || [] });
//   } catch (err) {
//     console.error('Error fetching student class requests:', err);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// // GET /api/class-requests/teacher/:teacherId — All requests for a teacher
// router.get('/teacher/:teacherId', async (req, res) => {
//   try {
//     const classRequests = await ClassRequest
//       .find({ teacherId: req.params.teacherId })
//       .sort({ createdAt: -1 });
//     res.status(200).json({ classRequests: classRequests || [] });
//   } catch (err) {
//     console.error('Error fetching teacher class requests:', err);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// // PUT /api/class-requests/:id/status — Teacher accepts or rejects
// router.put('/:id/status', async (req, res) => {
//   try {
//     const { status, responseMessage } = req.body;
//     const validStatuses = ['Pending', 'Accepted', 'Rejected', 'Completed'];
//     if (!validStatuses.includes(status)) {
//       return res.status(400).json({ message: 'Invalid status value' });
//     }
//     const classRequest = await ClassRequest.findByIdAndUpdate(
//       req.params.id,
//       { status, responseMessage: responseMessage || '' },
//       { new: true }
//     );
//     if (!classRequest) {
//       return res.status(404).json({ message: 'Class request not found' });
//     }
//     res.status(200).json({ message: 'Status updated', classRequest });
//   } catch (err) {
//     console.error('Error updating status:', err);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// // DELETE /api/class-requests/:id — Student cancels a request
// router.delete('/:id', async (req, res) => {
//   try {
//     const classRequest = await ClassRequest.findByIdAndDelete(req.params.id);
//     if (!classRequest) {
//       return res.status(404).json({ message: 'Class request not found' });
//     }
//     res.status(200).json({ message: 'Class request cancelled successfully' });
//   } catch (err) {
//     console.error('Error deleting class request:', err);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// module.exports = router;

// ----------------------------------------------------------------------
const express      = require('express');
const router       = express.Router();
const ClassRequest = require('../models/ClassRequest');

// POST /api/class-requests — Student submits a class request
router.post('/', async (req, res) => {
  try {
    const {
      studentId, studentName, studentClass,
      teacherId, teacherName,
      subject, preferredDate, preferredTime, reason,
    } = req.body;

    if (!studentId || !teacherId || !subject || !preferredDate || !preferredTime) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const classRequest = new ClassRequest({
      studentId, studentName, studentClass,
      teacherId, teacherName,
      subject,
      preferredDate: new Date(preferredDate),
      preferredTime,
      reason: reason || '',
    });

    await classRequest.save();
    res.status(201).json({ message: 'Class request submitted successfully', classRequest });
  } catch (err) {
    console.error('Error creating class request:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/class-requests/student/:studentId — Student's own requests
router.get('/student/:studentId', async (req, res) => {
  try {
    const classRequests = await ClassRequest
      .find({ studentId: req.params.studentId })
      .sort({ createdAt: -1 });
    res.status(200).json({ classRequests: classRequests || [] });
  } catch (err) {
    console.error('Error fetching student class requests:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/class-requests/teacher/:teacherId — All requests for a teacher
router.get('/teacher/:teacherId', async (req, res) => {
  try {
    const classRequests = await ClassRequest
      .find({ teacherId: req.params.teacherId })
      .sort({ createdAt: -1 });
    res.status(200).json({ classRequests: classRequests || [] });
  } catch (err) {
    console.error('Error fetching teacher class requests:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/class-requests/:id/status — Teacher accepts or rejects (own requests only)
router.put('/:id/status', async (req, res) => {
  try {
    const { status, responseMessage, teacherId } = req.body;
    const validStatuses = ['Pending', 'Accepted', 'Rejected', 'Completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    if (!teacherId) {
      return res.status(400).json({ message: 'teacherId is required' });
    }

    // Look up the request first so we can verify it actually belongs to this teacher.
    const existingRequest = await ClassRequest.findById(req.params.id);
    if (!existingRequest) {
      return res.status(404).json({ message: 'Class request not found' });
    }
    if (String(existingRequest.teacherId) !== String(teacherId)) {
      return res.status(403).json({
        message: 'You are not authorized to respond to this class request',
      });
    }

    const classRequest = await ClassRequest.findByIdAndUpdate(
      req.params.id,
      { status, responseMessage: responseMessage || '' },
      { new: true }
    );
    res.status(200).json({ message: 'Status updated', classRequest });
  } catch (err) {
    console.error('Error updating status:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/class-requests/:id — Student cancels a request
router.delete('/:id', async (req, res) => {
  try {
    const classRequest = await ClassRequest.findByIdAndDelete(req.params.id);
    if (!classRequest) {
      return res.status(404).json({ message: 'Class request not found' });
    }
    res.status(200).json({ message: 'Class request cancelled successfully' });
  } catch (err) {
    console.error('Error deleting class request:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;