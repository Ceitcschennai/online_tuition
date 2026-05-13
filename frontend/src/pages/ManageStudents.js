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
  const [loading, setLoading] = useState(true);

  /* =========================
     FETCH STUDENTS
   ========================= */
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/students?search=${searchTerm}&filter=${filterStatus}`
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
  }, [searchTerm, filterStatus]);

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

  useEffect(() => {
    fetchStudents();
    fetchStats();
  }, [fetchStudents, fetchStats]);

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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageStudents;