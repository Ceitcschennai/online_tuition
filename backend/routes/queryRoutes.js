const express = require('express');
const router = express.Router();
const Query = require('../models/Query');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const upload = require('../middleware/upload');
const mongoose = require('mongoose');

// @route   POST /api/queries
router.post('/', upload.array('attachments', 5), async (req, res) => {
  try {
    const {
      studentId, studentName, studentClass,
      subject, question, priority = 'Medium',
      tags, isPublic = false
    } = req.body;

    if (!studentId || !studentName || !studentClass || !subject || !question) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const attachments = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      fileSize: file.size,
      mimetype: file.mimetype
    })) : [];

    const processedTags = tags
      ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim()))
      : [];

    const newQuery = new Query({
      studentId,
      studentName,
      studentClass,
      subject,
      question,
      priority,
      tags: processedTags,
      attachments,
      isPublic
    });

    await newQuery.save();
    res.status(201).json({ message: 'Query submitted successfully', query: newQuery });

  } catch (error) {
    console.error('Error creating query:', error);
    res.status(500).json({ message: 'Failed to submit query' });
  }
});

// @route   GET /api/queries
router.get('/', async (req, res) => {
  try {
    const {
      page = 1, limit = 10, status, subject,
      priority, studentId, teacherId, search,
      sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;

    let query = {};
    if (status && status !== 'All')   query.status   = status;
    if (subject && subject !== 'All') query.subject  = subject;
    if (priority && priority !== 'All') query.priority = priority;
    if (studentId) query.studentId = studentId;
    if (teacherId) query.teacherId = teacherId;

    if (search) {
      query.$or = [
        { studentName: { $regex: search, $options: 'i' } },
        { subject:     { $regex: search, $options: 'i' } },
        { question:    { $regex: search, $options: 'i' } },
        { reply:       { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const pageNum  = parseInt(page);
    const limitNum = parseInt(limit);
    const skip     = (pageNum - 1) * limitNum;
    const sortConfig = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const queries = await Query.find(query)
      .populate('studentId', 'firstName lastName email')
      .populate('teacherId', 'firstName lastName email')
      .sort(sortConfig)
      .skip(skip)
      .limit(limitNum);

    const total = await Query.countDocuments(query);
    const stats = {
      total:    await Query.countDocuments(),
      pending:  await Query.countDocuments({ status: 'Pending' }),
      answered: await Query.countDocuments({ status: 'Answered' }),
      resolved: await Query.countDocuments({ status: 'Resolved' })
    };

    res.json({
      queries,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalQueries: total,
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      },
      stats
    });

  } catch (error) {
    console.error('Error fetching queries:', error);
    res.status(500).json({ message: 'Failed to fetch queries' });
  }
});

// @route   GET /api/queries/stats  ← must be BEFORE /:id routes
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      total:    await Query.countDocuments(),
      pending:  await Query.countDocuments({ status: 'Pending' }),
      answered: await Query.countDocuments({ status: 'Answered' }),
      resolved: await Query.countDocuments({ status: 'Resolved' }),
      bySubject: await Query.aggregate([
        { $group: { _id: '$subject', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      byPriority: await Query.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),
      recent: await Query.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('studentName subject status createdAt')
    };
    res.json(stats);
  } catch (error) {
    console.error('Error fetching query stats:', error);
    res.status(500).json({ message: 'Failed to fetch query statistics' });
  }
});

// @route   GET /api/queries/teacher/:teacherId
router.get('/teacher/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { page = 1, limit = 10, status, subject } = req.query;

    let query = { teacherId };
    if (status && status !== 'All')   query.status  = status;
    if (subject && subject !== 'All') query.subject = subject;

    const pageNum  = parseInt(page);
    const limitNum = parseInt(limit);
    const skip     = (pageNum - 1) * limitNum;

    const queries = await Query.find(query)
      .populate('studentId', 'firstName lastName email class')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Query.countDocuments(query);
    const stats = {
      total:    await Query.countDocuments({ teacherId }),
      pending:  await Query.countDocuments({ teacherId, status: 'Pending' }),
      answered: await Query.countDocuments({ teacherId, status: 'Answered' }),
      resolved: await Query.countDocuments({ teacherId, status: 'Resolved' })
    };

    res.json({
      queries,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalQueries: total,
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      },
      stats
    });
  } catch (error) {
    console.error('Error fetching teacher queries:', error);
    res.status(500).json({ message: 'Failed to fetch teacher queries' });
  }
});

// @route   GET /api/queries/student/:studentId
router.get('/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { page = 1, limit = 50, status } = req.query;

    let query = { studentId };
    if (status && status !== 'All') query.status = status;

    const pageNum  = parseInt(page);
    const limitNum = parseInt(limit);
    const skip     = (pageNum - 1) * limitNum;

    const queries = await Query.find(query)
      .populate('teacherId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(); // returns plain objects with ALL fields including reply

    const total = await Query.countDocuments(query);

    res.json({
      queries,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalQueries: total,
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Error fetching student queries:', error);
    res.status(500).json({ message: 'Failed to fetch student queries' });
  }
});

// @route   PUT /api/queries/:id/reply
// ✅ FIXED: handles both string and ObjectId teacherId, saves teacherName too
router.put('/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;
    const { reply, teacherId, status = 'Answered' } = req.body;

    if (!reply || !reply.trim()) {
      return res.status(400).json({ message: 'Reply text is required' });
    }

    // ✅ Look up teacher name so student can see who replied
    let teacherName = null;
    if (teacherId) {
      try {
        const isObjectId = mongoose.Types.ObjectId.isValid(teacherId);
        if (isObjectId) {
          const teacher = await Teacher.findById(teacherId).select('firstName lastName salutation');
          if (teacher) {
            teacherName = `${teacher.salutation || ''} ${teacher.firstName} ${teacher.lastName}`.trim();
          }
        }
      } catch (e) {
        console.warn('Could not look up teacher name:', e.message);
      }
    }

    const updateData = {
      reply: reply.trim(),
      status,
      repliedAt: new Date(),
    };

    // ✅ Only set teacherId if it's a valid ObjectId — prevents cast errors
    if (teacherId && mongoose.Types.ObjectId.isValid(teacherId)) {
      updateData.teacherId = teacherId;
    }

    if (teacherName) {
      updateData.teacherName = teacherName;
    }

    const updatedQuery = await Query.findByIdAndUpdate(
      id,
      updateData,
      { new: true }   // ✅ returns updated document with reply saved
    ).lean();

    if (!updatedQuery) {
      return res.status(404).json({ message: 'Query not found' });
    }

    res.json({
      message: 'Reply submitted successfully',
      query: updatedQuery
    });

  } catch (error) {
    console.error('Error replying to query:', error);
    res.status(500).json({ message: 'Failed to submit reply' });
  }
});

// @route   PUT /api/queries/:id/status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Pending', 'Answered', 'Resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const query = await Query.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).lean();

    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    res.json({ message: 'Query status updated successfully', query });

  } catch (error) {
    console.error('Error updating query status:', error);
    res.status(500).json({ message: 'Failed to update query status' });
  }
});

// @route   PUT /api/queries/:id/assign
router.put('/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId } = req.body;

    if (!teacherId) {
      return res.status(400).json({ message: 'Teacher ID is required' });
    }

    const query = await Query.findByIdAndUpdate(
      id,
      { teacherId },
      { new: true }
    ).populate('studentId', 'firstName lastName email')
     .populate('teacherId', 'firstName lastName email');

    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    res.json({ message: 'Query assigned successfully', query });

  } catch (error) {
    console.error('Error assigning query:', error);
    res.status(500).json({ message: 'Failed to assign query' });
  }
});

// @route   PUT /api/queries/:id/views
router.put('/:id/views', async (req, res) => {
  try {
    const query = await Query.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!query) return res.status(404).json({ message: 'Query not found' });
    res.json({ message: 'Views updated', views: query.views });
  } catch (error) {
    console.error('Error updating views:', error);
    res.status(500).json({ message: 'Failed to update views' });
  }
});

// @route   DELETE /api/queries/:id
router.delete('/:id', async (req, res) => {
  try {
    const query = await Query.findByIdAndDelete(req.params.id);
    if (!query) return res.status(404).json({ message: 'Query not found' });
    res.json({ message: 'Query deleted successfully' });
  } catch (error) {
    console.error('Error deleting query:', error);
    res.status(500).json({ message: 'Failed to delete query' });
  }
});

module.exports = router;
