const express = require("express");

const {
  getLiveClasses,
  addLiveClass,
  removeLiveClass,
  updateLiveClass,
} = require("../socket/socketHandler");

const LiveClass = require("../models/LiveClass");

const router = express.Router();

router.use(express.json());


// =========================================================
// NORMALIZE CLASS
// =========================================================

const normalizeClass = (value) => {
  if (!value) {
    return "";
  }

  return value
    .toString()
    .replace(/^Class\s*/i, "")
    .trim()
    .toLowerCase();
};


// =========================================================
// GET DATE STRING IN YYYY-MM-DD FORMAT
// =========================================================

const getDateString = (dateValue) => {
  if (!dateValue) {
    return "";
  }

  // If it is already a string like 2026-08-24
  if (
    typeof dateValue === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
  ) {
    return dateValue;
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};


// =========================================================
// GET TODAY'S LOCAL DATE IN YYYY-MM-DD FORMAT
// =========================================================

const getTodayDateString = () => {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(
    today.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    today.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};


// =========================================================
// GET CLASS DATE AND TIME
// =========================================================

const getClassDateTime = (cls) => {
  if (
    !cls.scheduledDate ||
    !cls.scheduledTime
  ) {
    return null;
  }

  const datePart = getDateString(
    cls.scheduledDate
  );

  if (!datePart) {
    return null;
  }

  let timePart = cls.scheduledTime
    .toString()
    .trim();

  // Convert 10:30 to 10:30:00
  if (/^\d{1,2}:\d{2}$/.test(timePart)) {
    const [hours, minutes] =
      timePart.split(":");

    timePart =
      `${hours.padStart(2, "0")}:${minutes}:00`;
  }

  const classDateTime = new Date(
    `${datePart}T${timePart}`
  );

  if (
    Number.isNaN(
      classDateTime.getTime()
    )
  ) {
    return null;
  }

  return classDateTime;
};


// =========================================================
// CREATE SCHEDULED CLASS
// =========================================================

router.post("/schedule", async (req, res) => {
  try {
    const {
      className,
      subject,
      studentClass,
      date,
      time,
      platform,
      description,
      teacherId,
      teacherName,
      jitsiUrl,
      roomName,
    } = req.body;

    if (
      !className ||
      !subject ||
      !date ||
      !time ||
      !teacherId
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const { v4: uuidv4 } =
      require("uuid");

    const scheduled = new LiveClass({
      meetingId: uuidv4(),

      subject,

      teacher:
        teacherName || "Unknown Teacher",

      teacherId,

      class:
        studentClass || className,

      isLive: false,

      scheduledDate: date,

      scheduledTime: time,

      platform:
        platform || "Jitsi Meet",

      className,

      description:
        description || "",

      jitsiUrl:
        jitsiUrl || null,

      roomName:
        roomName || null,
    });

    await scheduled.save();

    const io = req.app.get("io");

    if (io) {
      io.emit("classScheduled", {
        success: true,
        scheduledClass: scheduled,
      });
    }

    return res.status(201).json({
      success: true,
      scheduledClass: scheduled,
    });

  } catch (error) {
    console.error(
      "Error scheduling class:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});


// =========================================================
// GET TODAY'S SCHEDULED CLASSES FOR A TEACHER
//
// Route:
// GET /api/live-classes/teacher/:teacherId/today
//
// Used by:
// TeacherDashboard.js -> Today's Classes section
//
// IMPORTANT:
// - Fetches only this teacher's classes
// - Fetches all classes scheduled for today
// - Does NOT hide a class just because its time passed
// =========================================================

// router.get(
//   "/teacher/:teacherId/today",
//   async (req, res) => {
//     try {
//       const { teacherId } =
//         req.params;

//       if (!teacherId) {
//         return res.status(400).json({
//           success: false,
//           message: "Teacher ID is required",
//         });
//       }

//       const today =
//         getTodayDateString();

//       const teacherClasses =
//         await LiveClass.find({
//           teacherId,
//         }).lean();

//       const todayClasses =
//         teacherClasses
//           .filter((liveClass) => {
//             const scheduledDate =
//               getDateString(
//                 liveClass.scheduledDate
//               );

//             return (
//               scheduledDate === today
//             );
//           })
//           .sort((a, b) => {
//             const timeA =
//               a.scheduledTime || "00:00";

//             const timeB =
//               b.scheduledTime || "00:00";

//             return timeA.localeCompare(
//               timeB
//             );
//           });

//       return res.json({
//         success: true,
//         today,
//         todayClasses,
//       });

//     } catch (error) {
//       console.error(
//         "Error fetching today's teacher classes:",
//         error
//       );

//       return res.status(500).json({
//         success: false,
//         message:
//           "Failed to fetch today's classes",
//         error: error.message,
//       });
//     }
//   }
// );

router.get(
  "/teacher/:teacherId/today",
  async (req, res) => {
    try {
      const { teacherId } = req.params;

      if (!teacherId) {
        return res.status(400).json({
          success: false,
          message: "Teacher ID is required",
        });
      }

      const today = getTodayDateString();

      const teacherClasses = await LiveClass.find({
        teacherId,
      }).lean();

      console.log("=================================");
      console.log("TODAY:", today);
      console.log("TEACHER ID:", teacherId);

      console.log(
        "ALL TEACHER CLASSES:",
        teacherClasses.map((liveClass) => ({
          id: liveClass._id,
          subject: liveClass.subject,
          class: liveClass.class,
          className: liveClass.className,
          scheduledDate: liveClass.scheduledDate,
          scheduledTime: liveClass.scheduledTime,
        }))
      );

      const todayClasses = teacherClasses
        .filter((liveClass) => {
          if (!liveClass.scheduledDate) {
            console.log(
              "Class skipped because scheduledDate is missing:",
              liveClass._id
            );

            return false;
          }

          let scheduledDate = "";

          const originalDate = String(
            liveClass.scheduledDate
          ).trim();

          // Already in YYYY-MM-DD format
          if (/^\d{4}-\d{2}-\d{2}$/.test(originalDate)) {
            scheduledDate = originalDate;
          }

          // Format: DD/MM/YYYY
          else if (/^\d{2}\/\d{2}\/\d{4}$/.test(originalDate)) {
            const [day, month, year] =
              originalDate.split("/");

            scheduledDate =
              `${year}-${month}-${day}`;
          }

          // Format: DD-MM-YYYY
          else if (/^\d{2}-\d{2}-\d{4}$/.test(originalDate)) {
            const [day, month, year] =
              originalDate.split("-");

            scheduledDate =
              `${year}-${month}-${day}`;
          }

          // Date object / ISO date
          else {
            const date = new Date(originalDate);

            if (!isNaN(date.getTime())) {
              const year = date.getFullYear();

              const month = String(
                date.getMonth() + 1
              ).padStart(2, "0");

              const day = String(
                date.getDate()
              ).padStart(2, "0");

              scheduledDate =
                `${year}-${month}-${day}`;
            }
          }

          console.log(
            "Checking class:",
            liveClass.subject
          );

          console.log(
            "Original scheduledDate:",
            liveClass.scheduledDate
          );

          console.log(
            "Converted scheduledDate:",
            scheduledDate
          );

          console.log(
            "Matches today:",
            scheduledDate === today
          );

          return scheduledDate === today;
        })
        .sort((a, b) => {
          const timeA =
            a.scheduledTime || "00:00";

          const timeB =
            b.scheduledTime || "00:00";

          return timeA.localeCompare(timeB);
        });

      console.log(
        "TODAY CLASSES FOUND:",
        todayClasses.length
      );

      console.log("TODAY CLASSES:", todayClasses);

      console.log("=================================");

      return res.json({
        success: true,
        today,
        todayClasses,
      });

    } catch (error) {
      console.error(
        "Error fetching today's teacher classes:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch today's classes",
        error: error.message,
      });
    }
  }
);


// =========================================================
// GET ALL SCHEDULED CLASSES FOR A TEACHER
//
// Route:
// GET /api/live-classes/teacher/:teacherId/scheduled
// =========================================================

router.get(
  "/teacher/:teacherId/scheduled",
  async (req, res) => {
    try {
      const { teacherId } =
        req.params;

      const classes =
        await LiveClass.find({
          teacherId,
        })
          .sort({
            scheduledDate: 1,
            scheduledTime: 1,
          })
          .lean();

      return res.json({
        success: true,
        scheduledClasses: classes,
      });

    } catch (error) {
      console.error(
        "Error fetching teacher scheduled classes:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch scheduled classes",
        error: error.message,
      });
    }
  }
);


// =========================================================
// GET UPCOMING SCHEDULED CLASSES
//
// Query parameters:
// ?teacherId=...
// ?studentClass=...
//
// IMPORTANT:
// - Only future classes
// - Can filter by teacher
// - Can filter by student's class
// - Past classes are hidden
// - Nearest class appears first
// =========================================================

router.get("/scheduled", async (req, res) => {
  try {
    const {
      teacherId,
      studentClass,
    } = req.query;

    const filter = {
      isLive: false,
    };

    if (teacherId) {
      filter.teacherId = teacherId;
    }

    const scheduledClasses =
      await LiveClass.find(filter).lean();

    const normalizedStudentClass =
      normalizeClass(studentClass);

    const now = new Date();

    const upcomingClasses =
      scheduledClasses
        .filter((cls) => {

          // ===============================================
          // FILTER BY STUDENT CLASS
          // ===============================================

          if (normalizedStudentClass) {
            const scheduledClass =
              normalizeClass(
                cls.class ||
                cls.studentClass ||
                cls.className
              );

            if (
              scheduledClass !==
              normalizedStudentClass
            ) {
              return false;
            }
          }

          // ===============================================
          // GET FULL DATE + TIME
          // ===============================================

          const classDateTime =
            getClassDateTime(cls);

          if (!classDateTime) {
            return false;
          }

          // ===============================================
          // ONLY FUTURE CLASSES
          // ===============================================

          return classDateTime > now;
        })

        // ===============================================
        // SORT NEAREST CLASS FIRST
        // ===============================================

        .sort((a, b) => {
          const dateA =
            getClassDateTime(a);

          const dateB =
            getClassDateTime(b);

          if (!dateA) {
            return 1;
          }

          if (!dateB) {
            return -1;
          }

          return (
            dateA.getTime() -
            dateB.getTime()
          );
        });

    return res.json({
      success: true,
      scheduledClasses:
        upcomingClasses,
    });

  } catch (error) {
    console.error(
      "Error fetching upcoming classes:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});


// =========================================================
// GET ALL CURRENTLY LIVE CLASSES
// =========================================================

router.get("/", (req, res) => {
  try {
    const liveClasses =
      getLiveClasses();

    return res.json({
      success: true,
      liveClasses,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});


// =========================================================
// START LIVE CLASS
// =========================================================

router.post("/start", (req, res) => {
  try {
    const {
      subject,
      teacher,
      teacherId,
      class: className,
      roomName,
      jitsiUrl,
      scheduledClassId,
    } = req.body;

    if (
      !subject ||
      !teacher ||
      !teacherId ||
      !className
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const liveClass = {
      id:
        req.body.id ||
        scheduledClassId ||
        Date.now().toString(),

      subject,

      teacher,

      teacherId,

      class: className,

      roomName:
        roomName || null,

      jitsiUrl:
        jitsiUrl || null,

      isLive: true,
    };

    addLiveClass(liveClass);

    const io = req.app.get("io");

    if (io) {
      io.emit(
        "liveClassesUpdate",
        getLiveClasses()
      );
    }

    return res.json({
      success: true,
      liveClass,
    });

  } catch (error) {
    console.error(
      "Error starting live class:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});


// =========================================================
// UPDATE LIVE CLASS
// =========================================================

router.put("/:classId", (req, res) => {
  try {
    const { classId } =
      req.params;

    updateLiveClass(
      classId,
      req.body
    );

    const io = req.app.get("io");

    if (io) {
      io.emit(
        "liveClassesUpdate",
        getLiveClasses()
      );
    }

    return res.json({
      success: true,
    });

  } catch (error) {
    console.error(
      "Error updating live class:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});


// =========================================================
// LEAVE LIVE CLASS
// =========================================================

router.post(
  "/leave/:classId",
  (req, res) => {
    try {
      const { classId } =
        req.params;

      const liveClass =
        getLiveClasses().find(
          (cls) =>
            cls.id === classId ||
            cls._id?.toString() ===
              classId
        );

      if (liveClass) {
        updateLiveClass(
          classId,
          {
            isLive: false,
          }
        );
      }

      const io = req.app.get("io");

      if (io) {
        io.emit(
          "liveClassesUpdate",
          getLiveClasses()
        );
      }

      return res.json({
        success: true,
        message:
          "Left successfully",
      });

    } catch (error) {
      console.error(
        "Error leaving live class:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  }
);


// =========================================================
// END LIVE CLASS
// =========================================================

router.delete(
  "/end/:classId",
  (req, res) => {
    try {
      const { classId } =
        req.params;

      removeLiveClass(classId);

      const io = req.app.get("io");

      if (io) {
        io.emit(
          "liveClassesUpdate",
          getLiveClasses()
        );
      }

      console.log(
        `Live class ${classId} ended`
      );

      return res.json({
        success: true,
      });

    } catch (error) {
      console.error(
        "Error ending live class:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  }
);


// =========================================================
// GET LIVE CLASSES FOR PARTICULAR CLASS
//
// Route:
// /api/live-classes/class/Class%209
// =========================================================

router.get(
  "/class/:className",
  (req, res) => {
    try {
      const { className } =
        req.params;

      const normalizedRequestedClass =
        normalizeClass(className);

      const liveClasses =
        getLiveClasses();

      const classLiveClasses =
        liveClasses.filter(
          (cls) =>
            cls.isLive &&
            normalizeClass(
              cls.class
            ) ===
              normalizedRequestedClass
        );

      return res.json({
        success: true,
        liveClasses:
          classLiveClasses,
      });

    } catch (error) {
      console.error(
        "Error fetching class live classes:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  }
);


// =========================================================
// GET CURRENTLY LIVE CLASSES BY TEACHER
//
// Route:
// /api/live-classes/teacher/:teacherId
//
// NOTE:
// This route is after more specific teacher routes
// such as:
// /teacher/:teacherId/today
// /teacher/:teacherId/scheduled
// =========================================================

router.get(
  "/teacher/:teacherId",
  (req, res) => {
    try {
      const { teacherId } =
        req.params;

      const liveClasses =
        getLiveClasses();

      const teacherClasses =
        liveClasses.filter(
          (cls) =>
            cls.teacherId?.toString() ===
              teacherId.toString() &&
            cls.isLive
        );

      return res.json({
        success: true,
        liveClasses:
          teacherClasses,
      });

    } catch (error) {
      console.error(
        "Error fetching teacher live classes:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  }
);


// =========================================================
// UPDATE SCHEDULED CLASS LINK
// =========================================================

router.patch(
  "/scheduled/:id/link",
  async (req, res) => {
    try {
      const {
        manualLink,
        jitsiUrl,
      } = req.body;

      const updateData = {};

      if (manualLink !== undefined) {
        updateData.manualLink =
          manualLink;
      }

      if (jitsiUrl !== undefined) {
        updateData.jitsiUrl =
          jitsiUrl;
      }

      const updated =
        await LiveClass.findByIdAndUpdate(
          req.params.id,
          updateData,
          {
            new: true,
            runValidators: true,
          }
        );

      if (!updated) {
        return res.status(404).json({
          success: false,
          message:
            "Scheduled class not found",
        });
      }

      return res.json({
        success: true,
        scheduledClass: updated,
      });

    } catch (error) {
      console.error(
        "Error updating scheduled class link:",
        error
      );

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);


// =========================================================
// DELETE SCHEDULED CLASS
// =========================================================

router.delete(
  "/scheduled/:id",
  async (req, res) => {
    try {
      const deleted =
        await LiveClass.findByIdAndDelete(
          req.params.id
        );

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message:
            "Scheduled class not found",
        });
      }

      return res.json({
        success: true,
        message:
          "Scheduled class deleted successfully",
      });

    } catch (error) {
      console.error(
        "Error deleting scheduled class:",
        error
      );

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);


module.exports = router;