import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config/api";
import "../styles/teacherDashboard.css";
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
    subjects: []
  });

  const [recentActivities, setRecentActivities] = useState([]);
  const [queries, setQueries] = useState([]); // ✅ NEW
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const teacherId = localStorage.getItem("teacherId");
  const token = localStorage.getItem("token");

  // =========================
  // 📊 FETCH DASHBOARD DATA
  // =========================
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      if (!teacherId || !token) {
        navigate("/login");
        return;
      }

      const res = await fetch(
        `${API_BASE_URL}/api/teacher/dashboard/stats/${teacherId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!res.ok) throw new Error("Failed to fetch dashboard");

      const data = await res.json();

      setStats(data.stats);
      setTeacherInfo(data.teacherInfo);
      setRecentActivities(data.recentActivities || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // 📩 FETCH QUERIES
  // =========================
  const fetchQueries = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/queries/teacher/${teacherId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await res.json();
      setQueries(data.queries || []);
    } catch (err) {
      console.error("Query fetch error:", err);
    }
  };

  // =========================
  // ✅ ACCEPT QUERY
  // =========================
  const acceptQuery = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/api/queries/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: "Answered" })
      });

      setQueries((prev) =>
        prev.map((q) =>
          q._id === id ? { ...q, status: "Answered" } : q
        )
      );
    } catch (err) {
      console.error("Update error:", err);
    }
  };

  // =========================
  // 🔄 LOAD DATA
  // =========================
  useEffect(() => {
    fetchDashboardData();
    fetchQueries();
  }, []);

  if (loading) return <p>Loading dashboard...</p>;

  if (error) {
    return (
      <div>
        <p>{error}</p>
        <button onClick={fetchDashboardData}>Retry</button>
      </div>
    );
  }

  const today = new Date().toLocaleDateString();

  return (
    <div className="teacher-dashboard">

      {/* HEADER */}
      <div className="dashboard-header">
        <div>
          <h1>Welcome back, {teacherInfo.name}</h1>
          <p>Here’s what’s happening today</p>
          <span>{today}</span>

          <p>
            <FaGraduationCap /> Classes:{" "}
            {teacherInfo.classes.join(", ") || "—"}
          </p>

          <p>
            <FaBook /> Subjects:{" "}
            {teacherInfo.subjects.join(", ") || "—"}
          </p>
        </div>

        <div className="quick-actions">
          <button onClick={() => navigate("/teacher-assignments")}>
            <FaPlus /> Add Assignment
          </button>

          <button onClick={() => navigate("/take-attendance")}>
            <FaCalendarCheck /> Mark Attendance
          </button>
        </div>
      </div>

      {/* ALERTS */}
      <div className="alert-section">
        {stats.assignmentsToReview > 0 && (
          <p>⚠ {stats.assignmentsToReview} Assignments to review</p>
        )}

        {stats.pendingQueries > 0 && (
          <p>⚠ {stats.pendingQueries} Student doubts pending</p>
        )}
      </div>

      {/* STATS */}
      <div className="stats-grid">
        <div className="stat-card">
          <FaUsers />
          <h3>{stats.totalStudents}</h3>
          <p>Total Students</p>
        </div>

        <div className="stat-card">
          <FaTasks />
          <h3>{stats.assignmentsToReview}</h3>
          <p>Assignments</p>
        </div>

        <div className="stat-card">
          <FaChartLine />
          <h3>{stats.attendanceRate}%</h3>
          <p>Attendance</p>
        </div>

        <div className="stat-card">
          <FaQuestionCircle />
          <h3>{stats.pendingQueries}</h3>
          <p>Queries</p>
        </div>
      </div>

      {/* MAIN SECTION */}
      <div className="dashboard-main">

        {/* PROGRESS */}
        <div className="progress-section">
          <h2>Progress</h2>

          <div className="progress-bar">
            <div style={{ width: `${stats.attendanceRate}%` }}></div>
          </div>
        </div>

        {/* 🔴 QUERIES SECTION */}
        <div className="queries-section">
          <h2>📩 Student Queries</h2>

          {queries.length === 0 ? (
            <p>No queries available</p>
          ) : (
            queries.map((q) => (
              <div key={q._id} className="query-card">
                <p>
                  <b>{q.studentName}</b> ({q.studentClass})
                </p>
                <p><b>Subject:</b> {q.subject}</p>
                <p>{q.question}</p>
                <p>Status: {q.status}</p>

                {q.status === "Pending" && (
                  <button onClick={() => acceptQuery(q._id)}>
                    Accept Query
                  </button>
                )}
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};

export default TeacherDashboard;