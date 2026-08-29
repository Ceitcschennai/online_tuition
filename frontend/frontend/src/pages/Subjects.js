import React from "react";
import "../styles/subjects.css";
import { useNavigate } from "react-router-dom";

import {
  FaBook,
  FaLaptopCode,
  FaCalculator,
  FaArrowRight,
  FaVideo
} from "react-icons/fa";

import { useLiveClass } from "../contexts/LiveClassContext";
import { joinJitsiMeeting } from "../utils/jitsiUtils";

// =====================================================
// SUBJECT IMAGES
// =====================================================

import English from "../assets/English.jpeg";
import Tamil from "../assets/Tamil.jpeg";
import Maths from "../assets/Maths.jpeg";
import Science from "../assets/Science.jpeg";
import Social from "../assets/Social.jpeg";
import Chemistry from "../assets/Chemistry.jpeg";
import Physics from "../assets/Physics.jpeg";
import Zoology from "../assets/Zoology.jpeg";
import Botany from "../assets/Botany.jpeg";
import Economics from "../assets/Economics.jpeg";
import ComputerScience from "../assets/ComputerScience.jpeg";
import Accounts from "../assets/Accounts.jpeg";

// =====================================================
// ALL SUBJECTS
// =====================================================

const subjects = [
  {
    key: "english",
    name: "English",
    image: English,
    icon: <FaBook />
  },
  {
    key: "tamil",
    name: "Tamil",
    image: Tamil,
    icon: <FaBook />
  },
  {
    key: "maths",
    name: "Maths",
    image: Maths,
    icon: <FaCalculator />
  },
  {
    key: "science",
    name: "Science",
    image: Science,
    icon: <FaBook />
  },
  {
    key: "social",
    name: "Social",
    image: Social,
    icon: <FaBook />
  },
  {
    key: "physics",
    name: "Physics",
    image: Physics,
    icon: <FaBook />
  },
  {
    key: "chemistry",
    name: "Chemistry",
    image: Chemistry,
    icon: <FaBook />
  },
  {
    key: "botany",
    name: "Botany",
    image: Botany,
    icon: <FaBook />
  },
  {
    key: "zoology",
    name: "Zoology",
    image: Zoology,
    icon: <FaBook />
  },
  {
    key: "accounts",
    name: "Accounts",
    image: Accounts,
    icon: <FaBook />
  },
  {
    key: "economics",
    name: "Economics",
    image: Economics,
    icon: <FaBook />
  },
  {
    key: "cs",
    name: "Computer Science",
    image: ComputerScience,
    icon: <FaLaptopCode />
  }
];

// =====================================================
// DEFAULT SUBJECTS FOR CLASS 1 - 10
// =====================================================

const DEFAULT_SUBJECTS = [
  "english",
  "tamil",
  "maths",
  "science",
  "social"
];

// =====================================================
// CLASS / GROUP SUBJECT MAP
// =====================================================

const classSubjectsMap = {
  "Class 1": DEFAULT_SUBJECTS,
  "Class 2": DEFAULT_SUBJECTS,
  "Class 3": DEFAULT_SUBJECTS,
  "Class 4": DEFAULT_SUBJECTS,
  "Class 5": DEFAULT_SUBJECTS,
  "Class 6": DEFAULT_SUBJECTS,
  "Class 7": DEFAULT_SUBJECTS,
  "Class 8": DEFAULT_SUBJECTS,
  "Class 9": DEFAULT_SUBJECTS,
  "Class 10": DEFAULT_SUBJECTS,

  "Class 11": {
    "Bio-Maths": [
      "english",
      "tamil",
      "maths",
      "physics",
      "chemistry",
      "botany",
      "zoology"
    ],

    "Computer Science": [
      "english",
      "tamil",
      "maths",
      "physics",
      "chemistry",
      "cs"
    ],

    "Commerce": [
      "english",
      "tamil",
      "accounts",
      "economics"
    ]
  },

  "Class 12": {
    "Bio-Maths": [
      "english",
      "tamil",
      "maths",
      "physics",
      "chemistry",
      "botany",
      "zoology"
    ],

    "Computer Science": [
      "english",
      "tamil",
      "maths",
      "physics",
      "chemistry",
      "cs"
    ],

    "Commerce": [
      "english",
      "tamil",
      "accounts",
      "economics"
    ]
  }
};

// =====================================================
// FIND GROUP
// =====================================================

const findGroup = (groupMap, groupValue) => {
  if (!groupValue) {
    return null;
  }

  const lower = groupValue
    .trim()
    .toLowerCase();

  const match = Object.keys(groupMap).find(
    key => key.toLowerCase() === lower
  );

  return match || null;
};

// =====================================================
// SUBJECTS COMPONENT
// =====================================================

const Subjects = () => {
  const navigate = useNavigate();

  const { liveClasses } = useLiveClass();

  // ===================================================
  // GET STUDENT FROM LOCAL STORAGE
  // ===================================================

  let student = {};

  try {
    const raw =
      localStorage.getItem("user") ||
      localStorage.getItem("student") ||
      "{}";

    student = JSON.parse(raw);

    // Handle nested structure:
    // { student: {...} }

    if (student.student) {
      student = student.student;
    }
  } catch (error) {
    console.error(
      "Error parsing student data:",
      error
    );
  }

  // ===================================================
  // NORMALIZE CLASS
  // ===================================================

  let studentClass = (
    student?.class ||
    student?.className ||
    ""
  )
    .toString()
    .trim();

  if (
    studentClass &&
    !studentClass
      .toLowerCase()
      .startsWith("class")
  ) {
    studentClass = `Class ${studentClass}`;
  }

  // ===================================================
  // NORMALIZE GROUP
  // ===================================================

  const studentGroup = (
    student?.group ||
    student?.stream ||
    student?.section ||
    ""
  )
    .toString()
    .trim();

  // ===================================================
  // FIND ALLOWED SUBJECTS
  // ===================================================

  let allowedSubjectKeys = [];

  if (!studentClass) {
    // If class is missing, show all subjects
    // so the page does not remain blank.

    allowedSubjectKeys = subjects.map(
      subject => subject.key
    );
  } else {
    const classEntry =
      classSubjectsMap[studentClass];

    if (!classEntry) {
      // Unknown class
      allowedSubjectKeys = DEFAULT_SUBJECTS;
    } else if (Array.isArray(classEntry)) {
      // Classes 1 - 10

      allowedSubjectKeys = classEntry;
    } else {
      // Classes 11 - 12

      const matchedGroup = findGroup(
        classEntry,
        studentGroup
      );

      if (matchedGroup) {
        allowedSubjectKeys =
          classEntry[matchedGroup];
      } else {
        // If group is missing or does not match,
        // show all group subjects as fallback.

        const allGroupSubjects =
          Object.values(classEntry).flat();

        allowedSubjectKeys = [
          ...new Set(allGroupSubjects)
        ];

        console.warn(
          `Group "${studentGroup}" not found for ${studentClass}. Showing all group subjects.`
        );
      }
    }
  }

  // ===================================================
  // FIND LIVE CLASS FOR SUBJECT
  // ===================================================

  const getLiveClassForSubject = subjectName => {
    return liveClasses.find(
      liveClass =>
        liveClass.subject === subjectName &&
        liveClass.class === studentClass &&
        liveClass.isLive
    );
  };

  // ===================================================
  // VISIBLE SUBJECTS
  // ===================================================

  const visibleSubjects = subjects.filter(
    subject =>
      allowedSubjectKeys.includes(subject.key)
  );

  // ===================================================
  // DEBUG LOGS
  // ===================================================

  console.log(
    "Student Class:",
    studentClass
  );

  console.log(
    "Student Group:",
    studentGroup || "(none)"
  );

  console.log(
    "Allowed Subjects:",
    allowedSubjectKeys
  );

  // ===================================================
  // UI
  // ===================================================

  return (
    <div className="student-subjects-wrapper">

      {/* =========================================
          PAGE HEADER
      ========================================= */}

      <div className="student-subjects-page-header">

        <div>
          <h2>My Subjects</h2>

          <p>
            Subjects available for your class
          </p>
        </div>

        <div className="student-class-badge">
          {studentClass || "Class"}
        </div>

      </div>

      {/* =========================================
          NO SUBJECTS
      ========================================= */}

      {visibleSubjects.length === 0 ? (

        <div className="student-subjects-empty">

          <FaBook />

          <h3>
            No subjects found
          </h3>

          <p>
            Please contact your administrator
            if this seems incorrect.
          </p>

          <small>
            Class:{" "}
            <strong>
              {studentClass || "Unknown"}
            </strong>

            {studentGroup
              ? `, Group: ${studentGroup}`
              : ""}
          </small>

        </div>

      ) : (

        /* =========================================
           SUBJECT GRID
        ========================================= */

        <div className="student-subjects-list">

          {visibleSubjects.map(subject => {

            const liveClass =
              getLiveClassForSubject(
                subject.name
              );

            const isLive = !!liveClass;

            return (

              <div
                key={subject.key}
                className={
                  `student-subjects-card-horizontal ${
                    isLive
                      ? "student-subjects-live-card-horizontal"
                      : ""
                  }`
                }
              >

                {/* =================================
                    SUBJECT IMAGE
                ================================= */}

                <div className="student-subjects-image-section">

                  <div className="student-subjects-image-container-horizontal">

                    <img
                      src={subject.image}
                      alt={subject.name}
                      className="student-subjects-image-horizontal"
                    />

                    {/* LIVE INDICATOR */}

                    {isLive && (
                      <div className="student-subjects-live-indicator-horizontal">

                        <span className="student-subjects-live-dot">
                          ●
                        </span>

                        LIVE

                      </div>
                    )}

                    {/* SUBJECT ICON */}

                    <div className="student-subjects-icon-overlay">

                      <span className="student-subjects-icon-horizontal">
                        {subject.icon}
                      </span>

                    </div>

                  </div>

                </div>

                {/* =================================
                    CARD CONTENT
                ================================= */}

                <div className="student-subjects-content-section">

                  {/* SUBJECT NAME */}

                  <h3 className="student-subjects-name-horizontal">
                    {subject.name}
                  </h3>

                  {/* =================================
                      BUTTON
                  ================================= */}

                  <div className="student-subjects-actions-horizontal">

                    {isLive ? (

                      <button
                        className="student-subjects-join-btn-horizontal"
                        onClick={() =>
                          joinJitsiMeeting(
                            liveClass.roomName,
                            student.firstName ||
                              "Student"
                          )
                        }
                      >

                        <FaVideo />

                        Join Live Class

                        <FaArrowRight />

                      </button>

                    ) : (

                      <button
                        className="student-subjects-details-btn-horizontal"
                        onClick={() =>
                          navigate(
                            `/subjects/${subject.name}`
                          )
                        }
                      >

                        View Details

                        <FaArrowRight />

                      </button>

                    )}

                  </div>

                </div>

              </div>
            );
          })}

        </div>
      )}

    </div>
  );
};

export default Subjects;