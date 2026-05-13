import React, { useEffect, useState } from "react";
import API_BASE_URL from "../config/api";
import "../styles/assignments.css";

const Assignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [studentInfo, setStudentInfo] = useState(null);

  //////////////////////////////////////////////////////////
  // Robust student data extraction
  //////////////////////////////////////////////////////////
  const getStudentData = () => {
    try {
      // Try multiple localStorage keys
      const keys = ["user", "student", "studentData"];
      for (const key of keys) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        // Handle nested structures
        const data = parsed?.student || parsed?.user || parsed;
        const id = data?._id || data?.id || data?.studentId;
        if (id) return { ...data, _id: id };
      }
      return null;
    } catch (e) {
      console.error("Error reading student data:", e);
      return null;
    }
  };

  //////////////////////////////////////////////////////////
  // Fetch Assignments
  //////////////////////////////////////////////////////////
  const fetchAssignments = async (student) => {
    if (!student?._id) {
      setError("Student not logged in or ID missing.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Primary: fetch by student ID
      const response = await fetch(
        `${API_BASE_URL}/api/assignments/student/${student._id}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.assignments?.length > 0) {
          setAssignments(data.assignments);
          return;
        }
      }

      // Fallback: fetch by class if student-specific endpoint returns empty
      const studentClass = (
        student?.class ||
        student?.className ||
        ""
      ).toString().trim();

      const normalizedClass = studentClass && !studentClass.toLowerCase().startsWith("class")
        ? `Class ${studentClass}`
        : studentClass;

      if (normalizedClass) {
        const classResponse = await fetch(
          `${API_BASE_URL}/api/assignments/class/${encodeURIComponent(normalizedClass)}`
        );

        if (classResponse.ok) {
          const classData = await classResponse.json();
          const list = classData.assignments || classData || [];
          setAssignments(Array.isArray(list) ? list : []);
          return;
        }
      }

      // Nothing found
      setAssignments([]);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Unable to load assignments. Please try again later.");
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  //////////////////////////////////////////////////////////
  // Load on mount
  //////////////////////////////////////////////////////////
  useEffect(() => {
    const student = getStudentData();
    setStudentInfo(student);

    console.log("Student data for assignments:", student);

    fetchAssignments(student);

    const interval = setInterval(() => fetchAssignments(student), 75000);
    return () => clearInterval(interval);
  }, []);

  //////////////////////////////////////////////////////////
  // Helpers
  //////////////////////////////////////////////////////////
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
      });
    } catch {
      return "N/A";
    }
  };

  const getPriorityColor = (priority) => {
    switch ((priority || "").toLowerCase()) {
      case "high":   return "#ef4444";
      case "medium": return "#f59e0b";
      case "low":    return "#16a34a";
      default:       return "#64748b";
    }
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  //////////////////////////////////////////////////////////
  // UI
  //////////////////////////////////////////////////////////
  return (
    <div className="assignment-dashboard">
      <h1>My Assignments</h1>

      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
          <p>Loading assignments...</p>
        </div>
      )}

      {!loading && error && (
        <div style={{
          background: "#fee2e2", border: "1px solid #fca5a5",
          borderRadius: 10, padding: "16px 20px", color: "#dc2626",
          marginBottom: 20
        }}>
          <strong>Error:</strong> {error}
          <br />
          <button
            onClick={() => fetchAssignments(studentInfo)}
            style={{
              marginTop: 10, padding: "6px 16px", borderRadius: 6,
              background: "#dc2626", color: "#fff", border: "none",
              cursor: "pointer", fontSize: 13
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && assignments.length === 0 && (
        <div style={{
          textAlign: "center", marginTop: 60, color: "#64748b"
        }}>
          <p style={{ fontSize: 18 }}>No assignments available for your class.</p>
          {studentInfo && (
            <p style={{ fontSize: 13, marginTop: 8 }}>
              Class: <strong>
                {(studentInfo?.class || studentInfo?.className || "Unknown")}
              </strong>
            </p>
          )}
        </div>
      )}

      {!loading && assignments.length > 0 && (
        <div className="assignments-list">
          {assignments.map((assignment) => (
            <div
              key={assignment._id}
              className="assignment-card"
              style={{
                borderLeft: `4px solid ${getPriorityColor(assignment.priority)}`,
                opacity: isOverdue(assignment.dueDate) ? 0.85 : 1
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                <h3 style={{ margin: 0 }}>{assignment.title}</h3>
                {assignment.priority && (
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: "3px 10px",
                    borderRadius: 20, background: getPriorityColor(assignment.priority) + "22",
                    color: getPriorityColor(assignment.priority),
                    textTransform: "uppercase", letterSpacing: 0.5
                  }}>
                    {assignment.priority}
                  </span>
                )}
              </div>

              <p style={{ margin: "8px 0 4px" }}>
                <strong>Subject:</strong> {assignment.subject || "N/A"}
              </p>

              <p style={{ margin: "4px 0", color: isOverdue(assignment.dueDate) ? "#ef4444" : "inherit" }}>
                <strong>Due Date:</strong> {formatDate(assignment.dueDate)}
                {isOverdue(assignment.dueDate) && (
                  <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 700, color: "#ef4444" }}>
                    ⚠ Overdue
                  </span>
                )}
              </p>

              {assignment.class && (
                <p style={{ margin: "4px 0" }}>
                  <strong>Class:</strong> {assignment.class}
                </p>
              )}

              {assignment.description && (
                <p style={{ margin: "8px 0 0", color: "#475569", fontSize: 14, lineHeight: 1.6 }}>
                  {assignment.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Assignments;
