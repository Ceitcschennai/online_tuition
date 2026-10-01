import React, { useCallback, useEffect, useMemo, useState } from "react";
import API_BASE_URL from "../config/api";
import "../styles/studentDashboard.css";

import {
  FaBookOpen,
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronRight,
  FaClock,
  FaCopy,
  FaExternalLinkAlt,
  FaGraduationCap,
  FaTasks,
  FaUserGraduate,
  FaVideo,
} from "react-icons/fa";

import { useLiveClass } from "../contexts/LiveClassContext";
import { markStudentJoin } from "../service/AttendanceService";

const DEFAULT_STATS = {
  enrolledSubjects: 0,
  pendingAssignments: 0,
  completedAssignments: 0,
  attendance: 0,
  lastPayment: "Pending",
};

const cleanClass = (value) =>
  String(value || "")
    .replace(/^Class\s*/i, "")
    .trim();

const getId = (item) => item?.id || item?._id;

const getStudentFromStorage = () => {
  try {
    const raw = localStorage.getItem("user");

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    return parsed?.student || parsed || null;
  } catch (error) {
    console.error(
      "Unable to read student from localStorage:",
      error
    );

    return null;
  }
};

const getClassLink = (classItem) =>
  classItem?.jitsiUrl ||
  (classItem?.roomName
    ? `https://meet.jit.si/${classItem.roomName}`
    : null) ||
  classItem?.manualLink ||
  classItem?.meetingLink ||
  classItem?.link ||
  null;

const formatDate = (value) => {
  if (!value) {
    return "Date not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const StudentDashboard = ({ student: propStudent }) => {
  const [student, setStudent] = useState(
    propStudent || getStudentFromStorage()
  );

  const [stats, setStats] = useState(DEFAULT_STATS);

  const [subjects, setSubjects] = useState([]);

  const [scheduledClasses, setScheduledClasses] =
    useState([]);

  const [loading, setLoading] = useState(true);

  const [pageError, setPageError] = useState("");

  const [activationLoading, setActivationLoading] =
    useState(false);

  const [copiedId, setCopiedId] = useState("");

  const [assignmentLoading, setAssignmentLoading] =
    useState(false);

  const { liveClasses = [] } = useLiveClass();

  const studentId = getId(student);

  const studentClass = cleanClass(student?.class);

  // =========================================================
  // SAVE STUDENT
  // =========================================================

  const saveStudent = useCallback((nextStudent) => {
    setStudent(nextStudent);

    try {
      localStorage.setItem(
        "user",
        JSON.stringify(nextStudent)
      );

      window.dispatchEvent(
        new Event("userUpdated")
      );
    } catch (error) {
      console.error(
        "Unable to save student locally:",
        error
      );
    }
  }, []);

  // =========================================================
  // FETCH MAIN DASHBOARD
  // =========================================================

  const fetchDashboard = useCallback(async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    setPageError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/student/${studentId}/dashboard`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to load student dashboard."
        );
      }

      if (data.student) {
        saveStudent({
          ...(student || {}),
          ...data.student,
        });
      }

      setStats((current) => ({
        ...current,
        ...DEFAULT_STATS,
        ...(data.stats || {}),
      }));

      setSubjects(
        Array.isArray(data.enrolledSubjectsList)
          ? data.enrolledSubjectsList
          : []
      );
    } catch (error) {
      console.error(
        "Student dashboard error:",
        error
      );

      setPageError(
        error.message ||
          "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  }, [
    studentId,
    saveStudent,
    student,
  ]);

  // =========================================================
  // FETCH ASSIGNMENTS
  // =========================================================

  const fetchAssignments = useCallback(async () => {
    if (!studentId) {
      return;
    }

    setAssignmentLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/assignments/student/${studentId}?class=${encodeURIComponent(
          studentClass
        )}`
      );

      if (!response.ok) {
        throw new Error(
          `Assignments request failed: ${response.status}`
        );
      }

      const data = await response.json();

      const assignments = Array.isArray(
        data.assignments
      )
        ? data.assignments
        : [];

      setStats((current) => ({
        ...current,

        pendingAssignments:
          assignments.filter(
            (assignment) =>
              !assignment.hasSubmitted
          ).length,

        completedAssignments:
          assignments.filter(
            (assignment) =>
              assignment.hasSubmitted
          ).length,
      }));
    } catch (error) {
      console.error(
        "Assignments error:",
        error
      );
    } finally {
      setAssignmentLoading(false);
    }
  }, [
    studentId,
    studentClass,
  ]);

  // =========================================================
  // FETCH SCHEDULED CLASSES
  // =========================================================

  const fetchScheduledClasses =
    useCallback(async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/live-classes/scheduled`
        );

        if (!response.ok) {
          throw new Error(
            `Scheduled classes request failed: ${response.status}`
          );
        }

        const data = await response.json();

        setScheduledClasses(
          Array.isArray(
            data.scheduledClasses
          )
            ? data.scheduledClasses
            : []
        );
      } catch (error) {
        console.error(
          "Scheduled classes error:",
          error
        );

        setScheduledClasses([]);
      }
    }, []);

  // =========================================================
  // LOAD STUDENT
  // =========================================================

  useEffect(() => {
    if (!student) {
      const stored =
        getStudentFromStorage();

      if (stored) {
        setStudent(stored);
      } else {
        setLoading(false);
      }
    }
  }, [student]);

  // =========================================================
  // LOAD DASHBOARD
  // =========================================================

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // =========================================================
  // LOAD ASSIGNMENTS + CLASSES
  // =========================================================

  useEffect(() => {
    fetchAssignments();
    fetchScheduledClasses();
  }, [
    fetchAssignments,
    fetchScheduledClasses,
  ]);

  // =========================================================
  // LIVE CLASSES
  // =========================================================

  const relevantLiveClasses = useMemo(() => {
    return liveClasses.filter(
      (classItem) => {
        if (!classItem?.isLive) {
          return false;
        }

        const classMatch =
          studentClass &&
          cleanClass(
            classItem.class
          ) === studentClass;

        const subjectMatch =
          classItem.subject &&
          subjects.some(
            (subject) =>
              String(subject).toLowerCase() ===
              String(
                classItem.subject
              ).toLowerCase()
          );

        return (
          classMatch ||
          subjectMatch
        );
      }
    );
  }, [
    liveClasses,
    studentClass,
    subjects,
  ]);

  // =========================================================
  // UPCOMING CLASSES
  // =========================================================

  const relevantScheduledClasses =
    useMemo(() => {
      return scheduledClasses
        .filter((classItem) => {
          const classMatch =
            studentClass &&
            cleanClass(
              classItem.class
            ) === studentClass;

          const subjectMatch =
            classItem.subject &&
            subjects.some(
              (subject) =>
                String(
                  subject
                ).toLowerCase() ===
                String(
                  classItem.subject
                ).toLowerCase()
            );

          return (
            classMatch ||
            subjectMatch
          );
        })
        .slice(0, 6);
    }, [
      scheduledClasses,
      studentClass,
      subjects,
    ]);

  // =========================================================
  // COPY CLASS LINK
  // =========================================================

  const handleCopy = async (
    classItem
  ) => {
    const link =
      getClassLink(classItem);

    const id = getId(classItem);

    if (!link || !id) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        link
      );

      setCopiedId(String(id));

      window.setTimeout(() => {
        setCopiedId("");
      }, 1800);
    } catch (error) {
      console.error(
        "Copy failed:",
        error
      );
    }
  };

  // =========================================================
  // JOIN CLASS
  // =========================================================

  const handleJoin = (classItem) => {
    const link =
      getClassLink(classItem);

    if (!link) {
      return;
    }

    try {
      markStudentJoin(
        classItem,
        student
      );
    } catch (error) {
      console.error(
        "Attendance join tracking failed:",
        error
      );
    }

    window.open(
      link,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // =========================================================
  // REQUEST ACTIVATION
  // =========================================================

  const handleActivationRequest =
    async () => {
      if (
        !studentId ||
        activationLoading
      ) {
        return;
      }

      setActivationLoading(true);

      try {
        const response =
          await fetch(
            `${API_BASE_URL}/api/student/request-activation/${studentId}`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Unable to submit activation request."
          );
        }

        saveStudent({
          ...student,
          isActive: false,
          activationRequested: true,
        });
      } catch (error) {
        console.error(
          "Activation request error:",
          error
        );

        window.alert(
          error.message ||
            "Unable to submit activation request."
        );
      } finally {
        setActivationLoading(false);
      }
    };

  // =========================================================
  // NO STUDENT
  // =========================================================

  if (!student) {
    return (
      <div className="student-dashboard-page">
        <div className="student-empty-state">
          <FaUserGraduate />

          <h2>
            Student information not found
          </h2>

          <p>
            Please log in again to
            continue.
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // ACCOUNT STATUS
  // =========================================================

  const isApproved =
    student.approvalStatus ===
    "Approved";

  const isActive =
    student.isActive !== false;

    /* =========================================================
   WAITING FOR ADMIN APPROVAL
========================================================= */

if (!isApproved) {
  return (
    <div className="student-dashboard-page">

      <div className="student-deactivated-card">

        <div className="student-deactivated-icon">
          ⏳
        </div>

        <span className="student-eyebrow">
          ACCOUNT REVIEW
        </span>

        <h1>
          Waiting for Admin Approval
        </h1>

        <p>
          Your account has been registered successfully.
        </p>

        <p>
          Please wait while the administrator reviews
          and approves your account.
        </p>

        <div className="student-pending-box">

          <FaClock />

          <div>
            <strong>
              Approval Pending
            </strong>

            <span>
              Your account is currently under review.
            </span>
          </div>

        </div>

        <div className="student-approval-note">
          You can access your main dashboard only while
          your account is waiting for approval.
        </div>

      </div>

    </div>
  );
}

  // =========================================================
  // DEACTIVATED ACCOUNT
  // =========================================================

  if (
    isApproved &&
    !isActive
  ) {
    return (
      <div className="student-dashboard-page">
        <div className="student-deactivated-card">
          <div className="student-deactivated-icon">
            🔒
          </div>

          <span className="student-eyebrow">
            ACCOUNT ACCESS
          </span>

          <h1>
            Your account is currently
            inactive
          </h1>

          <p>
            Your profile is approved,
            but your account has been
            deactivated by the
            administrator. Request
            activation to restore
            access.
          </p>

          {student.activationRequested ? (
            <div className="student-pending-box">
              <FaClock />

              <div>
                <strong>
                  Activation request
                  pending
                </strong>

                <span>
                  Your request has been
                  sent to the
                  administrator.
                </span>
              </div>
            </div>
          ) : (
            <button
              className="student-primary-btn"
              type="button"
              onClick={
                handleActivationRequest
              }
              disabled={
                activationLoading
              }
            >
              {activationLoading
                ? "Sending request..."
                : "Request Activation"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading && !student) {
    return (
      <div className="student-dashboard-page">
        <div className="student-loading-card">
          Loading dashboard...
        </div>
      </div>
    );
  }

  // =========================================================
  // STUDENT DETAILS
  // =========================================================

  const fullName =
    `${student.firstName || ""} ${
      student.lastName || ""
    }`.trim() || "Student";

  const initials =
    `${student.firstName?.[0] || ""}${
      student.lastName?.[0] || ""
    }`.toUpperCase() || "S";

  const attendance = Number(
    stats.attendance || 0
  );

  const paymentPaid =
    String(
      stats.lastPayment || ""
    ).toLowerCase() === "paid" ||
    String(
      student.status || ""
    ).toLowerCase() === "paid";

  // =========================================================
  // MAIN DASHBOARD
  // =========================================================

  return (
    <div className="student-dashboard-page">
      <div className="student-dashboard-container">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <header className="student-dashboard-header">
          <div className="student-header-main">

            <div className="student-avatar">
              {initials}
            </div>

            <div>
              <span className="student-eyebrow">
                STUDENT DASHBOARD
              </span>

              <h1>
                Welcome, {fullName} 👋
              </h1>

              <p>
                Class{" "}
                {student.class ||
                  "N/A"}

                {student.syllabus
                  ? ` • ${student.syllabus}`
                  : ""}
              </p>
            </div>

          </div>

          <div className="student-account-status">

            <span className="student-status-dot" />

            <div>
              <small>
                Account
              </small>

              <strong>
                {isApproved
                  ? "Active"
                  : student.approvalStatus ||
                    "Pending"}
              </strong>
            </div>

          </div>
        </header>

        {/* =====================================================
            ERROR
        ===================================================== */}

        {pageError && (
          <div className="student-alert student-alert-error">
            {pageError}
          </div>
        )}

        {/* =====================================================
            STUDENT INFO
        ===================================================== */}

        <section className="student-info-strip">

          <div>
            <span>
              Email
            </span>

            <strong>
              {student.email ||
                "Not available"}
            </strong>
          </div>

          <div>
            <span>
              Class
            </span>

            <strong>
              {student.class ||
                "Not available"}
            </strong>
          </div>

          <div>
            <span>
              Syllabus
            </span>

            <strong>
              {student.syllabus ||
                "Not available"}
            </strong>
          </div>

          <div>
            <span>
              Payment
            </span>

            <strong
              className={
                paymentPaid
                  ? "is-paid"
                  : "is-pending"
              }
            >
              {paymentPaid
                ? "Paid"
                : "Pending"}
            </strong>
          </div>

        </section>

        {/* =====================================================
            STATISTICS
        ===================================================== */}

        <section className="student-stat-grid">

          <article className="student-stat-card">

            <div className="student-stat-icon blue">
              <FaBookOpen />
            </div>

            <div>
              <span>
                Subjects
              </span>

              <strong>
                {stats.enrolledSubjects}
              </strong>

              <small>
                Available for your
                class
              </small>
            </div>

          </article>

          <article
            className="student-stat-card clickable"
            onClick={() =>
              (window.location.href =
                "/assignments")
            }
            role="button"
            tabIndex={0}
          >

            <div className="student-stat-icon orange">
              <FaTasks />
            </div>

            <div>
              <span>
                Pending Assignments
              </span>

              <strong>
                {assignmentLoading
                  ? "..."
                  : stats.pendingAssignments}
              </strong>

              <small>
                Need your attention
              </small>
            </div>

            <FaChevronRight className="student-stat-arrow" />

          </article>

          <article className="student-stat-card">

            <div className="student-stat-icon green">
              <FaCheckCircle />
            </div>

            <div>
              <span>
                Completed
              </span>

              <strong>
                {stats.completedAssignments}
              </strong>

              <small>
                Submitted assignments
              </small>
            </div>

          </article>

          <article className="student-stat-card">

            <div className="student-stat-icon purple">

              <div className="student-attendance-mini">
                {attendance}%
              </div>

            </div>

            <div>
              <span>
                Attendance
              </span>

              <strong>
                {attendance}%
              </strong>

              <small>
                Overall attendance
              </small>
            </div>

          </article>

        </section>

        {/* =====================================================
            CONTENT
        ===================================================== */}

        <section className="student-content-grid">

          {/* ===================================================
              MAIN COLUMN
          =================================================== */}

          <div className="student-main-column">

            {/* =================================================
                LIVE CLASSES
            ================================================= */}

            <section className="student-panel">

              <div className="student-panel-header">

                <div>
                  <span className="student-section-label">
                    LIVE NOW
                  </span>

                  <h2>
                    <span className="student-live-dot" />
                    Live Classes
                  </h2>
                </div>

                <span className="student-count-badge">
                  {relevantLiveClasses.length}
                </span>

              </div>

              {relevantLiveClasses.length ===
              0 ? (
                <div className="student-empty-panel">

                  <FaVideo />

                  <strong>
                    No live classes
                    right now
                  </strong>

                  <span>
                    Your teacher's
                    live class will
                    appear here.
                  </span>

                </div>
              ) : (
                <div className="student-class-grid">

                  {relevantLiveClasses.map(
                    (classItem) => {
                      const id =
                        getId(
                          classItem
                        );

                      const link =
                        getClassLink(
                          classItem
                        );

                      return (
                        <article
                          className="student-live-card"
                          key={id}
                        >

                          <div className="student-class-top">

                            <span className="student-live-badge">
                              ● LIVE
                            </span>

                            <span>
                              {classItem.class ||
                                `Class ${studentClass}`}
                            </span>

                          </div>

                          <h3>
                            {classItem.subject ||
                              "Live Class"}
                          </h3>

                          <p className="student-teacher-name">
                            {classItem.teacher ||
                              classItem.teacherName ||
                              "Faculty"}
                          </p>

                          <div className="student-class-link">
                            {link ||
                              "Meeting link not available"}
                          </div>

                          <div className="student-class-actions">

                            <button
                              type="button"
                              className="student-join-btn"
                              onClick={() =>
                                handleJoin(
                                  classItem
                                )
                              }
                              disabled={!link}
                            >
                              <FaExternalLinkAlt />
                              Join Class
                            </button>

                            <button
                              type="button"
                              className="student-copy-btn"
                              onClick={() =>
                                handleCopy(
                                  classItem
                                )
                              }
                              disabled={!link}
                              title="Copy class link"
                            >
                              {copiedId ===
                              String(id) ? (
                                <FaCheckCircle />
                              ) : (
                                <FaCopy />
                              )}
                            </button>

                          </div>

                        </article>
                      );
                    }
                  )}

                </div>
              )}

            </section>

            {/* =================================================
                UPCOMING CLASSES
            ================================================= */}

            <section className="student-panel">

              <div className="student-panel-header">

                <div>
                  <span className="student-section-label">
                    SCHEDULE
                  </span>

                  <h2>
                    <FaCalendarAlt />
                    Upcoming Classes
                  </h2>
                </div>

              </div>

              {relevantScheduledClasses.length ===
              0 ? (
                <div className="student-empty-panel">

                  <FaCalendarAlt />

                  <strong>
                    No upcoming classes
                  </strong>

                  <span>
                    Scheduled classes
                    for your class
                    will appear here.
                  </span>

                </div>
              ) : (
                <div className="student-upcoming-list">

                  {relevantScheduledClasses.map(
                    (classItem) => {
                      const id =
                        getId(
                          classItem
                        );

                      const link =
                        getClassLink(
                          classItem
                        );

                      return (
                        <article
                          className="student-upcoming-card"
                          key={id}
                        >

                          <div className="student-date-box">

                            <FaCalendarAlt />

                            <strong>
                              {formatDate(
                                classItem.date ||
                                  classItem.scheduledDate ||
                                  classItem.startTime
                              )}
                            </strong>

                          </div>

                          <div className="student-upcoming-info">

                            <div className="student-upcoming-title-row">

                              <h3>
                                {classItem.subject ||
                                  classItem.className ||
                                  "Upcoming Class"}
                              </h3>

                              <span>
                                {classItem.class ||
                                  `Class ${studentClass}`}
                              </span>

                            </div>

                            <p>
                              <FaUserGraduate />

                              {classItem.teacher ||
                                classItem.teacherName ||
                                "Faculty"}
                            </p>

                            <p>
                              <FaClock />

                              {classItem.time ||
                                classItem.scheduledTime ||
                                "Time not specified"}
                            </p>

                          </div>

                          <div className="student-upcoming-actions">

                            {link ? (
                              <>
                                <button
                                  type="button"
                                  className="student-outline-btn"
                                  onClick={() =>
                                    handleCopy(
                                      classItem
                                    )
                                  }
                                >
                                  {copiedId ===
                                  String(id) ? (
                                    <FaCheckCircle />
                                  ) : (
                                    <FaCopy />
                                  )}
                                </button>

                                <button
                                  type="button"
                                  className="student-join-btn compact"
                                  onClick={() =>
                                    handleJoin(
                                      classItem
                                    )
                                  }
                                >
                                  Open
                                  <FaExternalLinkAlt />
                                </button>
                              </>
                            ) : (
                              <span className="student-link-pending">
                                Link will be shared
                              </span>
                            )}

                          </div>

                        </article>
                      );
                    }
                  )}

                </div>
              )}

            </section>

          </div>

          {/* ===================================================
              SIDE COLUMN
          =================================================== */}

          <aside className="student-side-column">

            {/* =================================================
                ATTENDANCE
            ================================================= */}

            <section className="student-panel">

              <div className="student-panel-header">

                <div>
                  <span className="student-section-label">
                    PROGRESS
                  </span>

                  <h2>
                    Attendance
                  </h2>
                </div>

              </div>

              <div className="student-progress-wrap">

                <div
                  className="student-progress-circle"
                  style={{
                    "--progress":
                      `${attendance}%`,
                  }}
                >

                  <div>
                    <strong>
                      {attendance}%
                    </strong>

                    <span>
                      Attendance
                    </span>
                  </div>

                </div>

                <p>
                  {attendance >= 75
                    ? "Your attendance is on track."
                    : "Try to attend more scheduled classes."}
                </p>

              </div>

            </section>

            {/* =================================================
                SUBJECTS
            ================================================= */}

            <section className="student-panel">

              <div className="student-panel-header">

                <div>
                  <span className="student-section-label">
                    YOUR LEARNING
                  </span>

                  <h2>
                    Subjects
                  </h2>
                </div>

                <span className="student-count-badge">
                  {subjects.length}
                </span>

              </div>

              {subjects.length === 0 ? (
                <div className="student-small-empty">
                  No subjects assigned
                  yet.
                </div>
              ) : (
                <div className="student-subject-list">

                  {subjects.map(
                    (
                      subject,
                      index
                    ) => (
                      <div
                        className="student-subject-item"
                        key={`${subject}-${index}`}
                      >

                        <span className="student-subject-number">
                          {String(
                            index + 1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </span>

                        <strong>
                          {subject}
                        </strong>

                        <FaChevronRight />

                      </div>
                    )
                  )}

                </div>
              )}

            </section>

            {/* =================================================
                HELP CARD
            ================================================= */}

            <section className="student-quick-card">

              <div className="student-quick-icon">
                <FaGraduationCap />
              </div>

              <div>
                <span>
                  Need help?
                </span>

                <strong>
                  Contact your faculty
                  or administrator.
                </strong>
              </div>

            </section>

          </aside>

        </section>

      </div>
    </div>
  );
};

export default StudentDashboard;