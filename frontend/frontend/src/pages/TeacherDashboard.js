import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config/api";

import {
  FaChartLine,
  FaClock,
  FaGraduationCap,
  FaBook,
  FaUsers,
  FaTasks,
  FaQuestionCircle,
  FaPlus,
  FaCalendarCheck
} from "react-icons/fa";

import "../styles/teacherDashboard.css";

const TeacherDashboard = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalStudents: 0,
    assignmentsToReview: 0,
    pendingQueries: 0,
    attendanceRate: 0
  });

  const [teacherInfo, setTeacherInfo] = useState({
    name: "",
    classes: [],
    subjects: [],
    assignedSubjects: []
  });

  const [queries, setQueries] = useState([]);
  const [scheduledClasses, setScheduledClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const teacherId = localStorage.getItem("teacherId");
  const token = localStorage.getItem("token");

  /* =========================================================
     FETCH DASHBOARD DATA
  ========================================================= */

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (!teacherId || !token) {
        navigate("/login");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/teacher/dashboard/stats/${teacherId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to fetch dashboard"
        );
      }

      setStats({
        totalStudents:
          Number(data.stats?.totalStudents) || 0,

        assignmentsToReview:
          Number(data.stats?.assignmentsToReview) || 0,

        pendingQueries:
          Number(data.stats?.pendingQueries) || 0,

        attendanceRate:
          Number(data.stats?.attendanceRate) || 0
      });

      setTeacherInfo({
        name:
          data.teacherInfo?.name || "",

        classes:
          Array.isArray(data.teacherInfo?.classes)
            ? data.teacherInfo.classes
            : [],

        subjects:
          Array.isArray(data.teacherInfo?.subjects)
            ? data.teacherInfo.subjects
            : [],

        assignedSubjects:
          Array.isArray(data.teacherInfo?.assignedSubjects)
            ? data.teacherInfo.assignedSubjects
            : []
      });

    } catch (err) {
      console.error("Dashboard error:", err);

      setError(
        err.message || "Failed to load dashboard"
      );

    } finally {
      setLoading(false);
    }
  }, [teacherId, token, navigate]);


  /* =========================================================
     FETCH STUDENT QUERIES
  ========================================================= */

  const fetchQueries = useCallback(async () => {
    try {
      if (!teacherId || !token) {
        setQueries([]);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/queries/teacher/${teacherId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to fetch queries"
        );
      }

      setQueries(
        Array.isArray(data.queries)
          ? data.queries
          : []
      );

    } catch (err) {
      console.error(
        "Query fetch error:",
        err
      );

      setQueries([]);
    }
  }, [teacherId, token]);

/* =========================================================
   FETCH THIS FACULTY'S SCHEDULED CLASSES
========================================================= */

const fetchScheduledClasses = useCallback(async () => {
  try {
    if (!teacherId) {
      setScheduledClasses([]);
      return;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/live-classes/scheduled?teacherId=${teacherId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    console.log("Scheduled classes:", data);

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || "Failed to fetch scheduled classes"
      );
    }

    setScheduledClasses(
      Array.isArray(data.scheduledClasses)
        ? data.scheduledClasses
        : []
    );

  } catch (err) {
    console.error(
      "Scheduled classes fetch error:",
      err
    );

    setScheduledClasses([]);
  }
}, [teacherId, token]);




  /* =========================================================
     UPDATE QUERY STATUS
  ========================================================= */

  const acceptQuery = async (id) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/queries/${id}/status`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",

            Authorization:
              `Bearer ${token}`
          },

          body: JSON.stringify({
            status: "Answered"
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update query"
        );
      }

      setQueries((previousQueries) =>
        previousQueries.map((query) =>
          query._id === id
            ? {
                ...query,
                status: "Answered"
              }
            : query
        )
      );

    } catch (err) {
      console.error(
        "Update query error:",
        err
      );

      alert(
        err.message || "Failed to update query"
      );
    }
  };


  /* =========================================================
     LOAD DASHBOARD
  ========================================================= */

  useEffect(() => {
  fetchDashboardData();
  fetchQueries();
  fetchScheduledClasses();
}, [
  fetchDashboardData,
  fetchQueries,
  fetchScheduledClasses
]);


  /* =========================================================
     TODAY DATE
  ========================================================= */

  const today = new Date().toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );

 /* =========================================================
   FILTER TODAY'S CLASSES
========================================================= */

const getDateKey = (dateValue) => {
  if (!dateValue) {
    return "";
  }

  /*
    If the backend sends a date like:
    2026-08-27
    or
    2026-08-27T00:00:00.000Z

    We take only the date part.
  */

  return String(dateValue).slice(0, 10);
};


/* Today's date in YYYY-MM-DD format */

const now = new Date();

const todayDateKey =
  `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;


/*
  Show only:

  1. Classes scheduled for today
  2. Classes belonging to this particular faculty
*/

const todaysClasses = scheduledClasses.filter(
  (scheduledClass) => {

    const classDateKey = getDateKey(
      scheduledClass.scheduledDate
    );

    const classTeacherId =
      scheduledClass.teacherId?._id ||
      scheduledClass.teacherId;

    return (
      classDateKey === todayDateKey &&
      String(classTeacherId) === String(teacherId)
    );
  }
);


  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="teacher-dashboard">

        <div className="teacher-loading">

          <div className="teacher-spinner"></div>

          <h2>
            Loading Dashboard...
          </h2>

          <p>
            Please wait while we fetch your faculty information.
          </p>

        </div>

      </div>
    );
  }


  /* =========================================================
     ERROR
  ========================================================= */

  if (error) {
    return (
      <div className="teacher-dashboard">

        <div className="teacher-error">

          <h2>
            Failed to load dashboard
          </h2>

          <p>
            {error}
          </p>

          <button
            type="button"
            onClick={() => {
              fetchDashboardData();
              fetchQueries();
              fetchScheduledClasses();
            }}
          >
            Retry
          </button>

        </div>

      </div>
    );
  }


  /* =========================================================
     SAFE DATA
  ========================================================= */

  const assignedSubjects =
    Array.isArray(
      teacherInfo.assignedSubjects
    )
      ? teacherInfo.assignedSubjects
      : [];

  const classes =
    Array.isArray(
      teacherInfo.classes
    )
      ? teacherInfo.classes
      : [];

  const pendingQueries = queries.filter(
    (query) =>
      query.status === "Pending"
  );


  /* =========================================================
     MAIN DASHBOARD
  ========================================================= */

  return (
    <div className="teacher-dashboard">


      {/* =====================================================
          FACULTY WELCOME HEADER
      ===================================================== */}

      <div className="teacher-portal-header">

        <div className="teacher-welcome-content">

          <div className="teacher-welcome-text">

            <span className="teacher-dashboard-label">
              FACULTY DASHBOARD
            </span>

            <h1>
              Welcome back,{" "}
              {teacherInfo.name || "Faculty"}!
            </h1>

            <p>
              Here's what's happening with your
              classes today.
            </p>

          </div>


          <div className="teacher-today-card">

            <div className="teacher-today-icon">
              📅
            </div>

            <div className="teacher-today-content">

              <span>
                Today
              </span>

              <strong>
                {today}
              </strong>

            </div>

          </div>

        </div>


        {/* ===================================================
            HEADER STATS
        =================================================== */}

        <div className="teacher-header-stats">


          <div className="teacher-header-stat">

            <div className="teacher-header-stat-icon">
              <FaUsers />
            </div>

            <div>

              <strong>
                {stats.totalStudents}
              </strong>

              <span>
                Total Students
              </span>

            </div>

          </div>


          <div className="teacher-header-stat">

            <div className="teacher-header-stat-icon">
              <FaTasks />
            </div>

            <div>

              <strong>
                {stats.assignmentsToReview}
              </strong>

              <span>
                Assignments
              </span>

            </div>

          </div>


          <div className="teacher-header-stat">

            <div className="teacher-header-stat-icon">
              <FaChartLine />
            </div>

            <div>

              <strong>
                {stats.attendanceRate}%
              </strong>

              <span>
                Attendance
              </span>

            </div>

          </div>

        </div>

      </div>


      {/* =====================================================
          ALERT
      ===================================================== */}

      {(stats.assignmentsToReview > 0 ||
        pendingQueries.length > 0) && (

        <div className="teacher-alert-banner">

          <span>
            ⚠️
          </span>

          <div>

            {stats.assignmentsToReview > 0 && (
              <p>
                You have{" "}
                <strong>
                  {stats.assignmentsToReview}
                </strong>{" "}
                assignment
                {stats.assignmentsToReview !== 1
                  ? "s"
                  : ""}{" "}
                to review.
              </p>
            )}

            {pendingQueries.length > 0 && (
              <p>
                You have{" "}
                <strong>
                  {pendingQueries.length}
                </strong>{" "}
                pending student quer
                {pendingQueries.length !== 1
                  ? "ies"
                  : "y"}.
              </p>
            )}

          </div>

        </div>

      )}


      {/* =====================================================
          FACULTY INFORMATION
      ===================================================== */}

      <div className="teacher-info-row">


        <div className="teacher-info-card">

          <div className="teacher-info-icon">
            <FaGraduationCap />
          </div>

          <div>

            <span>
              Classes
            </span>

            <strong>
              {classes.length > 0
                ? classes.join(", ")
                : "No classes assigned"}
            </strong>

          </div>

        </div>


        <div className="teacher-info-card">

          <div className="teacher-info-icon">
            <FaBook />
          </div>

          <div>

            <span>
              Subjects
            </span>

            <strong>
              {assignedSubjects.length > 0
                ? assignedSubjects
                    .map(
                      (subject) =>
                        subject.name
                    )
                    .filter(Boolean)
                    .join(", ")
                : "No subjects assigned"}
            </strong>

          </div>

        </div>

      </div>


      {/* =====================================================
          QUICK ACTIONS
      ===================================================== */}

      <div className="teacher-actions-section">

        <button
          type="button"
          className="teacher-action-btn"
          onClick={() =>
            navigate("/teacher-assignments")
          }
        >

          <FaPlus />

          Add Assignment

        </button>


        <button
          type="button"
          className="teacher-action-btn"
          onClick={() =>
            navigate("/take-attendance")
          }
        >

          <FaCalendarCheck />

          Mark Attendance

        </button>

      </div>


      {/* =====================================================
          TODAY'S CLASSES
      ===================================================== */}

      <div className="teacher-dashboard-section">

        <div className="teacher-section-header">

          <h3>

            <span className="teacher-live-dot"></span>

            Today's Classes

          </h3>

        </div>


        {todaysClasses.length === 0 ? (

  <div className="teacher-empty-box">

    <FaClock />

    <p>
      No classes scheduled for today
    </p>

    <span>
      Today's scheduled classes will appear here.
    </span>

  </div>

) : (

  <div className="teacher-today-classes-list">

    {todaysClasses.map((scheduledClass, index) => (

      <div
        key={scheduledClass._id || index}
        className="teacher-today-class-card"
      >

        <div className="teacher-today-class-info">

          <h4>
            {scheduledClass.className || "Scheduled Class"}
          </h4>

          <p>
            <FaBook />

            {" "}
            {scheduledClass.subject?.name ||
              scheduledClass.subject ||
              "Subject"}
          </p>

          <p>
            <FaClock />

            {" "}
            {scheduledClass.scheduledTime || "Time not available"}
          </p>

          <p>
            <FaGraduationCap />

            {" "}
            {scheduledClass.studentClass ||
              scheduledClass.class ||
              "Class not available"}
          </p>

        </div>


        {scheduledClass.meetingLink && (

          <a
            href={scheduledClass.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="teacher-join-class-btn"
          >
            Join Class
          </a>

        )}

      </div>

    ))}

  </div>

)}

      </div>


      {/* =====================================================
          STUDENT QUERIES
      ===================================================== */}

      <div className="teacher-dashboard-section">

        <div className="teacher-section-header">

          <h3>
            <FaQuestionCircle />
            Student Queries
          </h3>


          {queries.length > 0 && (

            <span className="teacher-section-count">
              {queries.length}
            </span>

          )}

        </div>


        {queries.length === 0 ? (

          <div className="teacher-empty-box">

            <FaQuestionCircle />

            <p>
              No student queries
            </p>

            <span>
              Student questions will appear here.
            </span>

          </div>

        ) : (

          <div className="teacher-query-list">

            {queries.map((query) => (

              <div
                key={query._id}
                className="teacher-query-card"
              >

                <div className="teacher-query-top">

                  <strong>
                    {query.studentName || "Student"}
                  </strong>

                  <span>
                    {query.studentClass || "—"}
                  </span>

                </div>


                <p>
                  <b>Subject:</b>{" "}
                  {query.subject || "—"}
                </p>


                <p className="teacher-query-question">
                  {query.question ||
                    "No question provided"}
                </p>


                <div className="teacher-query-bottom">

                  <span
                    className={
                      query.status === "Pending"
                        ? "teacher-status-pending"
                        : "teacher-status-answered"
                    }
                  >
                    {query.status || "Pending"}
                  </span>


                  {query.status === "Pending" && (

                    <button
                      type="button"
                      onClick={() =>
                        acceptQuery(query._id)
                      }
                    >
                      Mark Answered
                    </button>

                  )}

                </div>

              </div>

            ))}

          </div>

        )}

      </div>


      {/* =====================================================
          ASSIGNED SUBJECTS
      ===================================================== */}

      <div className="teacher-dashboard-section">

        <div className="teacher-section-header">

          <h3>

            <FaBook />

            Assigned Subjects

          </h3>

        </div>


        {assignedSubjects.length === 0 ? (

          <div className="teacher-empty-box">

            <FaBook />

            <p>
              No subjects assigned yet
            </p>

            <span>
              Contact your admin to get subjects assigned to you.
            </span>

          </div>

        ) : (

          <div className="teacher-subject-grid">

            {assignedSubjects.map(
              (subject, index) => (

                <div
                  key={
                    subject._id || index
                  }
                  className="teacher-subject-card"
                >

                  <div className="teacher-subject-icon">
                    <FaBook />
                  </div>


                  <div className="teacher-subject-content">

                    <h4>
                      {subject.name || "Subject"}
                    </h4>


                    <p>

                      <FaGraduationCap />

                      Classes:{" "}

                      {Array.isArray(
                        subject.classes
                      ) &&
                      subject.classes.length > 0
                        ? subject.classes.join(", ")
                        : "—"}

                    </p>


                    {subject.category && (

                      <span className="teacher-subject-category">

                        {subject.category}

                      </span>

                    )}

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </div>


      {/* =====================================================
          FACULTY OVERVIEW
      ===================================================== */}

      <div className="teacher-dashboard-section">

        <div className="teacher-section-header">

          <h3>

            <FaChartLine />

            Faculty Overview

          </h3>

        </div>


        <div className="teacher-progress-card">

          <div className="teacher-progress-header">

            <span>
              Overall Attendance
            </span>

            <strong>
              {stats.attendanceRate}%
            </strong>

          </div>


          <div className="teacher-progress-bar">

            <div
              style={{
                width: `${
                  Math.min(
                    Math.max(
                      stats.attendanceRate,
                      0
                    ),
                    100
                  )
                }%`
              }}
            />

          </div>

        </div>

      </div>

    </div>
  );
};

export default TeacherDashboard;