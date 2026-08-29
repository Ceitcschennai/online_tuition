import React, { useEffect, useState, useCallback } from "react";
import API_BASE_URL from "../config/api";
import "../styles/manageStudents.css";
import { FaUsers, FaSearch, FaFilter } from "react-icons/fa";

const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    paid: 0,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterClass, setFilterClass] = useState("all"); // ✅ class-wise filter
  const [classOptions, setClassOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  /* =========================
     FETCH STUDENTS
   ========================= */
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/students?search=${encodeURIComponent(searchTerm)}&filter=${filterStatus}&studentClass=${encodeURIComponent(filterClass)}`
      );
      const data = await res.json();
      if (data.success) {
        setStudents(data.students);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterStatus, filterClass]);

  /* =========================
     FETCH STATS
   ========================= */
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/students/stats`);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  /* =========================
     FETCH DISTINCT CLASS LIST (for filter buttons)
   ========================= */
  const fetchClassOptions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/students/classes`);
      const data = await res.json();
      if (data.success) {
        setClassOptions(data.classes);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  /* =========================
     APPROVE / REJECT STUDENT (inline)
   ========================= */
  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/students/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        fetchStudents();
        fetchStats();
      } else {
        alert(data.message || "Failed to update status");
      }
    } catch (err) {
      console.error("Status update failed:", err);
      alert("Failed to update status");
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchStats();
  }, [fetchStudents, fetchStats]);

  useEffect(() => {
    fetchClassOptions();
  }, [fetchClassOptions]);

  return (
    <div className="student-management-container">
      <h2>
        <FaUsers /> Manage Students
      </h2>

      {/* ===== Stats Section ===== */}
      <div className="stats-row">
        <div className="stat-card">
          <h3>{stats.total}</h3>
          <p>Total Students</p>
        </div>
        <div className="stat-card">
          <h3>{stats.approved}</h3>
          <p>Approved</p>
        </div>
        <div className="stat-card">
          <h3>{stats.pending}</h3>
          <p>Pending</p>
        </div>
        <div className="stat-card">
          <h3>{stats.paid}</h3>
          <p>Paid</p>
        </div>
      </div>

      {/* ===== Controls ===== */}
      <div className="controls">
        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            placeholder="Search by name, email, class, EMIS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-box">
          <FaFilter />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>
      </div>

      {/* ===== Class-wise Filter Buttons ===== */}
      <div className="class-filter-row">
        <button
          className={`class-filter-btn ${filterClass === "all" ? "active" : ""}`}
          onClick={() => setFilterClass("all")}
        >
          All Classes
        </button>
        {classOptions.map((cls) => (
          <button
            key={cls}
            className={`class-filter-btn ${filterClass === cls ? "active" : ""}`}
            onClick={() => setFilterClass(cls)}
          >
            {cls}
          </button>
        ))}
      </div>

      {/* ===== Student List ===== */}
      {loading ? (
        <p>Loading students...</p>
      ) : students.length === 0 ? (
        <p>No students found</p>
      ) : (
        <div className="students-list">
          {students.map((student) => (
            <div key={student._id} className="student-card">
              <h4>
                {student.firstName} {student.lastName}
              </h4>
              <p>Email: {student.email}</p>
              <p>Class: {student.class}</p>
              <p>EMIS: {student.emisNumber || "-"}</p>
              <p>Status: {student.approvalStatus}</p>
              <p>Payment: {student.status}</p>

              {/* ACTION BUTTONS — matches ManageTeachers.js inline approve/reject */}
              <div className="student-actions">
                {student.approvalStatus !== "Approved" && (
                  <button
                    className="btn-approve"
                    onClick={() => updateStatus(student._id, "Approved")}
                  >
                    Approve
                  </button>
                )}
                {student.approvalStatus !== "Rejected" && (
                  <button
                    className="btn-reject"
                    onClick={() => updateStatus(student._id, "Rejected")}
                  >
                    Reject
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageStudents;
