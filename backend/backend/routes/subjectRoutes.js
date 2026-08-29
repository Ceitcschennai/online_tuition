const express = require("express");
const router = express.Router();

const Subject = require("../models/Subject");
const Teacher = require("../models/Teacher");

/* =========================================================
   HELPER
   Normalize class values

   Examples:
   "9"       -> "9"
   "Class 9" -> "9"
   "class 9" -> "9"
========================================================= */

const normalizeClass = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value)
    .replace(/^class\s*/i, "")
    .trim();
};


/* =========================================================
   GET ALL SUBJECTS FOR ADMIN
   GET /api/subjects/admin/all
========================================================= */

router.get("/admin/all", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = ""
    } = req.query;

    const query = {};

    if (search.trim()) {
      query.name = {
        $regex: search.trim(),
        $options: "i"
      };
    }

    const totalSubjects = await Subject.countDocuments(query);

    const totalPages = Math.max(
      1,
      Math.ceil(totalSubjects / Number(limit))
    );

    const currentPage = Math.min(
      Number(page),
      totalPages
    );

    const subjects = await Subject.find(query)
      .populate(
        "teacher",
        "_id salutation firstName lastName email"
      )
      .sort({ createdAt: -1 })
      .skip(
        (currentPage - 1) * Number(limit)
      )
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      subjects,
      pagination: {
        totalSubjects,
        totalPages,
        currentPage
      }
    });

  } catch (error) {
    console.error(
      "ADMIN SUBJECT LIST ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch subjects",
      error: error.message
    });
  }
});


/* =========================================================
   GET SUBJECTS
   GET /api/subjects?class=9

   This is useful for students.
========================================================= */

router.get("/", async (req, res) => {
  try {
    const studentClass = normalizeClass(
      req.query.class
    );

    if (!studentClass) {
      return res.status(200).json({
        success: true,
        subjects: []
      });
    }

    const subjects = await Subject.find({
      isActive: true,
      $or: [
        {
          classes: studentClass
        },
        {
          classes: `Class ${studentClass}`
        }
      ]
    })
      .populate(
        "teacher",
        "_id salutation firstName lastName email"
      )
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      subjects
    });

  } catch (error) {
    console.error(
      "GET SUBJECTS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch subjects",
      error: error.message
    });
  }
});


/* =========================================================
   GET SUBJECT BY ID
   GET /api/subjects/id/:id
========================================================= */

router.get("/id/:id", async (req, res) => {
  try {
    const subject = await Subject.findById(
      req.params.id
    ).populate(
      "teacher",
      "_id salutation firstName lastName email"
    );

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found"
      });
    }

    return res.status(200).json({
      success: true,
      subject
    });

  } catch (error) {
    console.error(
      "GET SUBJECT BY ID ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});


/* =========================================================
   GET SUBJECT BY NAME

   IMPORTANT:
   Keep this AFTER /id/:id
========================================================= */

router.get("/:name", async (req, res) => {
  try {
    const subject = await Subject.findOne({
      name: {
        $regex: req.params.name,
        $options: "i"
      }
    }).populate(
      "teacher",
      "_id salutation firstName lastName email"
    );

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found"
      });
    }

    return res.status(200).json({
      success: true,
      subject: {
        _id: subject._id,
        name: subject.name,
        classes: subject.classes,
        category: subject.category,
        price: subject.price,
        teacher: subject.teacher
          ? {
              _id: subject.teacher._id,
              salutation: subject.teacher.salutation,
              firstName: subject.teacher.firstName,
              lastName: subject.teacher.lastName,
              email: subject.teacher.email
            }
          : null
      }
    });

  } catch (error) {
    console.error(
      "GET SUBJECT BY NAME ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});


/* =========================================================
   CREATE SUBJECT
   POST /api/subjects
========================================================= */

router.post("/", async (req, res) => {
  try {
    const {
      name,
      category,
      price,
      classes,
      teacher
    } = req.body;

    /* -------------------------
       VALIDATE NAME
    ------------------------- */

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Subject name is required"
      });
    }


    /* -------------------------
       CHECK DUPLICATE
    ------------------------- */

    const exists = await Subject.findOne({
      name: {
        $regex: `^${name.trim()}$`,
        $options: "i"
      }
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Subject already exists"
      });
    }


    /* -------------------------
       NORMALIZE CLASSES
    ------------------------- */

    let normalizedClasses = [];

    if (Array.isArray(classes)) {
      normalizedClasses = classes
        .map(normalizeClass)
        .filter(Boolean);
    } else if (classes) {
      const normalized = normalizeClass(classes);

      if (normalized) {
        normalizedClasses = [normalized];
      }
    }


    /* -------------------------
       CREATE SUBJECT
    ------------------------- */

    const subject = new Subject({
      name: name.trim(),

      category:
        category || "Regular",

      price:
        price || "Free",

      classes:
        normalizedClasses,

      teacher:
        teacher || null,

      isActive: true
    });

    await subject.save();


    /* -------------------------
       UPDATE TEACHER
    ------------------------- */

    if (teacher) {
      await Teacher.findByIdAndUpdate(
        teacher,
        {
          $addToSet: {
            subjects: subject._id
          }
        }
      );
    }


    /* -------------------------
       RETURN CREATED SUBJECT
    ------------------------- */

    const populatedSubject =
      await Subject.findById(subject._id)
        .populate(
          "teacher",
          "_id salutation firstName lastName email"
        );

    return res.status(201).json({
      success: true,
      message: "Subject created successfully",
      subject: populatedSubject
    });

  } catch (error) {
    console.error(
      "CREATE SUBJECT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create subject",
      error: error.message
    });
  }
});


/* =========================================================
   UPDATE SUBJECT
   PUT /api/subjects/:id
========================================================= */

router.put("/:id", async (req, res) => {
  try {
    const existing =
      await Subject.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Subject not found"
      });
    }


    /* -------------------------
       OLD TEACHER
    ------------------------- */

    const oldTeacherId =
      existing.teacher
        ? existing.teacher.toString()
        : null;


    /* -------------------------
       NEW TEACHER
    ------------------------- */

    const newTeacherId =
      req.body.teacher || null;


    /* -------------------------
       PREPARE UPDATE
    ------------------------- */

    const updateData = {};

    if (req.body.name !== undefined) {
      updateData.name =
        String(req.body.name).trim();
    }

    if (req.body.category !== undefined) {
      updateData.category =
        req.body.category;
    }

    if (req.body.price !== undefined) {
      updateData.price =
        req.body.price;
    }

    if (req.body.classes !== undefined) {

      if (Array.isArray(req.body.classes)) {

        updateData.classes =
          req.body.classes
            .map(normalizeClass)
            .filter(Boolean);

      } else {

        const normalized =
          normalizeClass(
            req.body.classes
          );

        updateData.classes =
          normalized
            ? [normalized]
            : [];
      }
    }

    updateData.teacher =
      newTeacherId;


    /* -------------------------
       UPDATE SUBJECT
    ------------------------- */

    const updated =
      await Subject.findByIdAndUpdate(
        req.params.id,
        updateData,
        {
          new: true,
          runValidators: true
        }
      ).populate(
        "teacher",
        "_id salutation firstName lastName email"
      );


    /* -------------------------
       REMOVE FROM OLD TEACHER
    ------------------------- */

    if (
      oldTeacherId &&
      oldTeacherId !== newTeacherId
    ) {
      await Teacher.findByIdAndUpdate(
        oldTeacherId,
        {
          $pull: {
            subjects: updated._id
          }
        }
      );
    }


    /* -------------------------
       ADD TO NEW TEACHER
    ------------------------- */

    if (
      newTeacherId &&
      oldTeacherId !== newTeacherId
    ) {
      await Teacher.findByIdAndUpdate(
        newTeacherId,
        {
          $addToSet: {
            subjects: updated._id
          }
        }
      );
    }


    return res.status(200).json({
      success: true,
      message: "Subject updated successfully",
      subject: updated
    });

  } catch (error) {
    console.error(
      "UPDATE SUBJECT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update subject",
      error: error.message
    });
  }
});


/* =========================================================
   DELETE SUBJECT
   DELETE /api/subjects/:id
========================================================= */

router.delete("/:id", async (req, res) => {
  try {

    const subject =
      await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found"
      });
    }


    /* -------------------------
       REMOVE SUBJECT FROM TEACHER
    ------------------------- */

    if (subject.teacher) {
      await Teacher.findByIdAndUpdate(
        subject.teacher,
        {
          $pull: {
            subjects: subject._id
          }
        }
      );
    }


    /* -------------------------
       DELETE SUBJECT
    ------------------------- */

    await Subject.findByIdAndDelete(
      req.params.id
    );


    return res.status(200).json({
      success: true,
      message: "Subject deleted successfully"
    });

  } catch (error) {
    console.error(
      "DELETE SUBJECT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete subject",
      error: error.message
    });
  }
});


/* =========================================================
   EXPORT
========================================================= */

module.exports = router;