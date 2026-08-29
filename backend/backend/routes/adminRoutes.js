const express = require("express");
const router = express.Router();

const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const Subject = require("../models/Subject");
const Activity = require("../models/Activity");
const transporter = require("../config/email");

/* =====================================================
   CLASS NORMALIZER
   Maps messy raw class values ("10", "10th", "10TH", "Class 10")
   to one canonical bucket ("Class 10"). LKG and UKG are kept as
   their own buckets. Anything else that isn't a clean 1–12 value
   (negative numbers, garbage, etc.) falls into "Others".
===================================================== */
/* =====================================================
   CLASS NORMALIZER
   Only Class 5 through Class 12 get their own bucket.
   Everything else — LKG, UKG, Class 1-4, negative numbers,
   garbage — is grouped under "Others".
===================================================== */
const normalizeClass = (raw) => {
  if (!raw) return "Others";
  const str = String(raw).trim();

  // Reject negative numbers outright — e.g. "-10" is bad data, not Class 10
  if (/^-\s*\d/.test(str)) return "Others";

  const match = str.match(/(\d{1,2})/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num >= 5 && num <= 12) return `Class ${num}`;
  }
  return "Others";
};


const sendEmail = async (to, subject, text) => {
  try {
    await transporter.sendMail({
      from: `"Online Tuition" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });
    console.log("📧 Email sent to:", to);
  } catch (error) {
    console.error("❌ Email failed:", error.message);
  }
};

/* =====================================================
   DASHBOARD STATS
===================================================== */
router.get("/dashboard", async (req, res) => {
  try {
    const totalTeachers = await Teacher.countDocuments();
    const totalStudents = await Student.countDocuments();
    const totalSubjects = await Subject.countDocuments();

    const approvedTeachers = await Teacher.countDocuments({ isApproved: true });
    const pendingTeachers = await Teacher.countDocuments({
      isApproved: false,
      isRejected: false,
    });

    res.json({
      success: true,
      stats: {
        totalTeachers,
        totalStudents,
        totalSubjects,
        approvedTeachers,
        pendingTeachers,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ success: false, message: "Dashboard fetch failed" });
  }
});

/* =====================================================
   STUDENT STATS
===================================================== */
router.get("/students/stats", async (req, res) => {
  try {
    const total = await Student.countDocuments();
    const approved = await Student.countDocuments({ approvalStatus: "Approved" });
    const pending = await Student.countDocuments({ approvalStatus: "Pending" });
    const rejected = await Student.countDocuments({ approvalStatus: "Rejected" });
    const paid = await Student.countDocuments({ status: "Paid" });

    res.json({
      success: true,
      stats: { total, approved, pending, rejected, paid },
    });
  } catch (err) {
    console.error("Student stats error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
});

/* =====================================================
   DISTINCT CLASS LIST — powers the class-wise filter buttons.
   Normalizes messy raw values ("10th", "10TH", "Class 10") into
   canonical "Class 1".."Class 12" buckets, with everything else
   (LKG, UKG, negative numbers, garbage) grouped as "Others".
   Only returns buckets that actually have at least one student.
===================================================== */
router.get("/students/classes", async (req, res) => {
  try {
    const rawClasses = await Student.distinct("class");
    const present = new Set(rawClasses.map(normalizeClass));

    const ordered = [];
    for (let i = 5; i <= 12; i++) {
      const label = `Class ${i}`;
      if (present.has(label)) ordered.push(label);
    }
    if (present.has("Others")) ordered.push("Others");

    res.json({ success: true, classes: ordered });
  } catch (err) {
    console.error("Class list error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch class list" });
  }
});

/* =====================================================
   GET STUDENTS (SEARCH + FILTER)
===================================================== */
router.get("/students", async (req, res) => {
  try {
    const { search = "", filter = "all", studentClass = "all" } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { class: { $regex: search, $options: "i" } },
        { emisNumber: { $regex: search, $options: "i" } },
      ];
    }

    if (filter === "approved") query.approvalStatus = "Approved";
    if (filter === "pending") query.approvalStatus = "Pending";
    if (filter === "rejected") query.approvalStatus = "Rejected";
    if (filter === "paid") query.status = "Paid";
    if (filter === "unpaid") query.status = "Unpaid";

    let students = await Student.find(query).sort({ createdAt: -1 });

    // ✅ Class-wise filter — matches against the NORMALIZED bucket, since raw
    // class values are stored inconsistently ("10", "10th", "10TH", "Class 10"
    // all mean the same thing; a direct string match on the raw field would miss most of them).
    if (studentClass && studentClass !== "all") {
      students = students.filter((s) => normalizeClass(s.class) === studentClass);
    }

    res.json({ success: true, students });
  } catch (err) {
    console.error("Student fetch error:", err);
    res.status(500).json({ success: false, message: "Fetch failed" });
  }
});

// /* =====================================================
//    APPROVE / REJECT STUDENT
// ===================================================== */
// router.put("/students/:id/status", async (req, res) => {
//   try {
//     const { status } = req.body;

//     if (!["Approved", "Rejected"].includes(status)) {
//       return res.status(400).json({ success: false, message: "Invalid status" });
//     }

//     const student = await Student.findById(req.params.id);
//     if (!student) {
//       return res.status(404).json({ success: false, message: "Student not found" });
//     }

//     student.approvalStatus = status;
//     await student.save();

//     await sendEmail(
//       student.email,
//       `Admission ${status}`,
//       `Hello ${student.firstName},\n\nYour admission has been ${status}.`
//     );

//     await Activity.create({
//   type: "student",
//   message: `Student ${student.firstName} ${student.lastName} was ${status}`,
//   time: new Date(),
// });

//     res.json({ success: true, student });
//   } catch (err) {
//     console.error("Student status error:", err);
//     res.status(500).json({ success: false, message: "Update failed" });
//   }
// });

/* =================================================
   ADMIN — UPDATE STUDENT APPROVAL STATUS
================================================= */

router.put("/students/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["Approved", "Rejected", "Pending"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid approval status",
      });
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      {
        approvalStatus: status,
        isActive: status === "Approved",
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Activity log
    await Activity.create({
      type: "student",
      message: `Student ${student.firstName} ${student.lastName} was ${status}`,
      time: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: `Student ${status.toLowerCase()} successfully`,
      student,
    });
  } catch (err) {
    console.error("Student status update error:", err);

    return res.status(500).json({
      success: false,
      message: "Update failed",
      error: err.message,
    });
  }
});

/* =====================================================
   TOGGLE STUDENT PAYMENT
===================================================== */
router.put("/students/:id/payment", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    student.status = student.status === "Paid" ? "Unpaid" : "Paid";
    await student.save();

    res.json({ success: true, student });
  } catch (err) {
    console.error("Payment update error:", err);
    res.status(500).json({ success: false, message: "Payment update failed" });
  }
});

/* =====================================================
   GET TEACHERS (SEARCH + FILTER + STATS)
===================================================== */
router.get("/teachers", async (req, res) => {
  try {
    const { search = "", filter = "all" } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
      ];
    }

    if (filter === "approved") query.isApproved = true;
    if (filter === "rejected") query.isRejected = true;
    if (filter === "pending") {
      query.isApproved = false;
      query.isRejected = false;
    }

    const teachers = await Teacher.find(query)
  .select("-password")
  .populate("subjects", "name category classes")
  .sort({ createdAt: -1 });

    const total = await Teacher.countDocuments();
    const approved = await Teacher.countDocuments({ isApproved: true });
    const rejected = await Teacher.countDocuments({ isRejected: true });
    const pending = await Teacher.countDocuments({
      isApproved: false,
      isRejected: false,
    });

    const assigned = await Teacher.countDocuments({
      classAssigned: { $exists: true, $ne: null },
    });

    res.json({
      success: true,
      teachers,
      stats: { total, approved, pending, rejected, assigned },
    });
  } catch (error) {
    console.error("Teacher fetch error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch teachers" });
  }
});

/* =====================================================
   APPROVE / REJECT TEACHER
===================================================== */
router.put("/teachers/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    if (status === "Approved") {
      teacher.isApproved = true;
      teacher.isRejected = false;
    }

    if (status === "Rejected") {
      teacher.isApproved = false;
      teacher.isRejected = true;
    }

    await teacher.save();

    res.json({
      success: true,
      message: `Teacher ${status} successfully`,
      teacher,
    });
  } catch (error) {
    console.error("Teacher status error:", error);
    res.status(500).json({ success: false, message: "Update failed" });
  }
});

/* =====================================================
   UPDATE TEACHER'S ASSIGNED CLASSES
===================================================== */
/* =====================================================
   UPDATE TEACHER'S ASSIGNED CLASSES
   Also synchronizes classes to the teacher's subjects
===================================================== */

router.put(
  "/teachers/:id/classes",
  async (req, res) => {
    try {

      const {
        classes
      } = req.body;

      const teacherId =
        req.params.id;

      console.log(
        "=========================================="
      );

      console.log(
        "UPDATE TEACHER CLASSES"
      );

      console.log(
        "Teacher ID:",
        teacherId
      );

      console.log(
        "Classes:",
        classes
      );

      // -------------------------------------------------
      // VALIDATE
      // -------------------------------------------------

      if (
        !Array.isArray(classes) ||
        classes.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "At least one class must be selected",
        });
      }

      const validClasses = [
        "Class 5",
        "Class 6",
        "Class 7",
        "Class 8",
        "Class 9",
        "Class 10",
        "Class 11",
        "Class 12",
      ];

      const invalidClasses =
        classes.filter(
          (cls) =>
            !validClasses.includes(
              cls
            )
        );

      if (
        invalidClasses.length > 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid class selected",
          invalidClasses,
        });
      }

      // -------------------------------------------------
      // FIND TEACHER
      // -------------------------------------------------

      const teacher =
        await Teacher.findById(
          teacherId
        );

      if (!teacher) {
        return res.status(404).json({
          success: false,
          message:
            "Teacher not found",
        });
      }

      // -------------------------------------------------
      // UPDATE TEACHER CLASSES
      // -------------------------------------------------

      teacher.classesAssigned =
        classes;

      await teacher.save();

      // -------------------------------------------------
      // IMPORTANT:
      // SYNCHRONIZE CLASSES WITH ALL
      // SUBJECTS ASSIGNED TO THIS TEACHER
      // -------------------------------------------------

      await Subject.updateMany(
        {
          teacher:
            teacherId,
        },
        {
          $set: {
            classes:
              classes,
          },
        }
      );

      // -------------------------------------------------
      // GET UPDATED TEACHER
      // -------------------------------------------------

      const updatedTeacher =
        await Teacher.findById(
          teacherId
        )
          .select("-password")
          .populate(
            "subjects",
            "name category classes teacher"
          );

      console.log(
        "Updated teacher classes:",
        updatedTeacher.classesAssigned
      );

      console.log(
        "Updated teacher subjects:",
        updatedTeacher.subjects
      );

      console.log(
        "=========================================="
      );

      return res.json({
        success: true,

        message:
          "Teacher classes updated successfully",

        teacher:
          updatedTeacher,
      });

    } catch (error) {

      console.error(
        "CLASS UPDATE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to update teacher classes",

        error:
          error.message,
      });
    }
  }
);
/* =====================================================
   UPDATE TEACHER'S ASSIGNED CLASSES
   Lets admin retroactively set classesAssigned for teachers
   who registered before this field existed, or to adjust it
   later. Restricted to Class 5–12.
===================================================== */
/* =====================================================
   GET SUBJECTS FOR ADMIN TEACHER EDIT

   Ensures these subjects exist:
   Tamil, English, Maths, Science, Social,
   Botany, Zoology, Physics, Chemistry,
   Accounts, Economics
===================================================== */
/* =====================================================
   GET SUBJECTS FOR TEACHER ASSIGNMENT
   ===================================================== */


/* =====================================================
   GET SUBJECTS FOR TEACHER ASSIGNMENT
===================================================== */

router.get("/subjects-for-teacher", async (req, res) => {
  try {
    console.log("==========================================");
    console.log("GET /subjects-for-teacher");

    const SUBJECT_NAMES = [
      "Tamil",
      "English",
      "Maths",
      "Science",
      "Social",
      "Botany",
      "Zoology",
      "Physics",
      "Chemistry",
      "Accounts",
      "Economics",
      "Computer Science"
    ];

    /*
     * Make sure the standard subjects exist.
     * Existing subjects will NOT be overwritten.
     */

    for (const name of SUBJECT_NAMES) {
      const existingSubject = await Subject.findOne({
        name: {
          $regex: `^${name}$`,
          $options: "i"
        }
      });

      if (!existingSubject) {
        const newSubject = await Subject.create({
          name: name,
          category: "Regular",
          price: "Free",
          classes: [],
          teacher: null,
          isActive: true
        });

        console.log(
          "Created subject:",
          newSubject.name
        );
      }
    }

    /*
     * Fetch all active subjects.
     */

    const subjects = await Subject.find({
      isActive: true
    })
      .select(
        "_id name category classes teacher"
      )
      .sort({ name: 1 });

    console.log(
      "Subjects returned:",
      subjects.map((subject) => ({
        id: subject._id,
        name: subject.name,
        classes: subject.classes,
        teacher: subject.teacher
      }))
    );

    console.log("==========================================");

    return res.status(200).json({
      success: true,
      subjects
    });

  } catch (error) {

    console.error("==========================================");
    console.error(
      "SUBJECT FETCH ERROR:"
    );
    console.error(
      "Message:",
      error.message
    );
    console.error(
      "Stack:",
      error.stack
    );
    console.error("==========================================");

    return res.status(500).json({
      success: false,
      message: "Failed to fetch subjects",
      error: error.message
    });
  }
});

/* =====================================================
   UPDATE TEACHER'S SUBJECT
===================================================== */
/* =====================================================
   UPDATE TEACHER'S ASSIGNED SUBJECT
   ===================================================== */

router.put("/teachers/:id/subject", async (req, res) => {
  try {
    const { subjectName } = req.body;
    const teacherId = req.params.id;

    console.log("==========================================");
    console.log("UPDATE TEACHER SUBJECT");
    console.log("Teacher ID:", teacherId);
    console.log("Subject Name:", subjectName);

    if (!subjectName || !subjectName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Subject name is required",
      });
    }

    // -------------------------------------------------
    // FIND TEACHER
    // -------------------------------------------------

    const teacher =
      await Teacher.findById(teacherId);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    // -------------------------------------------------
    // GET TEACHER'S ASSIGNED CLASSES
    // -------------------------------------------------

    const teacherClasses =
      Array.isArray(
        teacher.classesAssigned
      )
        ? teacher.classesAssigned
        : [];

    console.log(
      "Teacher classes:",
      teacherClasses
    );

    // -------------------------------------------------
    // FIND SUBJECT
    // -------------------------------------------------

    let subject =
      await Subject.findOne({
        name: {
          $regex:
            `^${subjectName.trim()}$`,
          $options: "i",
        },
      });

    // -------------------------------------------------
    // CREATE SUBJECT IF IT DOESN'T EXIST
    // -------------------------------------------------

    if (!subject) {
      subject =
        await Subject.create({
          name:
            subjectName.trim(),

          category:
            "Regular",

          price:
            "Free",

          classes:
            teacherClasses,

          teacher:
            teacherId,

          isActive:
            true,
        });

    } else {

      // -------------------------------------------------
      // ASSIGN TEACHER
      // -------------------------------------------------

      subject.teacher =
        teacherId;

      // -------------------------------------------------
      // IMPORTANT:
      // COPY TEACHER'S ASSIGNED CLASSES
      // INTO SUBJECT
      // -------------------------------------------------

      subject.classes =
        teacherClasses;

      subject.isActive =
        true;

      await subject.save();
    }

    // -------------------------------------------------
    // REMOVE THIS TEACHER'S OLD SUBJECT REFERENCES
    // -------------------------------------------------

    teacher.subjects = [
      subject._id
    ];

    await teacher.save();

    // -------------------------------------------------
    // VERIFY DATA
    // -------------------------------------------------

    const updatedSubject =
      await Subject.findById(
        subject._id
      ).populate(
        "teacher",
        "firstName lastName email"
      );

    const updatedTeacher =
      await Teacher.findById(
        teacherId
      )
        .select("-password")
        .populate(
          "subjects",
          "name category classes teacher"
        );

    console.log(
      "Updated Subject:",
      {
        name:
          updatedSubject.name,

        classes:
          updatedSubject.classes,

        teacher:
          updatedSubject.teacher,
      }
    );

    console.log(
      "Updated Teacher:",
      {
        name:
          `${updatedTeacher.firstName} ${updatedTeacher.lastName}`,

        classes:
          updatedTeacher.classesAssigned,

        subjects:
          updatedTeacher.subjects,
      }
    );

    console.log("==========================================");

    return res.json({
      success: true,

      message:
        "Teacher subject updated successfully",

      teacher:
        updatedTeacher,

      subject:
        updatedSubject,
    });

  } catch (error) {

    console.error(
      "=========================================="
    );

    console.error(
      "SUBJECT UPDATE ERROR:",
      error
    );

    console.error(
      "=========================================="
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to update teacher subject",

      error:
        error.message,
    });
  }
});
/* =====================================================
   DELETE TEACHER
===================================================== */
router.delete("/teachers/:id", async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    res.json({ success: true, message: "Teacher deleted successfully" });
  } catch (error) {
    console.error("Delete teacher error:", error);
    res.status(500).json({ success: false, message: "Delete failed" });
  }
});

module.exports = router;